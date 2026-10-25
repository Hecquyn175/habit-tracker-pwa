/**
 * SYSTEM: NGŨ HÀNH LEVELING v4.0 ULTIMATE
 * Module: js/app.js — Main Application Controller & Event Orchestrator
 */

import {
  CHECKIN_STATES,
  TITLES_CATALOG,
  INVENTORY_LIMITS,
  DEFAULT_PENALTY_QUESTS,
  toDateKey,
  addDays,
  diffDays,
  parseDateKey,
  computeRadarAndBuffs,
  computeMaxHp,
  computePenaltyDamage,
  rollLootWithPity,
  applyInventoryRewards,
  computeHunterRank,
  reconcileDayLedger,
  evaluateTitles
} from './engine.js';
import {
  loadFromStorage,
  saveToStorageImmediate,
  saveToStorageDebounced,
  clearSeedHistoryInState,
  createBlankSlateState,
  validateStateSchema
} from './state.js';
import { runDailyCron } from './cron.js';
import {
  soundEngine,
  playSlash,
  playOverdrive,
  playChestOpen,
  playLevelUp,
  playPenaltyAlarm
} from './audio.js';
import {
  renderEffortAnalyticsChart,
  renderHeatmap90Days,
  renderPentagonRadarSVG,
  formatFullVN
} from './charts.js';
import {
  renderHeaderHUD,
  renderTodayTab,
  renderWeeklyMatrixTab,
  renderMonthlyCalendarTab,
  renderBossRaidCard,
  renderShopModalContent,
  renderSettingsModalContent,
  renderDayDetailModalContent,
  renderCronRecapModalContent,
  showToast
} from './ui.js';

class SystemAppController {
  constructor() {
    this.state = loadFromStorage(toDateKey(new Date()));
    this.activeTab = 'today'; // 'today' | 'matrix' | 'calendar'
    this.chartRange = 7;
    this.matrixWeekOffset = 0;
    this.matrixElementFilter = 'ALL';

    const todayObj = parseDateKey(this.getEffectiveTodayKey());
    this.calYear = todayObj.getFullYear();
    this.calMonth = todayObj.getMonth() + 1;

    this.isPersisted = false;
    this.deferredInstallPrompt = null;

    // Pomodoro state dựa trên endTimestamp
    this.pomoDurationMinutes = 25;
    this.pomoRemainingMs = 25 * 60 * 1000;
    this.pomoTotalMs = 25 * 60 * 1000;
    this.pomoEndTimestamp = null;
    this.pomoRunning = false;
    this.pomoInterval = null;
    this.defaultDocTitle = document.title;

    this.confirmCallback = null;

    this.init();
  }

  getEffectiveTodayKey() {
    const realToday = toDateKey(new Date());
    if (this.state?.settings?.devMode && this.state.settings.virtualDayOffset) {
      return addDays(realToday, Number(this.state.settings.virtualDayOffset) || 0);
    }
    return realToday;
  }

  ensureDayLog(dateKey) {
    if (!this.state.days[dateKey]) {
      this.state.days[dateKey] = {
        energy: 'full',
        restDay: false,
        note: '',
        entries: {},
        todosDone: [],
        closed: false,
        ratio: 0,
        penaltyApplied: 0,
        harmonyAwarded: false,
        paidGold: 0,
        seed: false
      };
    }
    return this.state.days[dateKey];
  }

  async init() {
    soundEngine.syncSettings(this.state.settings);
    if (this.state.settings?.ambientType && this.state.settings.ambientType !== 'none') {
      // Sẽ kích hoạt sau tương tác đầu tiên của người dùng
      window.addEventListener(
        'pointerdown',
        () => {
          if (this.state.settings?.ambientType !== 'none' && !soundEngine.ambientNodes) {
            soundEngine.startAmbient(this.state.settings.ambientType);
          }
        },
        { once: true }
      );
    }

    // Kiểm tra và yêu cầu lưu trữ bền vững (navigator.storage.persist)
    if (navigator.storage && navigator.storage.persist) {
      try {
        this.isPersisted = await navigator.storage.persist();
      } catch {
        this.isPersisted = false;
      }
    }

    this.checkAndRunCron();
    this.bindEvents();
    this.handleUrlShortcuts();
    this.renderAll();
    this.registerServiceWorker();

    // Định kỳ 60 giây kiểm tra qua ngày mới (Cron) & cập nhật đồng hồ Flow
    setInterval(() => {
      this.checkAndRunCron();
      renderHeaderHUD(this.state, this.getEffectiveTodayKey(), Date.now());
    }, 60000);
  }

  checkAndRunCron() {
    const todayKey = this.getEffectiveTodayKey();
    this.ensureDayLog(todayKey);

    const cronReport = runDailyCron(this.state, todayKey);
    if (cronReport.clockSkew) {
      showToast(
        '⚠️ Cảnh Báo Đồng Hồ Hệ Thống',
        `Ngày thiết bị (${todayKey}) nhỏ hơn lần mở trước (${cronReport.lastOpenDate}). Đã tạm hoãn chốt ngày để bảo vệ dữ liệu.`,
        'amber'
      );
    } else if (cronReport.ran && cronReport.recapDays.length > 0) {
      saveToStorageImmediate(this.state);
      renderCronRecapModalContent(cronReport);
      this.openModal('cron-recap-modal');
      if (cronReport.penaltyZoneTriggered) {
        playPenaltyAlarm();
      }
    }
  }

  saveState(immediate = false) {
    if (immediate) {
      saveToStorageImmediate(this.state);
    } else {
      saveToStorageDebounced(this.state, 300);
    }
  }

  /* ==========================================================================
     RENDER TOÀN BỘ GIAO DIỆN
     ========================================================================== */

  renderAll(floatingBossDmg = null) {
    const todayKey = this.getEffectiveTodayKey();
    this.ensureDayLog(todayKey);

    renderHeaderHUD(this.state, todayKey, Date.now());
    renderTodayTab(this.state, todayKey);
    renderWeeklyMatrixTab(
      this.state,
      todayKey,
      this.matrixWeekOffset,
      this.matrixElementFilter
    );
    renderMonthlyCalendarTab(this.state, todayKey, this.calYear, this.calMonth);

    renderEffortAnalyticsChart(this.state, todayKey, this.chartRange);
    renderHeatmap90Days(this.state, todayKey, dk => this.openDayDetailModal(dk));
    renderPentagonRadarSVG(this.state, todayKey);
    renderBossRaidCard(this.state, todayKey, floatingBossDmg);
  }

  /* ==========================================================================
     XOAY VÒNG 5 TRẠNG THÁI CHECK-IN & SỔ CÁI DELTA
     ========================================================================== */

  cycleCheckin(habitId, dateKey) {
    const todayKey = this.getEffectiveTodayKey();
    if (dateKey > todayKey) {
      showToast('Không Khả Dụng', 'Không thể đánh dấu nhiệm vụ cho ngày trong tương lai.', 'amber');
      return;
    }
    if (diffDays(dateKey, todayKey) > 30) {
      showToast('Quá Hạn Chỉnh Sửa', 'Chỉ cho phép check-in bù trong vòng 30 ngày gần nhất.', 'amber');
      return;
    }

    const habit = (this.state.habits || []).find(h => h.id === habitId);
    if (!habit) return;

    const prevRank = computeHunterRank(this.state, todayKey).code;
    const dayLog = this.ensureDayLog(dateKey);
    const prevEntry = dayLog.entries[habitId] || {
      state: 0,
      count: 0,
      crit: false,
      lootRolled: false,
      tickHour: new Date().getHours(),
      paidGold: 0,
      pomoBonus: false,
      backfilled: dateKey < todayKey
    };

    const currentState = prevEntry.state ?? 0;
    const curIdx = CHECKIN_STATES.indexOf(currentState);
    let nextState = CHECKIN_STATES[(curIdx + 1) % CHECKIN_STATES.length];

    // Xử lý trạng thái 'freeze' (Khiên Định Hồn - Mục 5.1)
    if (nextState === 'freeze') {
      if ((this.state.inventory.shields || 0) <= 0) {
        nextState = 0;
        showToast(
          '🛡️ Đã Hết Khiên Định Hồn',
          'Không còn Khiên trong túi đồ — đã bỏ qua trạng thái đóng băng và chuyển về Chưa làm.',
          'amber'
        );
      } else {
        this.state.inventory.shields -= 1;
        showToast(
          '🛡️ Đã Dùng 1 Khiên Định Hồn',
          `Đóng băng [${habit.name}] ngày ${dateKey} (loại khỏi mục tiêu ngày và giữ Streak).`,
          'cyan'
        );
      }
    }

    // Rời khỏi trạng thái 'freeze': hoàn lại 1 Khiên nếu ngày CHƯA chốt (Mục 5.1)
    if (currentState === 'freeze' && nextState !== 'freeze') {
      if (!dayLog.closed) {
        this.state.inventory.shields = Math.min(
          INVENTORY_LIMITS.shields,
          (this.state.inventory.shields || 0) + 1
        );
        showToast('🛡️ Hoàn Trả Khiên', 'Đã hoàn lại +1 Khiên Định Hồn về túi đồ.', 'cyan');
      }
    }

    const isBackfill = dateKey < todayKey;
    const radar = computeRadarAndBuffs(this.state, todayKey);

    // Nếu lần đầu chuyển từ 0 sang trạng thái >= 0.5 (và không phải check-in bù)
    let critJustTriggered = false;
    let lootResult = null;

    if (
      currentState === 0 &&
      typeof nextState === 'number' &&
      nextState >= 0.5 &&
      !prevEntry.lootRolled
    ) {
      prevEntry.lootRolled = true;
      prevEntry.tickHour = new Date().getHours();
      prevEntry.inFlow = Date.now() < (this.state.flowUntil || 0);
      prevEntry.backfilled = isBackfill;

      if (!isBackfill) {
        // Roll Chí Mạng 15% nếu Kim >= 70% (5.4)
        if (radar.buffs.kim && Math.random() < 0.15) {
          prevEntry.crit = true;
          critJustTriggered = true;
        }
        // Roll Rương & Khí Vận Pity (5.8)
        lootResult = rollLootWithPity(this.state, todayKey, Math.random, radar);
        this.applyLootResult(lootResult);
      }
    }

    prevEntry.state = nextState;
    if (nextState === 0) {
      prevEntry.inFlow = false;
    }
    dayLog.entries[habitId] = prevEntry;

    // Đồng bộ sổ cái chênh lệch (Ledger Delta)
    const ledger = reconcileDayLedger(this.state, dateKey, todayKey);

    // Phát âm thanh & hiệu ứng
    if (critJustTriggered) {
      playOverdrive();
      showToast('⚔️ CHÍ MẠNG (CRITICAL x2.0)!', `Linh căn Kim phát tác! Nhân đôi Điểm & Vàng cho [${habit.name}]!`, 'gold');
    } else if (nextState === 1.5) {
      playOverdrive();
    } else if (nextState === 1 || nextState === 0.5 || nextState === 'freeze') {
      playSlash();
    }

    if (ledger.bossDamageDelta !== 0) {
      this.animateBossHit();
    }

    if (ledger.harmonyJustTriggered) {
      playOverdrive();
      this.fireConfetti();
      showToast(
        '🌌 NGŨ HÀNH HỢP NHẤT!',
        'Đủ 5 hành hoàn thành ≥ 100%! Thưởng +25% Tổng điểm ngày & Hồi phục +15 HP!',
        'purple'
      );
    }

    if (ledger.bossJustKilled) {
      playLevelUp();
      this.fireConfetti();
      showToast(
        '👑 ĐÃ HẠ GỤC BOSS TUẦN!',
        'Nhận thưởng +200 Vàng và Danh hiệu [Kẻ Chinh Phục Hầm Ngục]!',
        'gold'
      );
    }

    // Kiểm tra mở khóa Danh hiệu & Lên hạng Thợ Săn
    this.checkTitleAndRankUnlocks(prevRank, todayKey);

    this.saveState();
    this.renderAll(ledger.bossDamageDelta);

    // Nếu modal Chi Tiết Ngày đang mở thì cập nhật lại luôn
    const detailModal = document.getElementById('day-detail-modal');
    if (detailModal && !detailModal.classList.contains('hidden')) {
      renderDayDetailModalContent(this.state, dateKey, todayKey);
    }
  }

  applyLootResult(lootResult) {
    if (!lootResult) return;
    this.state.pity = lootResult.newPity;
    if (!lootResult.dropped) return;

    const updatedInv = applyInventoryRewards(this.state.inventory, {
      gold: lootResult.goldReward,
      shields: lootResult.shieldReward,
      potions: lootResult.potionReward
    });
    this.state.inventory = {
      gold: updatedInv.gold,
      shields: updatedInv.shields,
      potions: updatedInv.potions
    };

    const extraConvertMsg =
      updatedInv.convertedGold > 0
        ? ` (Vượt giới hạn túi đồ ➔ quy đổi +${updatedInv.convertedGold} Vàng)`
        : '';

    this.state.history.unshift({
      ts: Date.now(),
      type: 'loot',
      delta: lootResult.goldReward + updatedInv.convertedGold,
      label: `${lootResult.label}${extraConvertMsg}`
    });

    setTimeout(() => {
      playChestOpen();
      this.triggerScreenShake();
      if (lootResult.chestType === 'GOLDEN') {
        this.fireConfetti();
      }
      showToast(
        lootResult.chestType === 'GOLDEN' ? '👑 NỔ RƯƠNG HOÀNG KIM!' : '🎁 RƠI RƯƠNG BÓNG TỐI!',
        `${lootResult.label}${extraConvertMsg}`,
        'gold'
      );
    }, 150);
  }

  checkTitleAndRankUnlocks(prevRankCode, todayKey) {
    const newTitles = evaluateTitles(this.state, todayKey);
    for (const tId of newTitles) {
      const tObj = TITLES_CATALOG.find(t => t.id === tId);
      if (tObj) {
        playLevelUp();
        this.fireConfetti();
        showToast('🏆 MỞ KHÓA DANH HIỆU MỚI!', `Đã mở khóa [${tObj.name}]! Vào Cài Đặt để trang bị.`, 'purple');
      }
    }

    const newRank = computeHunterRank(this.state, todayKey);
    const rankOrder = ['RANK E', 'RANK D', 'RANK C', 'RANK B', 'RANK A', 'RANK S', 'NATIONAL'];
    if (rankOrder.indexOf(newRank.code) > rankOrder.indexOf(prevRankCode)) {
      playLevelUp();
      this.fireConfetti();
      showToast('⚡ THĂNG CẤP HẠNG THỢ SĂN!', `Chúc mừng bạn đã thăng lên [${newRank.title}]!`, 'cyan');
    }
  }

  /* ==========================================================================
     THÓI QUEN PHẢN XẠ [+], GIỚI LUẬT [-] & TO-DOS (MỤC 5.2)
     ========================================================================== */

  triggerPlusHabit(habitId) {
    const todayKey = this.getEffectiveTodayKey();
    const habit = (this.state.habits || []).find(h => h.id === habitId);
    if (!habit) return;

    const dayLog = this.ensureDayLog(todayKey);
    const entry = dayLog.entries[habitId] || { count: 0 };
    entry.count = (entry.count || 0) + 1;
    dayLog.entries[habitId] = entry;

    const maxPerDay = Number(habit.maxPerDay || 10);
    playSlash();

    // Roll rương ở lần bấm thứ 1, 5, 10 mỗi ngày (Mục 5.8)
    if (entry.count === 1 || entry.count === 5 || entry.count === 10) {
      const loot = rollLootWithPity(this.state, todayKey);
      this.applyLootResult(loot);
    }

    const ledger = reconcileDayLedger(this.state, todayKey, todayKey);
    if (ledger.bossDamageDelta > 0) {
      this.animateBossHit();
    }
    if (entry.count > maxPerDay) {
      showToast(
        'Đã Đạt Trần Điểm Hôm Nay',
        `Đã ghi nhận x${entry.count} lần [${habit.name}] (tối đa ${maxPerDay} lượt có điểm/Vàng mỗi ngày).`,
        'amber'
      );
    }

    this.saveState();
    this.renderAll(ledger.bossDamageDelta);
  }

  triggerMinusHabit(habitId) {
    const todayKey = this.getEffectiveTodayKey();
    const habit = (this.state.habits || []).find(h => h.id === habitId);
    if (!habit) return;

    const dayLog = this.ensureDayLog(todayKey);
    const entry = dayLog.entries[habitId] || { count: 0 };
    entry.count = (entry.count || 0) + 1;
    dayLog.entries[habitId] = entry;

    const dmg = computePenaltyDamage(this.state, Number(habit.damage || 5), todayKey);
    this.state.hp = Math.max(0, (this.state.hp || 0) - dmg);

    this.state.history.unshift({
      ts: Date.now(),
      type: 'penalty',
      delta: 0,
      label: `Vi phạm Giới luật [${habit.name}] (-${dmg} HP)`
    });

    playPenaltyAlarm();
    this.triggerScreenShake();

    if (this.state.hp <= 0) {
      showToast(
        '🚨 RƠI VÀO KHU VỰC PHẠT!',
        'Sinh mệnh đã về 0 HP! Hãy hoàn thành nhiệm vụ phạt để hồi phục 50 HP.',
        'crimson'
      );
    } else {
      showToast('⚠️ Vi Phạm Giới Luật!', `Bị trừ -${dmg} HP do [${habit.name}].`, 'crimson');
    }

    this.saveState();
    this.renderAll();
  }

  addQuickTodo(event) {
    event.preventDefault();
    const titleInput = document.getElementById('quick-todo-title');
    const elInput = document.getElementById('quick-todo-element');
    const weightInput = document.getElementById('quick-todo-weight');
    const dueInput = document.getElementById('quick-todo-due');

    const title = titleInput.value.trim();
    if (!title) return;

    this.state.todos.push({
      id: 'todo_' + Date.now(),
      title,
      element: elInput.value || 'KIM',
      weight: Math.max(1, Math.min(10, Number(weightInput.value) || 4)),
      due: dueInput.value || null,
      scheduled: Boolean(dueInput.value && dueInput.value > this.getEffectiveTodayKey()),
      done: false,
      doneAt: null,
      doneDate: null,
      seed: false
    });

    titleInput.value = '';
    dueInput.value = '';
    playSlash();
    this.saveState();
    this.renderAll();
  }

  toggleTodoDone(todoId) {
    const todayKey = this.getEffectiveTodayKey();
    const todo = (this.state.todos || []).find(t => t.id === todoId);
    if (!todo) return;

    const dayLog = this.ensureDayLog(todayKey);
    if (!Array.isArray(dayLog.todosDone)) dayLog.todosDone = [];

    if (!todo.done) {
      todo.done = true;
      todo.doneAt = Date.now();
      todo.doneDate = todayKey;
      if (!dayLog.todosDone.includes(todo.id)) {
        dayLog.todosDone.push(todo.id);
      }
      playSlash();

      if (!todo.lootRolled) {
        todo.lootRolled = true;
        const loot = rollLootWithPity(this.state, todayKey);
        this.applyLootResult(loot);
      }
    } else {
      const doneKey = todo.doneDate || todayKey;
      todo.done = false;
      todo.doneAt = null;
      todo.doneDate = null;
      if (this.state.days?.[doneKey]?.todosDone) {
        this.state.days[doneKey].todosDone = this.state.days[doneKey].todosDone.filter(
          id => id !== todo.id
        );
      }
      reconcileDayLedger(this.state, doneKey, todayKey);
    }

    const ledger = reconcileDayLedger(this.state, todayKey, todayKey);
    if (ledger.bossDamageDelta !== 0) {
      this.animateBossHit();
    }
    this.saveState();
    this.renderAll(ledger.bossDamageDelta);
  }

  deleteTodo(todoId) {
    const todayKey = this.getEffectiveTodayKey();
    const todo = (this.state.todos || []).find(t => t.id === todoId);
    if (!todo) return;

    const doneKey = todo.doneDate;
    this.state.todos = this.state.todos.filter(t => t.id !== todoId);
    if (doneKey && this.state.days?.[doneKey]?.todosDone) {
      this.state.days[doneKey].todosDone = this.state.days[doneKey].todosDone.filter(
        id => id !== todoId
      );
      reconcileDayLedger(this.state, doneKey, todayKey);
    }
    this.saveState();
    this.renderAll();
  }

  /* ==========================================================================
     POMODORO FOCUS DUNGEON (DỰA TRÊN END TIMESTAMP - MỤC 6)
     ========================================================================== */

  openPomodoroModal(preferredHabitId = null) {
    const select = document.getElementById('pomo-habit-select');
    const dailies = (this.state.habits || []).filter(h => !h.archived && h.kind === 'daily');
    if (select) {
      select.innerHTML = dailies
        .map(h => `<option value="${h.id}">${h.name} (+${h.weight}đ)</option>`)
        .join('');
      if (preferredHabitId) select.value = preferredHabitId;
    }

    // Nút 5 giây thử nghiệm CHỈ hiện khi bật Chế độ Dev (Mục 6)
    const dev5sBtn = document.getElementById('pomo-btn-dev5s');
    if (dev5sBtn) {
      if (this.state.settings?.devMode) {
        dev5sBtn.classList.remove('hidden');
      } else {
        dev5sBtn.classList.add('hidden');
        if (this.pomoDurationMinutes < 1) {
          this.setPomodoroDuration(25);
        }
      }
    }

    const ambSelect = document.getElementById('pomo-ambient-select');
    if (ambSelect) {
      ambSelect.value = this.state.settings?.ambientType || 'none';
    }

    this.updatePomodoroDisplay();
    this.openModal('pomodoro-modal');
  }

  setPomodoroDuration(minutes) {
    this.pausePomodoro();
    this.pomoDurationMinutes = Number(minutes);
    this.pomoTotalMs = Math.max(5000, Math.round(this.pomoDurationMinutes * 60 * 1000));
    this.pomoRemainingMs = this.pomoTotalMs;

    const btn25 = document.getElementById('pomo-btn-25');
    const btn45 = document.getElementById('pomo-btn-45');
    if (btn25 && btn45) {
      btn25.className =
        this.pomoDurationMinutes === 25
          ? 'min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs font-hud font-bold bg-indigo-500 text-white'
          : 'min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs font-hud font-bold bg-slate-900 text-slate-300 border border-slate-700';
      btn45.className =
        this.pomoDurationMinutes === 45
          ? 'min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs font-hud font-bold bg-indigo-500 text-white'
          : 'min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs font-hud font-bold bg-slate-900 text-slate-300 border border-slate-700';
    }

    this.updatePomodoroDisplay();
  }

  togglePomodoro() {
    if (this.pomoRunning) {
      this.pausePomodoro();
    } else {
      this.startPomodoro();
    }
  }

  startPomodoro() {
    if (this.pomoRunning) return;
    this.pomoRunning = true;
    this.pomoEndTimestamp = Date.now() + this.pomoRemainingMs;
    playSlash();

    const ambVal = document.getElementById('pomo-ambient-select')?.value;
    if (ambVal && ambVal !== 'none') {
      this.state.settings.ambientType = ambVal;
      soundEngine.startAmbient(ambVal);
    }

    const toggleBtn = document.getElementById('pomo-toggle-btn');
    if (toggleBtn) {
      toggleBtn.innerHTML = `<i class="fa-solid fa-pause"></i><span>TẠM DỪNG</span>`;
    }
    const statusText = document.getElementById('pomo-status-text');
    if (statusText) statusText.textContent = 'Đang tập trung chiến đấu trong Hầm Ngục...';

    this.pomoInterval = setInterval(() => {
      const rem = Math.max(0, this.pomoEndTimestamp - Date.now());
      this.pomoRemainingMs = rem;
      this.updatePomodoroDisplay();

      if (rem <= 0) {
        this.completePomodoro();
      }
    }, 250);
  }

  pausePomodoro() {
    if (this.pomoRunning && this.pomoEndTimestamp) {
      this.pomoRemainingMs = Math.max(0, this.pomoEndTimestamp - Date.now());
    }
    this.pomoRunning = false;
    this.pomoEndTimestamp = null;
    if (this.pomoInterval) {
      clearInterval(this.pomoInterval);
      this.pomoInterval = null;
    }
    document.title = this.defaultDocTitle;
    const toggleBtn = document.getElementById('pomo-toggle-btn');
    if (toggleBtn) {
      toggleBtn.innerHTML = `<i class="fa-solid fa-play"></i><span>BẮT ĐẦU</span>`;
    }
  }

  resetPomodoro() {
    this.pausePomodoro();
    this.pomoRemainingMs = this.pomoTotalMs;
    const statusText = document.getElementById('pomo-status-text');
    if (statusText) statusText.textContent = 'Sẵn sàng tiến vào Hầm Ngục';
    this.updatePomodoroDisplay();
  }

  updatePomodoroDisplay() {
    const totalSecs = Math.ceil(this.pomoRemainingMs / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    const clockEl = document.getElementById('pomo-clock-text');
    if (clockEl) clockEl.textContent = timeStr;

    if (this.pomoRunning) {
      document.title = `[${timeStr}] Hầm Ngục Tập Trung — Ngũ Hành Leveling`;
    }

    const ring = document.getElementById('pomo-ring-circle');
    if (ring) {
      const circ = 326.72;
      const ratio = this.pomoTotalMs > 0 ? this.pomoRemainingMs / this.pomoTotalMs : 0;
      ring.style.strokeDashoffset = String(circ * (1 - ratio));
    }
  }

  completePomodoro() {
    this.pausePomodoro();
    this.pomoRemainingMs = this.pomoTotalMs;
    this.updatePomodoroDisplay();

    // Nếu là chế độ thử nghiệm 5 giây (Dev Mode) -> KHÔNG trao thưởng thật (Mục 6)
    if (this.pomoDurationMinutes < 1) {
      playLevelUp();
      showToast(
        '⚡ Hoàn Tất 5 Giây Thử Nghiệm (Dev Mode)',
        'Đồng hồ hoạt động chuẩn xác! (Chế độ 5s Dev không trao thưởng Vàng/Điểm thật theo quy tắc Mục 6).',
        'amber'
      );
      return;
    }

    const todayKey = this.getEffectiveTodayKey();
    const habitId = document.getElementById('pomo-habit-select')?.value;
    const habit = (this.state.habits || []).find(h => h.id === habitId);

    const dayLog = this.ensureDayLog(todayKey);
    if (habit) {
      const entry = dayLog.entries[habit.id] || {
        state: 0,
        count: 0,
        crit: false,
        lootRolled: false,
        tickHour: new Date().getHours(),
        paidGold: 0,
        pomoBonus: true,
        backfilled: false
      };

      // Mục 6: nếu state 0 -> 1; nếu 1 -> 1.5; nếu >= 1.5 hoặc freeze -> giữ nguyên
      if (entry.state === 0 || entry.state === 0.5) {
        entry.state = 1;
      } else if (entry.state === 1) {
        entry.state = 1.5;
      }
      entry.pomoBonus = true;
      entry.inFlow = true;
      dayLog.entries[habit.id] = entry;
    }

    // Kích hoạt Flow State 2 giờ (Mục 5.11 & 6)
    this.state.flowUntil = Date.now() + 2 * 3600 * 1000;
    this.state.stats.pomodoroCount = (this.state.stats.pomodoroCount || 0) + 1;

    // Thưởng chuyên cần Pomodoro (+25 Vàng, hoặc +40 nếu trang bị Thiền Giả, tối đa 8 phiên/ngày)
    dayLog.pomoRewardCount = (dayLog.pomoRewardCount || 0) + 1;
    let pomoGold = 0;
    if (dayLog.pomoRewardCount <= 8) {
      pomoGold = this.state.titles?.equipped === 'thien_gia' ? 40 : 25;
      this.state.inventory.gold = (this.state.inventory.gold || 0) + pomoGold;
      this.state.history.unshift({
        ts: Date.now(),
        type: 'pomo',
        delta: pomoGold,
        label: `Hoàn tất Hầm Ngục Tập Trung (${this.pomoDurationMinutes}p): +${pomoGold} Vàng`
      });
    }

    const ledger = reconcileDayLedger(this.state, todayKey, todayKey);
    evaluateTitles(this.state, todayKey);

    playLevelUp();
    this.fireConfetti();
    this.saveState();
    this.renderAll(ledger.bossDamageDelta);

    showToast(
      '⚔️ HOÀN TẤT HẦM NGỤC TẬP TRUNG!',
      `Đã nâng cấp [${habit ? habit.name : 'Nhiệm vụ'}], cộng +${pomoGold} Vàng và kích hoạt trạng thái Flow x1.25 trong 2 giờ!`,
      'gold'
    );
  }

  /* ==========================================================================
     MODAL HELPERS & CUSTOM CONFIRM
     ========================================================================== */

  openModal(modalId) {
    const m = document.getElementById(modalId);
    if (m) m.classList.remove('hidden');
  }

  closeModal(modalId) {
    const m = document.getElementById(modalId);
    if (m) m.classList.add('hidden');
  }

  closeAllModals() {
    [
      'habit-modal',
      'day-detail-modal',
      'schedule-quest-modal',
      'pomodoro-modal',
      'shop-modal',
      'settings-modal',
      'cron-recap-modal',
      'confirm-modal'
    ].forEach(id => this.closeModal(id));
  }

  openConfirmModal({ title, message, showRetroRest = false, onConfirm }) {
    document.getElementById('confirm-modal-title').textContent = title || 'XÁC NHẬN HỆ THỐNG';
    document.getElementById('confirm-modal-message').textContent = message || '';
    const retroBox = document.getElementById('confirm-retro-rest-box');
    if (retroBox) {
      if (showRetroRest) retroBox.classList.remove('hidden');
      else retroBox.classList.add('hidden');
    }
    this.confirmCallback = onConfirm;
    this.openModal('confirm-modal');
  }

  openDayDetailModal(dateKey) {
    const todayKey = this.getEffectiveTodayKey();
    this.ensureDayLog(dateKey);
    renderDayDetailModalContent(this.state, dateKey, todayKey);
    this.openModal('day-detail-modal');
  }

  openScheduleQuestModal(dateKey) {
    document.getElementById('schedule-quest-date').value = dateKey;
    document.getElementById('schedule-quest-date-label').textContent = formatFullVN(dateKey);
    document.getElementById('schedule-quest-name').value = '';

    const existingList = document.getElementById('schedule-existing-list');
    const dueTodos = (this.state.todos || []).filter(t => t.due === dateKey);
    if (existingList) {
      if (dueTodos.length === 0) {
        existingList.innerHTML = '';
      } else {
        existingList.innerHTML = `
          <div class="text-xs text-slate-400 font-semibold">Đã hẹn trong ngày này:</div>
          ${dueTodos
            .map(
              t =>
                `<div class="px-2.5 py-1.5 rounded bg-slate-900 border border-slate-800 text-xs text-white flex justify-between"><span>• ${t.title}</span><span class="text-sky-300 font-hud">+${t.weight}đ</span></div>`
            )
            .join('')}
        `;
      }
    }
    this.openModal('schedule-quest-modal');
  }

  /* ==========================================================================
     THÊM / SỬA / XÓA THÓI QUEN (HABIT MODAL)
     ========================================================================== */

  openHabitModal(habitId = null, defaultKind = 'daily') {
    const idEl = document.getElementById('habit-form-id');
    const nameEl = document.getElementById('habit-form-name');
    const kindEl = document.getElementById('habit-form-kind');
    const elEl = document.getElementById('habit-form-element');
    const weightEl = document.getElementById('habit-form-weight');
    const extraValEl = document.getElementById('habit-form-extra-val');
    const modeEl = document.getElementById('habit-form-schedule-mode');
    const quotaEl = document.getElementById('habit-form-quota');

    if (habitId) {
      const h = (this.state.habits || []).find(item => item.id === habitId);
      if (!h) return;
      document.getElementById('habit-modal-title').textContent = 'CHỈNH SỬA THÓI QUEN LINH CĂN';
      idEl.value = h.id;
      nameEl.value = h.name;
      kindEl.value = h.kind || 'daily';
      elEl.value = h.element || 'KIM';
      weightEl.value = h.weight || 5;
      extraValEl.value = h.kind === 'minus' ? h.damage || 5 : h.maxPerDay || 10;
      modeEl.value = h.schedule?.mode || 'everyday';
      quotaEl.value = h.schedule?.quota || 3;

      const selectedDays = h.schedule?.days || [1, 2, 3, 4, 5, 6, 7];
      document.querySelectorAll('#habit-days-checkboxes input[type="checkbox"]').forEach(cb => {
        cb.checked = selectedDays.includes(Number(cb.value));
      });
    } else {
      document.getElementById('habit-modal-title').textContent = 'KHỞI TẠO THÓI QUEN LINH CĂN';
      idEl.value = '';
      nameEl.value = '';
      kindEl.value = defaultKind || 'daily';
      elEl.value = 'KIM';
      weightEl.value = defaultKind === 'plus' ? 1 : 5;
      extraValEl.value = defaultKind === 'minus' ? 5 : 10;
      modeEl.value = 'everyday';
      quotaEl.value = 3;
      document.querySelectorAll('#habit-days-checkboxes input[type="checkbox"]').forEach(cb => {
        cb.checked = true;
      });
    }

    this.syncHabitModalKindUI();
    this.openModal('habit-modal');
  }

  syncHabitModalKindUI() {
    const kind = document.getElementById('habit-form-kind').value;
    const schedSec = document.getElementById('habit-schedule-section');
    const extraBox = document.getElementById('habit-form-extra-box');
    const extraLbl = document.getElementById('habit-form-extra-label');
    const mode = document.getElementById('habit-form-schedule-mode').value;
    const daysBox = document.getElementById('habit-days-checkboxes');
    const quotaBox = document.getElementById('habit-quota-box');

    if (kind === 'daily') {
      schedSec.classList.remove('hidden');
      extraBox.classList.add('hidden');
      if (mode === 'days') {
        daysBox.classList.remove('hidden');
        quotaBox.classList.add('hidden');
      } else if (mode === 'quota') {
        daysBox.classList.add('hidden');
        quotaBox.classList.remove('hidden');
      } else {
        daysBox.classList.add('hidden');
        quotaBox.classList.add('hidden');
      }
    } else {
      schedSec.classList.add('hidden');
      extraBox.classList.remove('hidden');
      extraLbl.textContent =
        kind === 'plus' ? 'Trần lượt cộng điểm/ngày (maxPerDay)' : 'Sát thương trừ HP mỗi lần (damage)';
    }
  }

  saveHabitForm(event) {
    event.preventDefault();
    const id = document.getElementById('habit-form-id').value.trim();
    const name = document.getElementById('habit-form-name').value.trim();
    const kind = document.getElementById('habit-form-kind').value;
    const element = document.getElementById('habit-form-element').value;
    const weight = Math.max(1, Math.min(10, Number(document.getElementById('habit-form-weight').value) || 5));
    const extraVal = Math.max(1, Number(document.getElementById('habit-form-extra-val').value) || 5);
    const mode = document.getElementById('habit-form-schedule-mode').value;
    const quota = Math.max(1, Math.min(6, Number(document.getElementById('habit-form-quota').value) || 3));

    if (!name) return;

    const checkedDays = [];
    document.querySelectorAll('#habit-days-checkboxes input[type="checkbox"]').forEach(cb => {
      if (cb.checked) checkedDays.push(Number(cb.value));
    });
    if (mode === 'days' && checkedDays.length === 0) {
      checkedDays.push(1);
    }

    const schedule = {
      mode,
      days: mode === 'days' ? checkedDays : [1, 2, 3, 4, 5, 6, 7],
      quota
    };

    const todayKey = this.getEffectiveTodayKey();

    if (id) {
      const existing = (this.state.habits || []).find(h => h.id === id);
      if (existing) {
        existing.name = name;
        existing.kind = kind;
        existing.element = element;
        existing.weight = weight;
        existing.schedule = schedule;
        if (kind === 'plus') existing.maxPerDay = extraVal;
        if (kind === 'minus') existing.damage = extraVal;
      }
      showToast('Đã Cập Nhật Thói Quen', `Nhiệm vụ [${name}] đã được lưu.`, 'cyan');
    } else {
      this.state.habits.push({
        id: 'h_' + Date.now(),
        name,
        element,
        weight,
        kind,
        schedule,
        maxPerDay: kind === 'plus' ? extraVal : 10,
        damage: kind === 'minus' ? extraVal : 5,
        startDate: todayKey,
        archived: false,
        seed: false,
        mastery: 0.3,
        streakCount: 0
      });
      showToast('Đã Khởi Tạo Nhiệm Vụ', `Đã thêm [${name}] vào Hệ thống!`, 'emerald');
    }

    reconcileDayLedger(this.state, todayKey, todayKey);
    playSlash();
    this.closeModal('habit-modal');
    this.saveState();
    this.renderAll();
  }

  deleteHabitWithConfirm(habitId) {
    const habit = (this.state.habits || []).find(h => h.id === habitId);
    if (!habit) return;

    this.openConfirmModal({
      title: 'XÁC NHẬN XÓA THÓI QUEN',
      message: `Bạn có chắc chắn muốn xóa nhiệm vụ "${habit.name}" khỏi hệ thống?`,
      onConfirm: () => {
        this.state.habits = this.state.habits.filter(h => h.id !== habitId);
        reconcileDayLedger(this.state, this.getEffectiveTodayKey(), this.getEffectiveTodayKey());
        this.saveState();
        this.renderAll();
        showToast('Đã Xóa Thói Quen', `Đã xóa [${habit.name}].`, 'amber');
      }
    });
  }

  /* ==========================================================================
     CỬA HÀNG, TÚI ĐỒ, PENALTY ZONE & NGHỈ TRỌ
     ========================================================================== */

  useHpPotion() {
    if ((this.state.inventory.potions || 0) <= 0) {
      showToast('🧪 Hết Đan Dược HP', 'Hãy mua Bình Hồi Phục trong Cửa Hàng (80 Vàng).', 'amber');
      return;
    }
    const todayKey = this.getEffectiveTodayKey();
    const maxHp = computeMaxHp(this.state, todayKey);
    if ((this.state.hp || 0) >= maxHp) {
      showToast('Sinh Mệnh Đã Đầy', `Bạn đang có ${this.state.hp}/${maxHp} HP.`, 'cyan');
      return;
    }

    this.state.inventory.potions -= 1;
    this.state.hp = Math.min(maxHp, (this.state.hp || 0) + 30);
    this.state.history.unshift({
      ts: Date.now(),
      type: 'heal',
      delta: 0,
      label: 'Dùng 1 Bình Hồi Phục (+30 HP)'
    });

    playLevelUp();
    this.saveState();
    this.renderAll();
    renderShopModalContent(this.state, todayKey);
    showToast('🧪 Đã Dùng Đan Dược', 'Hồi phục +30 HP Sinh Mệnh thành công!', 'emerald');
  }

  buySystemItem(itemType) {
    const todayKey = this.getEffectiveTodayKey();
    if (itemType === 'shield') {
      if ((this.state.inventory.shields || 0) >= INVENTORY_LIMITS.shields) {
        showToast('Túi Đồ Đã Đầy', `Bạn đã đạt giới hạn tối đa ${INVENTORY_LIMITS.shields} Khiên Định Hồn.`, 'amber');
        return;
      }
      if ((this.state.inventory.gold || 0) < 100) {
        showToast('Không Đủ Vàng', 'Cần 100 Vàng để mua Khiên Định Hồn.', 'amber');
        return;
      }
      this.state.inventory.gold -= 100;
      this.state.inventory.shields += 1;
      this.state.history.unshift({
        ts: Date.now(),
        type: 'spend',
        delta: -100,
        label: 'Mua [🛡️ Khiên Định Hồn] (-100 Vàng)'
      });
      playChestOpen();
      showToast('🛡️ Mua Thành Công', 'Đã thêm +1 Khiên Định Hồn vào kho!', 'cyan');
    } else if (itemType === 'potion') {
      if ((this.state.inventory.potions || 0) >= INVENTORY_LIMITS.potions) {
        showToast('Túi Đồ Đã Đầy', `Bạn đã đạt giới hạn tối đa ${INVENTORY_LIMITS.potions} Đan Dược HP.`, 'amber');
        return;
      }
      if ((this.state.inventory.gold || 0) < 80) {
        showToast('Không Đủ Vàng', 'Cần 80 Vàng để mua Bình Hồi Phục HP.', 'amber');
        return;
      }
      this.state.inventory.gold -= 80;
      this.state.inventory.potions += 1;
      this.state.history.unshift({
        ts: Date.now(),
        type: 'spend',
        delta: -80,
        label: 'Mua [🧪 Bình Hồi Phục +30 HP] (-80 Vàng)'
      });
      playChestOpen();
      showToast('🧪 Mua Thành Công', 'Đã thêm +1 Bình Hồi Phục HP vào kho!', 'emerald');
    }

    this.saveState();
    this.renderAll();
    renderShopModalContent(this.state, todayKey);
  }

  buyCustomReward(rewardId) {
    if ((this.state.hp || 0) <= 0) {
      playPenaltyAlarm();
      showToast('🔒 Khóa Khu Vực Phạt', 'HP = 0! Hãy hoàn thành nhiệm vụ phạt trước khi mua phần thưởng đời thực.', 'crimson');
      return;
    }
    const rw = (this.state.rewards || []).find(r => r.id === rewardId);
    if (!rw) return;
    if ((this.state.inventory.gold || 0) < rw.cost) {
      showToast('Không Đủ Vàng', `Bạn cần ${rw.cost} Vàng để đổi [${rw.title}].`, 'amber');
      return;
    }

    this.state.inventory.gold -= rw.cost;
    this.state.history.unshift({
      ts: Date.now(),
      type: 'spend',
      delta: -rw.cost,
      label: `Đổi thưởng đời thực [${rw.title}] (-${rw.cost} Vàng)`
    });

    playChestOpen();
    this.fireConfetti();
    this.saveState();
    this.renderAll();
    renderShopModalContent(this.state, this.getEffectiveTodayKey());
    showToast('🎁 Đổi Thưởng Thành Công!', `Hãy tận hưởng phần thưởng: "${rw.title}"!`, 'gold');
  }

  completePenaltyQuest() {
    const todayKey = this.getEffectiveTodayKey();
    const maxHp = computeMaxHp(this.state, todayKey);
    this.state.hp = Math.min(maxHp, 50);
    this.state.stats.penaltyQuestsCompleted = (this.state.stats.penaltyQuestsCompleted || 0) + 1;
    this.state.history.unshift({
      ts: Date.now(),
      type: 'system',
      delta: 0,
      label: 'Hoàn thành Nhiệm vụ Phạt: Hồi sinh +50 HP & Mở khóa Cửa Hàng'
    });

    evaluateTitles(this.state, todayKey);
    playLevelUp();
    this.fireConfetti();
    this.saveState();
    this.renderAll();
    showToast('⚡ ĐÃ VƯỢT QUA HÌNH PHẠT!', 'Hồi phục +50 HP và mở khóa toàn bộ Phần thưởng Đời thực.', 'emerald');
  }

  toggleRestModeWithConfirm() {
    const todayKey = this.getEffectiveTodayKey();
    const currentlyActive = Boolean(this.state.rest?.active);

    if (!currentlyActive) {
      this.openConfirmModal({
        title: 'BẬT CHẾ ĐỘ NGHỈ TRỌ (REST IN THE INN)',
        message:
          'Khi Nghỉ Trọ: Hệ thống không chốt ngày, không phạt HP, chuỗi Streak được đóng băng và Boss tuần tạm dừng. Bạn có muốn bật Nghỉ Trọ ngay không?',
        showRetroRest: true,
        onConfirm: () => {
          const retroDays = Math.max(
            0,
            Math.min(7, Number(document.getElementById('confirm-retro-days')?.value) || 0)
          );
          const startKey = addDays(todayKey, -retroDays);
          this.state.rest.active = true;
          this.state.rest.startDate = startKey;

          // Áp dụng hồi tố cho tối đa 7 ngày gần nhất chưa chốt
          for (let i = 0; i <= retroDays; i++) {
            const dk = addDays(todayKey, -i);
            const dLog = this.ensureDayLog(dk);
            if (!dLog.closed || i === 0) {
              dLog.restDay = true;
            }
          }

          this.saveState();
          this.renderAll();
          showToast('🏕️ Đã Vào Quán Trọ Ngũ Hành', `Chế độ Nghỉ Trọ bắt đầu từ ngày ${startKey}.`, 'cyan');
        }
      });
    } else {
      this.openConfirmModal({
        title: 'KẾT THÚC NGHỈ TRỌ & TIẾP TỤC CHIẾN ĐẤU',
        message: 'Bạn đã sẵn sàng rời Quán Trọ và tiếp tục hành trình chinh phục nhiệm vụ?',
        showRetroRest: false,
        onConfirm: () => {
          const start = this.state.rest.startDate || todayKey;
          const yesterday = addDays(todayKey, -1);
          if (start <= yesterday) {
            this.state.rest.periods.push({ start, end: yesterday });
          }
          this.state.rest.active = false;
          this.state.rest.startDate = null;
          if (this.state.days[todayKey]) {
            this.state.days[todayKey].restDay = false;
          }
          this.saveState();
          this.renderAll();
          showToast('⚔️ Đã Rời Quán Trọ!', 'Hệ thống chiến đấu đã hoạt động trở lại.', 'emerald');
        }
      });
    }
  }

  /* ==========================================================================
     BACKUP / RESTORE JSON, XÓA LỊCH SỬ MẪU & BLANK SLATE (MỤC 9 & 13)
     ========================================================================== */

  exportBackupJSON(prefix = 'ngu-hanh-leveling-backup') {
    const todayKey = this.getEffectiveTodayKey();
    const jsonStr = JSON.stringify(this.state, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${prefix}-${todayKey}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('⬇ Đã Tải Xuống Backup JSON', 'File sao lưu dữ liệu đã được lưu về máy.', 'cyan');
  }

  handleRestoreJSONFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = e => {
      try {
        const parsed = JSON.parse(e.target.result);
        const check = validateStateSchema(parsed);
        if (!check.valid) {
          showToast('🚫 File Backup Không Hợp Lệ', check.reason, 'crimson');
          return;
        }

        this.openConfirmModal({
          title: 'XÁC NHẬN KHÔI PHỤC DỮ LIỆU (RESTORE JSON)',
          message:
            'Dữ liệu hiện tại sẽ được thay thế bằng bản sao lưu từ file JSON. Hệ thống đã tạo bản sao lưu tạm trong bộ nhớ để an toàn.',
          onConfirm: () => {
            const memorySnapshot = JSON.parse(JSON.stringify(this.state));
            try {
              this.state = parsed;
              this.saveState(true);
              playLevelUp();
              this.renderAll();
              showToast('⬆ Khôi Phục Thành Công!', 'Toàn bộ trạng thái Thợ Săn đã được khôi phục.', 'emerald');
            } catch (err) {
              this.state = memorySnapshot;
              this.saveState(true);
              showToast('Lỗi Khôi Phục — Đã Hoàn Tác', err.message, 'crimson');
            }
          }
        });
      } catch {
        showToast('🚫 Lỗi Đọc File JSON', 'File bị hỏng hoặc không đúng định dạng JSON.', 'crimson');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  }

  triggerClearSeedHistory() {
    this.openConfirmModal({
      title: 'XÓA LỊCH SỬ MẪU — BẮT ĐẦU TỪ NGÀY 1',
      message:
        'Hệ thống sẽ tự động tải về 1 bản Backup JSON trước, sau đó xóa toàn bộ nhật ký 14 ngày mẫu nhưng GIỮ NGUYÊN danh sách thói quen của bạn, đưa Vàng=100, Khiên=1, Đan Dược=1.',
      onConfirm: () => {
        this.exportBackupJSON('auto-backup-before-day1');
        clearSeedHistoryInState(this.state, this.getEffectiveTodayKey());
        this.saveState(true);
        this.closeModal('settings-modal');
        playLevelUp();
        this.renderAll();
        showToast('🌱 Bắt Đầu Hành Trình Ngày 1!', 'Đã xóa lịch sử mẫu và giữ nguyên danh sách thói quen.', 'emerald');
      }
    });
  }

  triggerBlankSlate() {
    const input = document.getElementById('blank-slate-confirm-input');
    const val = (input?.value || '').trim();
    if (val !== 'XOA') {
      showToast('Chưa Nhập Đúng Xác Nhận', 'Vui lòng gõ chính xác chữ XOA (in hoa) vào ô xác nhận để xóa trắng.', 'crimson');
      return;
    }

    this.exportBackupJSON('auto-backup-before-blank-slate');
    this.state = createBlankSlateState(this.getEffectiveTodayKey());
    if (input) input.value = '';
    this.saveState(true);
    this.closeModal('settings-modal');
    playSlash();
    this.renderAll();
    showToast('Khởi Đầu Trắng Hoàn Tất', 'Toàn bộ dữ liệu đã được xóa sạch 100%.', 'amber');
  }

  /* ==========================================================================
     GOD MODE & CÀI ĐẶT (MỤC 9.3)
     ========================================================================== */

  saveGodModeSettings() {
    const todayKey = this.getEffectiveTodayKey();
    const newGold = Math.max(0, Number(document.getElementById('god-gold').value) || 0);
    const newHp = Math.max(0, Number(document.getElementById('god-hp').value) || 0);
    const newShields = Math.max(
      0,
      Math.min(INVENTORY_LIMITS.shields, Number(document.getElementById('god-shields').value) || 0)
    );
    const newPotions = Math.max(
      0,
      Math.min(INVENTORY_LIMITS.potions, Number(document.getElementById('god-potions').value) || 0)
    );

    const safeThresholdPct = Math.max(
      10,
      Math.min(100, Number(document.getElementById('god-safe-threshold').value) || 50)
    );
    const goldPerPoint = Math.max(1, Number(document.getElementById('god-gold-per-point').value) || 5);
    const goldMult = Math.max(0.1, Number(document.getElementById('god-gold-mult').value) || 1.0);
    const maxHpBonus = Math.max(0, Number(document.getElementById('god-maxhp-bonus').value) || 0);
    const devMode = Boolean(document.getElementById('god-dev-mode').checked);
    const bossName = document.getElementById('god-boss-name').value.trim();
    const penaltyLines = document
      .getElementById('god-penalty-quests')
      .value.split('\n')
      .map(s => s.trim())
      .filter(Boolean);

    const goldDiff = newGold - (this.state.inventory.gold || 0);
    this.state.inventory.gold = newGold;
    this.state.inventory.shields = newShields;
    this.state.inventory.potions = newPotions;

    this.state.settings.safeThreshold = safeThresholdPct / 100;
    this.state.settings.goldPerPoint = goldPerPoint;
    this.state.settings.goldMultiplier = goldMult;
    this.state.settings.maxHpBonus = maxHpBonus;
    this.state.settings.devMode = devMode;
    if (!devMode) {
      this.state.settings.virtualDayOffset = 0;
    }
    if (penaltyLines.length > 0) {
      this.state.settings.penaltyQuests = penaltyLines;
    }

    const maxHp = computeMaxHp(this.state, todayKey);
    this.state.hp = Math.min(maxHp, newHp);

    if (bossName) {
      for (const bKey of Object.keys(this.state.boss || {})) {
        this.state.boss[bKey].name = bossName;
      }
      this.state.settings.bossNames = [bossName, ...this.state.settings.bossNames.slice(1)];
    }

    this.state.history.unshift({
      ts: Date.now(),
      type: 'god',
      delta: goldDiff,
      label: `[GOD] Chỉnh thông số Hệ thống (Vàng=${newGold}, HP=${this.state.hp}, Khiên=${newShields}, Đan=${newPotions})`
    });

    this.saveState(true);
    this.renderAll();
    renderSettingsModalContent(this.state, this.getEffectiveTodayKey(), this.isPersisted);
    showToast('⚡ Đã Áp Dụng God Mode', 'Mọi thay đổi đã được lưu và ghi nhận vào lịch sử với nhãn [GOD].', 'purple');
  }

  /* ==========================================================================
     LẮNG NGHE SỰ KIỆN TOÀN CỤC (EVENT DELEGATION & PHÍM TẮT)
     ========================================================================== */

  bindEvents() {
    // 1. Click delegation theo data-action
    document.addEventListener('click', e => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const action = btn.dataset.action;

      switch (action) {
        case 'switch-tab':
          this.switchTab(btn.dataset.tab);
          break;
        case 'set-chart-range':
          this.setChartRange(Number(btn.dataset.range));
          break;
        case 'cycle-checkin':
          this.cycleCheckin(btn.dataset.habitId, btn.dataset.date);
          break;
        case 'trigger-plus':
          this.triggerPlusHabit(btn.dataset.habitId);
          break;
        case 'trigger-minus':
          this.triggerMinusHabit(btn.dataset.habitId);
          break;
        case 'toggle-todo':
          this.toggleTodoDone(btn.dataset.todoId);
          break;
        case 'delete-todo':
          this.deleteTodo(btn.dataset.todoId);
          break;
        case 'open-habit-modal':
          this.openHabitModal(null, btn.dataset.kind || 'daily');
          break;
        case 'edit-habit':
          this.openHabitModal(btn.dataset.habitId);
          break;
        case 'delete-habit':
          this.deleteHabitWithConfirm(btn.dataset.habitId);
          break;
        case 'open-pomodoro-modal':
          this.openPomodoroModal(btn.dataset.habitId || null);
          break;
        case 'pomo-set-duration':
          this.setPomodoroDuration(Number(btn.dataset.minutes));
          break;
        case 'pomo-toggle':
          this.togglePomodoro();
          break;
        case 'pomo-reset':
          this.resetPomodoro();
          break;
        case 'open-shop-modal':
          renderShopModalContent(this.state, this.getEffectiveTodayKey());
          this.openModal('shop-modal');
          break;
        case 'buy-system-item':
          this.buySystemItem(btn.dataset.item);
          break;
        case 'buy-custom-reward':
          this.buyCustomReward(btn.dataset.rewardId);
          break;
        case 'edit-custom-reward': {
          const rw = (this.state.rewards || []).find(r => r.id === btn.dataset.rewardId);
          if (rw) {
            document.getElementById('reward-form-id').value = rw.id;
            document.getElementById('reward-form-title').value = rw.title;
            document.getElementById('reward-form-cost').value = rw.cost;
            document.getElementById('reward-form-title').focus();
          }
          break;
        }
        case 'delete-custom-reward': {
          const rwId = btn.dataset.rewardId;
          this.state.rewards = (this.state.rewards || []).filter(r => r.id !== rwId);
          this.saveState();
          renderShopModalContent(this.state, this.getEffectiveTodayKey());
          break;
        }
        case 'clear-history':
          this.openConfirmModal({
            title: 'XÓA LỊCH SỬ GIAO DỊCH',
            message: 'Bạn có muốn xóa toàn bộ danh sách lịch sử chi tiêu và nhận thưởng?',
            onConfirm: () => {
              this.state.history = [];
              this.saveState();
              renderShopModalContent(this.state, this.getEffectiveTodayKey());
            }
          });
          break;
        case 'use-potion':
          this.useHpPotion();
          break;
        case 'reroll-penalty-quest': {
          const list = this.state.settings.penaltyQuests || DEFAULT_PENALTY_QUESTS;
          this.state.settings.activePenaltyQuestIdx =
            ((this.state.settings.activePenaltyQuestIdx || 0) + 1) % list.length;
          this.saveState();
          renderHeaderHUD(this.state, this.getEffectiveTodayKey(), Date.now());
          break;
        }
        case 'complete-penalty-quest':
          this.completePenaltyQuest();
          break;
        case 'toggle-rest-mode':
          this.toggleRestModeWithConfirm();
          break;
        case 'export-backup':
          this.exportBackupJSON();
          break;
        case 'toggle-sound':
          this.state.settings.soundEnabled = !this.state.settings.soundEnabled;
          soundEngine.syncSettings(this.state.settings);
          if (this.state.settings.soundEnabled) playSlash();
          this.saveState();
          renderHeaderHUD(this.state, this.getEffectiveTodayKey(), Date.now());
          break;
        case 'open-settings-modal':
          renderSettingsModalContent(this.state, this.getEffectiveTodayKey(), this.isPersisted);
          this.openModal('settings-modal');
          break;
        case 'equip-title': {
          const titleId = btn.dataset.titleId || null;
          this.state.titles.equipped = titleId;
          playSlash();
          this.saveState();
          this.renderAll();
          renderSettingsModalContent(this.state, this.getEffectiveTodayKey(), this.isPersisted);
          break;
        }
        case 'save-god-mode':
          this.saveGodModeSettings();
          break;
        case 'clear-seed-history':
          this.triggerClearSeedHistory();
          break;
        case 'dismiss-seed-banner':
          this.state.settings.seedBannerDismissed = true;
          this.saveState();
          renderHeaderHUD(this.state, this.getEffectiveTodayKey(), Date.now());
          break;
        case 'trigger-blank-slate':
          this.triggerBlankSlate();
          break;
        case 'dev-shift-day': {
          const delta = Number(btn.dataset.delta) || 0;
          this.state.settings.virtualDayOffset =
            (this.state.settings.virtualDayOffset || 0) + delta;
          this.checkAndRunCron();
          this.saveState();
          this.renderAll();
          break;
        }
        case 'dev-reset-day':
          this.state.settings.virtualDayOffset = 0;
          this.state.lastOpenDate = toDateKey(new Date());
          this.saveState();
          this.renderAll();
          break;
        case 'matrix-prev-week':
          this.matrixWeekOffset -= 1;
          renderWeeklyMatrixTab(
            this.state,
            this.getEffectiveTodayKey(),
            this.matrixWeekOffset,
            this.matrixElementFilter
          );
          break;
        case 'matrix-current-week':
          this.matrixWeekOffset = 0;
          renderWeeklyMatrixTab(
            this.state,
            this.getEffectiveTodayKey(),
            this.matrixWeekOffset,
            this.matrixElementFilter
          );
          break;
        case 'matrix-next-week':
          this.matrixWeekOffset += 1;
          renderWeeklyMatrixTab(
            this.state,
            this.getEffectiveTodayKey(),
            this.matrixWeekOffset,
            this.matrixElementFilter
          );
          break;
        case 'filter-element': {
          this.matrixElementFilter = btn.dataset.element || 'ALL';
          document.querySelectorAll('#matrix-filter-group button').forEach(b => {
            if (b.dataset.element === this.matrixElementFilter) {
              b.classList.add('ring-2', 'ring-sky-400');
            } else {
              b.classList.remove('ring-2', 'ring-sky-400');
            }
          });
          renderWeeklyMatrixTab(
            this.state,
            this.getEffectiveTodayKey(),
            this.matrixWeekOffset,
            this.matrixElementFilter
          );
          break;
        }
        case 'cal-prev-month':
          this.calMonth -= 1;
          if (this.calMonth < 1) {
            this.calMonth = 12;
            this.calYear -= 1;
          }
          renderMonthlyCalendarTab(
            this.state,
            this.getEffectiveTodayKey(),
            this.calYear,
            this.calMonth
          );
          break;
        case 'cal-next-month':
          this.calMonth += 1;
          if (this.calMonth > 12) {
            this.calMonth = 1;
            this.calYear += 1;
          }
          renderMonthlyCalendarTab(
            this.state,
            this.getEffectiveTodayKey(),
            this.calYear,
            this.calMonth
          );
          break;
        case 'cal-today': {
          const dt = parseDateKey(this.getEffectiveTodayKey());
          this.calYear = dt.getFullYear();
          this.calMonth = dt.getMonth() + 1;
          renderMonthlyCalendarTab(
            this.state,
            this.getEffectiveTodayKey(),
            this.calYear,
            this.calMonth
          );
          break;
        }
        case 'open-day-detail':
          this.openDayDetailModal(btn.dataset.date);
          break;
        case 'save-day-detail': {
          const dk = document.getElementById('day-detail-datekey').value;
          const note = document.getElementById('day-detail-note').value.trim();
          const energy = document.getElementById('day-detail-energy').value;
          const dLog = this.ensureDayLog(dk);
          dLog.note = note;
          dLog.energy = energy;
          reconcileDayLedger(this.state, dk, this.getEffectiveTodayKey());
          this.saveState();
          this.closeModal('day-detail-modal');
          this.renderAll();
          showToast('📝 Đã Lưu Chi Tiết Ngày', `Đã cập nhật nhật ký & năng lượng ngày ${dk}.`, 'emerald');
          break;
        }
        case 'open-schedule-quest':
          this.openScheduleQuestModal(btn.dataset.date);
          break;
        case 'close-modal':
          this.closeModal(btn.dataset.modal);
          break;
        case 'check-pwa-update':
          this.checkPwaUpdate();
          break;
        case 'install-pwa':
          this.triggerInstallPwa();
          break;
      }
    });

    // 2. Các Form submit
    document.getElementById('quick-todo-form')?.addEventListener('submit', e => this.addQuickTodo(e));
    document.getElementById('habit-form')?.addEventListener('submit', e => this.saveHabitForm(e));
    document.getElementById('habit-form-kind')?.addEventListener('change', () => this.syncHabitModalKindUI());
    document.getElementById('habit-form-schedule-mode')?.addEventListener('change', () => this.syncHabitModalKindUI());

    // Form Schedule Quest (Tab 3 Lịch Tháng)
    document.getElementById('schedule-quest-form')?.addEventListener('submit', e => {
      e.preventDefault();
      const due = document.getElementById('schedule-quest-date').value;
      const title = document.getElementById('schedule-quest-name').value.trim();
      const element = document.getElementById('schedule-quest-element').value || 'KIM';
      const weight = Math.max(1, Math.min(10, Number(document.getElementById('schedule-quest-weight').value) || 5));
      if (!title || !due) return;

      this.state.todos.push({
        id: 'todo_sched_' + Date.now(),
        title,
        element,
        weight,
        due,
        scheduled: true,
        done: false,
        doneAt: null,
        doneDate: null,
        seed: false
      });

      playSlash();
      this.closeModal('schedule-quest-modal');
      this.saveState();
      this.renderAll();
      showToast('📅 Đã Đặt Lịch Schedule Quest', `Nhiệm vụ [${title}] đã được ấn định vào ngày ${due}.`, 'cyan');
    });

    // Form Phần thưởng Đời thực trong Shop
    document.getElementById('custom-reward-form')?.addEventListener('submit', e => {
      e.preventDefault();
      const id = document.getElementById('reward-form-id').value.trim();
      const title = document.getElementById('reward-form-title').value.trim();
      const cost = Math.max(10, Number(document.getElementById('reward-form-cost').value) || 150);
      if (!title) return;

      if (id) {
        const existing = (this.state.rewards || []).find(r => r.id === id);
        if (existing) {
          existing.title = title;
          existing.cost = cost;
        }
        document.getElementById('reward-form-id').value = '';
      } else {
        this.state.rewards.push({
          id: 'rw_' + Date.now(),
          title,
          cost,
          icon: 'fa-gift',
          seed: false
        });
      }

      document.getElementById('reward-form-title').value = '';
      document.getElementById('reward-form-cost').value = '150';
      this.saveState();
      renderShopModalContent(this.state, this.getEffectiveTodayKey());
    });

    // Bộ chọn Năng lượng ngày trên HUD
    document.getElementById('hud-energy-select')?.addEventListener('change', e => {
      const todayKey = this.getEffectiveTodayKey();
      const dLog = this.ensureDayLog(todayKey);
      if (dLog.closed) {
        showToast('Ngày Đã Chốt', 'Không thể đổi năng lượng của ngày đã chốt.', 'amber');
        return;
      }
      dLog.energy = e.target.value === 'low' ? 'low' : 'full';
      reconcileDayLedger(this.state, todayKey, todayKey);
      this.saveState();
      this.renderAll();
      showToast(
        '⚡ Đã Cập Nhật Năng Lượng Ngày',
        dLog.energy === 'low'
          ? 'Chế độ Cạn Pin: Mục tiêu hôm nay đã giảm 50% (x0.5) để bảo vệ chuỗi Streak!'
          : 'Chế độ Sung Sức: Mục tiêu hôm nay ở mức 100% tiêu chuẩn.',
        'cyan'
      );
    });

    // Nhảy nhanh tháng trên Lịch Vạn Niên
    document.getElementById('cal-quick-jump')?.addEventListener('change', e => {
      const val = e.target.value;
      if (!val) return;
      const [y, m] = val.split('-').map(Number);
      this.calYear = y;
      this.calMonth = m;
      renderMonthlyCalendarTab(this.state, this.getEffectiveTodayKey(), this.calYear, this.calMonth);
    });

    // Âm lượng và Ambient trong Cài Đặt & Pomodoro
    document.getElementById('settings-master-vol')?.addEventListener('input', e => {
      this.state.settings.masterVolume = Number(e.target.value);
      soundEngine.syncSettings(this.state.settings);
      this.saveState();
    });

    document.getElementById('settings-ambient-type')?.addEventListener('change', e => {
      this.state.settings.ambientType = e.target.value;
      soundEngine.startAmbient(this.state.settings.ambientType);
      this.saveState();
    });

    document.getElementById('settings-ambient-vol')?.addEventListener('input', e => {
      this.state.settings.ambientVolume = Number(e.target.value);
      soundEngine.syncSettings(this.state.settings);
      this.saveState();
    });

    document.getElementById('pomo-ambient-select')?.addEventListener('change', e => {
      this.state.settings.ambientType = e.target.value;
      soundEngine.startAmbient(this.state.settings.ambientType);
      this.saveState();
    });

    // Restore JSON input
    document.getElementById('restore-json-input')?.addEventListener('change', e =>
      this.handleRestoreJSONFile(e)
    );

    // Confirm modal buttons
    document.getElementById('confirm-cancel-btn')?.addEventListener('click', () => {
      this.confirmCallback = null;
      this.closeModal('confirm-modal');
    });
    document.getElementById('confirm-ok-btn')?.addEventListener('click', () => {
      const cb = this.confirmCallback;
      this.confirmCallback = null;
      this.closeModal('confirm-modal');
      if (typeof cb === 'function') cb();
    });

    // Phím tắt toàn cục: 1 / 2 / 3 chuyển tab, N thêm thói quen, Esc đóng modal
    window.addEventListener('keydown', e => {
      const tag = document.activeElement?.tagName;
      const isTyping = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

      if (e.key === 'Escape') {
        this.closeAllModals();
        return;
      }

      if (isTyping) return;

      if (e.key === '1') {
        this.switchTab('today');
      } else if (e.key === '2') {
        this.switchTab('matrix');
      } else if (e.key === '3') {
        this.switchTab('calendar');
      } else if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        this.openHabitModal();
      }
    });

    // Lưu ngay khi tab chuyển sang hidden & kiểm tra cron khi quay lại
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.saveState(true);
      } else {
        this.checkAndRunCron();
        this.renderAll();
      }
    });

    // Đồng bộ khi mở nhiều tab (storage event)
    window.addEventListener('storage', e => {
      if (e.key === 'nhl_v4' && e.newValue) {
        try {
          this.state = JSON.parse(e.newValue);
          this.renderAll();
          showToast('Đồng Bộ Đa Tab', 'Dữ liệu vừa được cập nhật từ một tab khác.', 'cyan');
        } catch {
          // Ignore
        }
      }
    });

    // Cảnh báo beforeunload khi đồng hồ Pomodoro đang chạy
    window.addEventListener('beforeunload', e => {
      this.saveState(true);
      if (this.pomoRunning) {
        e.preventDefault();
        e.returnValue = '';
      }
    });

    // Sự kiện cài đặt PWA
    window.addEventListener('beforeinstallprompt', e => {
      e.preventDefault();
      this.deferredInstallPrompt = e;
      const btn = document.getElementById('pwa-install-btn');
      if (btn) {
        btn.classList.remove('hidden');
        btn.classList.add('flex');
      }
    });
  }

  switchTab(tabName) {
    this.activeTab = tabName;
    const panels = {
      today: document.getElementById('tab-panel-today'),
      matrix: document.getElementById('tab-panel-matrix'),
      calendar: document.getElementById('tab-panel-calendar')
    };

    Object.entries(panels).forEach(([k, el]) => {
      if (!el) return;
      if (k === tabName) el.classList.remove('hidden');
      else el.classList.add('hidden');
    });

    ['today', 'matrix', 'calendar'].forEach(k => {
      const dBtn = document.getElementById(`desk-tab-${k}`);
      const mBtn = document.getElementById(`mob-tab-${k}`);
      if (dBtn) {
        dBtn.className =
          k === tabName
            ? 'min-h-[42px] px-5 py-2 rounded-lg font-hud font-bold text-sm transition bg-sky-500 text-slate-950'
            : 'min-h-[42px] px-5 py-2 rounded-lg font-hud font-bold text-sm transition text-slate-300 hover:bg-slate-800/70';
      }
      if (mBtn) {
        mBtn.className =
          k === tabName
            ? 'min-h-[48px] rounded-lg font-hud font-bold text-xs flex flex-col items-center justify-center bg-sky-500 text-slate-950'
            : 'min-h-[48px] rounded-lg font-hud font-bold text-xs flex flex-col items-center justify-center text-slate-300';
      }
    });
  }

  setChartRange(days) {
    this.chartRange = days;
    [7, 14, 30].forEach(d => {
      const btn = document.getElementById(`chart-range-${d}`);
      if (!btn) return;
      btn.className =
        d === days
          ? 'min-h-[34px] px-3 py-1 rounded text-xs font-hud font-bold bg-sky-500 text-slate-950'
          : 'min-h-[34px] px-3 py-1 rounded text-xs font-hud font-bold text-slate-300';
    });
    renderEffortAnalyticsChart(this.state, this.getEffectiveTodayKey(), this.chartRange);
  }

  handleUrlShortcuts() {
    const params = new URLSearchParams(window.location.search);
    const act = params.get('action');
    if (act === 'new-habit') {
      this.openHabitModal();
    } else if (act === 'pomodoro') {
      this.openPomodoroModal();
    }
  }

  /* ==========================================================================
     HIỆU ỨNG HÌNH ẢNH & PWA SERVICE WORKER
     ========================================================================== */

  animateBossHit() {
    const card = document.getElementById('boss-raid-card');
    if (!card) return;
    card.classList.remove('boss-hit-anim');
    void card.offsetWidth;
    card.classList.add('boss-hit-anim');
  }

  triggerScreenShake() {
    const wrap = document.getElementById('app-wrapper');
    if (!wrap) return;
    wrap.classList.remove('shake-screen');
    void wrap.offsetWidth;
    wrap.classList.add('shake-screen');
  }

  fireConfetti() {
    if (typeof window.confetti === 'function') {
      window.confetti({
        particleCount: 75,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#10b981', '#f97316', '#f59e0b', '#38bdf8', '#818cf8']
      });
    }
  }

  registerServiceWorker() {
    if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
      navigator.serviceWorker
        .register('./sw.js')
        .then(reg => {
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            if (!newWorker) return;
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                showToast('Có Bản Cập Nhật Mới!', 'Phiên bản mới đã sẵn sàng — hãy tải lại trang để áp dụng.', 'cyan');
              }
            });
          });
        })
        .catch(() => {});
    }
  }

  async checkPwaUpdate() {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        await reg.update();
        showToast('Đã Kiểm Tra Cập Nhật PWA', 'Bạn đang sử dụng phiên bản mới nhất (v4.0 ULTIMATE).', 'emerald');
        return;
      }
    }
    showToast('Thông Tin Phiên Bản', 'Phiên bản v4.0 ULTIMATE đang hoạt động.', 'cyan');
  }

  async triggerInstallPwa() {
    if (!this.deferredInstallPrompt) return;
    this.deferredInstallPrompt.prompt();
    await this.deferredInstallPrompt.userChoice;
    this.deferredInstallPrompt = null;
    const btn = document.getElementById('pwa-install-btn');
    if (btn) btn.classList.add('hidden');
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.nhlApp = new SystemAppController();
});
