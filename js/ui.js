/**
 * SYSTEM: NGŨ HÀNH LEVELING v4.0 ULTIMATE
 * Module: js/ui.js — UI Renderer (Header HUD, 3 Tabs, Boss Card, Modals & Toasts)
 */

import {
  ELEMENTS,
  TITLES_CATALOG,
  INVENTORY_LIMITS,
  DEFAULT_PENALTY_QUESTS,
  addDays,
  diffDays,
  getDayOfWeekISO,
  getWeekStartKey,
  getWeekDateKeys,
  buildMonthGrid,
  isDateInRest,
  isHabitScheduledOnDate,
  isHabitCheckableOnDate,
  getWeeklyQuotaProgress,
  computeRadarAndBuffs,
  computeMaxHp,
  computePenaltyDamage,
  computeExhaustedStatus,
  computeDay,
  computeWeeklyBoss,
  computeHunterRank,
  computeGlobalStreak,
  computeHabitStreak,
  getMasteryTier,
  computeMonthlySummary
} from './engine.js';
import { getStorageUsageInfo } from './state.js';
import { formatShortVN, formatFullVN } from './charts.js';

export function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function getCheckinCellVisual(stateVal) {
  if (stateVal === 1) {
    return {
      symbol: '✓',
      className: 'cell-state-1',
      label: 'Hoàn thành chuẩn (100%)'
    };
  }
  if (stateVal === 0.5) {
    return {
      symbol: '½',
      className: 'cell-state-half',
      label: 'Nỗ lực tối thiểu (50% - Giữ Streak)'
    };
  }
  if (stateVal === 1.5) {
    return {
      symbol: '⚡',
      className: 'cell-state-overdrive',
      label: 'Bứt phá Overdrive (150% + x2 Vàng)'
    };
  }
  if (stateVal === 'freeze') {
    return {
      symbol: '🛡️',
      className: 'cell-state-freeze',
      label: 'Đóng băng Khiên Định Hồn (Giữ Streak)'
    };
  }
  return {
    symbol: '·',
    className: 'cell-state-0',
    label: 'Chưa làm (0%)'
  };
}

/* ============================================================================
   1. RENDER HEADER HUD & BANNERS (MỤC 3.1)
   ============================================================================ */

export function renderHeaderHUD(state, todayKey, nowMs = Date.now()) {
  const radar = computeRadarAndBuffs(state, todayKey);
  const maxHp = computeMaxHp(state, todayKey, radar);
  const exhausted = computeExhaustedStatus(state, todayKey);
  const inFlow = Number(state.flowUntil || 0) > nowMs;

  // Cập nhật thuộc tính trên <body> cho Danh hiệu, Exhausted, Flow, Penalty Zone
  const equippedTitleId = state.titles?.equipped || '';
  if (equippedTitleId) {
    document.body.setAttribute('data-title', equippedTitleId);
  } else {
    document.body.removeAttribute('data-title');
  }
  document.body.setAttribute('data-exhausted', exhausted ? 'true' : 'false');
  document.body.setAttribute('data-flow', inFlow ? 'true' : 'false');

  const isPenalty = (state.hp || 0) <= 0;
  if (isPenalty) {
    document.body.classList.add('penalty-zone-active');
  } else {
    document.body.classList.remove('penalty-zone-active');
  }

  // 1. Banner Chế độ Dev
  const devBanner = document.getElementById('dev-mode-banner');
  if (devBanner) {
    if (state.settings?.devMode) {
      devBanner.classList.remove('hidden');
      const lbl = document.getElementById('dev-virtual-date-label');
      if (lbl) lbl.textContent = `${formatFullVN(todayKey)} (Offset: ${state.settings.virtualDayOffset || 0} ngày)`;
    } else {
      devBanner.classList.add('hidden');
    }
  }

  // 2. Banner Dữ liệu mẫu 14 ngày
  const seedBanner = document.getElementById('seed-data-banner');
  const hasSeedDays = Object.values(state.days || {}).some(d => d.seed);
  if (seedBanner) {
    if (hasSeedDays && !state.settings?.seedBannerDismissed) {
      seedBanner.classList.remove('hidden');
    } else {
      seedBanner.classList.add('hidden');
    }
  }

  // 3. Banner Nghỉ Trọ (Rest Mode)
  const restBanner = document.getElementById('rest-mode-banner');
  const restActive = Boolean(state.rest?.active);
  if (restBanner) {
    if (restActive) {
      restBanner.classList.remove('hidden');
      const startLbl = document.getElementById('rest-start-date-label');
      if (startLbl) startLbl.textContent = formatShortVN(state.rest.startDate || todayKey);
    } else {
      restBanner.classList.add('hidden');
    }
  }

  // 4. Banner Penalty Zone (HP = 0)
  const penaltyBanner = document.getElementById('penalty-zone-banner');
  if (penaltyBanner) {
    if (isPenalty) {
      penaltyBanner.classList.remove('hidden');
      const quests =
        Array.isArray(state.settings?.penaltyQuests) && state.settings.penaltyQuests.length > 0
          ? state.settings.penaltyQuests
          : DEFAULT_PENALTY_QUESTS;
      const idx = (state.settings?.activePenaltyQuestIdx || 0) % quests.length;
      const qText = document.getElementById('penalty-quest-text');
      if (qText) qText.textContent = quests[idx];
    } else {
      penaltyBanner.classList.add('hidden');
    }
  }

  // Hạng Thợ Săn & Hiệu suất 7 ngày
  const rank = computeHunterRank(state, todayKey);
  const rankPill = document.getElementById('hud-rank-pill');
  const rankTitle = document.getElementById('hud-rank-title');
  const avg7El = document.getElementById('hud-avg7-pct');
  if (rankPill) rankPill.textContent = rank.code;
  if (rankTitle) rankTitle.textContent = rank.title;
  if (avg7El) avg7El.textContent = rank.calibrated ? `${rank.avgPct}%` : `Đang hiệu chuẩn (${rank.daysCount}/3 ngày)`;

  // Huy hiệu Danh hiệu đang trang bị
  const eqBadge = document.getElementById('hud-equipped-title-badge');
  if (eqBadge) {
    const tObj = TITLES_CATALOG.find(t => t.id === equippedTitleId);
    if (tObj) {
      eqBadge.textContent = `★ ${tObj.name}`;
      eqBadge.className = 'px-2 py-0.5 text-[11px] font-semibold rounded-full bg-amber-500/20 border border-amber-400/50 text-amber-200';
    } else {
      eqBadge.textContent = 'Chưa trang bị danh hiệu';
      eqBadge.className = 'px-2 py-0.5 text-[11px] font-semibold rounded-full bg-slate-800 border border-slate-700 text-slate-400';
    }
  }

  // Danh hiệu tuần khi Boss tuần đã hạ gục
  const bossNow = computeWeeklyBoss(state, todayKey);
  const bossBadge = document.getElementById('hud-weekly-boss-badge');
  if (bossBadge) {
    if (bossNow.killed) {
      bossBadge.classList.remove('hidden');
    } else {
      bossBadge.classList.add('hidden');
    }
  }

  // Thanh HP
  const hpVal = Math.max(0, Math.min(maxHp, Math.round(state.hp || 0)));
  const hpPct = maxHp > 0 ? Math.max(0, Math.min(100, Math.round((hpVal / maxHp) * 100))) : 0;
  const hpText = document.getElementById('hud-hp-text');
  const hpBar = document.getElementById('hud-hp-bar');
  if (hpText) hpText.textContent = `${hpVal} / ${maxHp} HP`;
  if (hpBar) {
    hpBar.style.width = `${hpPct}%`;
    if (hpPct <= 25) {
      hpBar.className = 'h-full rounded-full bg-gradient-to-r from-red-600 to-rose-500 transition-all duration-300';
    } else if (hpPct <= 60) {
      hpBar.className = 'h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-300';
    } else {
      hpBar.className = 'h-full rounded-full bg-gradient-to-r from-rose-500 via-emerald-500 to-teal-400 transition-all duration-300';
    }
  }

  // Thanh Khí Vận (Pity)
  const pityMax = equippedTitleId === 'chien_binh_ngu_hanh' ? 3 : 5;
  const pityEl = document.getElementById('hud-pity-text');
  if (pityEl) {
    pityEl.textContent = `${state.pity || 0}/${pityMax}`;
  }

  // Status Effects Badges (Exhausted / Flow)
  const statusContainer = document.getElementById('hud-status-badges');
  if (statusContainer) {
    const badges = [];
    if (exhausted) {
      badges.push(
        `<span class="px-2 py-0.5 rounded bg-red-500/20 border border-red-500/50 text-red-300 font-bold" title="3 ngày liên tiếp Mộc < 40%: Vàng x0.8. Hãy đạt Mộc ≥ 70% để xóa!">⚠️ Kiệt Sức (Vàng x0.8)</span>`
      );
    }
    if (inFlow) {
      const remMins = Math.max(1, Math.ceil((state.flowUntil - nowMs) / 60000));
      badges.push(
        `<span class="px-2 py-0.5 rounded bg-sky-500/20 border border-sky-400/50 text-sky-300 font-bold" title="Đang trong trạng thái Flow sau Pomodoro: Điểm & Vàng x1.25">⚡ Flow x1.25 (${remMins}p)</span>`
      );
    }
    if (badges.length === 0) {
      badges.push(`<span class="text-slate-400">Trạng thái: Bình thường</span>`);
    }
    statusContainer.innerHTML = badges.join('');
  }

  // Kho Tài Nguyên
  const goldEl = document.getElementById('hud-gold');
  const shieldEl = document.getElementById('hud-shields');
  const potionEl = document.getElementById('hud-potions');
  const streakEl = document.getElementById('hud-streak');

  if (goldEl) goldEl.textContent = Math.round(state.inventory?.gold || 0).toLocaleString('vi-VN');
  if (shieldEl) shieldEl.textContent = `${state.inventory?.shields || 0}/${INVENTORY_LIMITS.shields}`;
  if (potionEl) potionEl.textContent = `${state.inventory?.potions || 0}/${INVENTORY_LIMITS.potions}`;
  if (streakEl) streakEl.textContent = computeGlobalStreak(state, todayKey);

  // Năng lượng ngày & Nghỉ trọ
  const energySelect = document.getElementById('hud-energy-select');
  const todayEnergy = state.days?.[todayKey]?.energy === 'low' ? 'low' : 'full';
  if (energySelect) {
    energySelect.value = todayEnergy;
  }

  const restBtnLabel = document.getElementById('hud-rest-btn-label');
  const restBtn = document.getElementById('hud-rest-btn');
  if (restBtnLabel && restBtn) {
    if (restActive) {
      restBtnLabel.textContent = 'Đang Nghỉ Trọ (BẬT)';
      restBtn.className = 'min-h-[38px] px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-bold text-xs transition flex items-center gap-1.5';
    } else {
      restBtnLabel.textContent = 'Nghỉ Trọ: TẮT';
      restBtn.className = 'min-h-[38px] px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-indigo-500/40 text-indigo-300 text-xs font-semibold transition flex items-center gap-1.5';
    }
  }

  // Nút âm thanh
  const soundLbl = document.getElementById('hud-sound-label');
  const soundIcon = document.getElementById('hud-sound-icon');
  if (soundLbl && soundIcon) {
    if (state.settings?.soundEnabled !== false) {
      soundLbl.textContent = 'Âm Thanh: BẬT';
      soundIcon.className = 'fa-solid fa-volume-high text-sky-400';
    } else {
      soundLbl.textContent = 'Âm Thanh: TẮT';
      soundIcon.className = 'fa-solid fa-volume-xmark text-slate-500';
    }
  }
}

/* ============================================================================
   2. RENDER TAB 1: HÔM NAY (3 CỘT + BẢNG CHI TIẾT ĐIỂM)
   ============================================================================ */

export function renderTodayTab(state, todayKey) {
  const comp = computeDay(state, todayKey, { radarRefDateKey: todayKey });
  const dayEntries = state.days?.[todayKey]?.entries || {};

  // CỘT A: DAILIES HÔM NAY (gồm lịch hôm nay + thói quen quota còn thiếu hoặc đã tick hôm nay)
  const dailiesContainer = document.getElementById('today-dailies-list');
  const todayDailies = (state.habits || []).filter(h => {
    if (h.archived || h.kind !== 'daily') return false;
    if (h.schedule?.mode === 'quota') {
      const qProg = getWeeklyQuotaProgress(state, h, todayKey);
      const tickedToday = Boolean(dayEntries[h.id]?.state);
      return qProg.remaining > 0 || tickedToday;
    }
    return isHabitScheduledOnDate(h, todayKey);
  });

  if (dailiesContainer) {
    if (todayDailies.length === 0) {
      dailiesContainer.innerHTML = `
        <div class="py-6 text-center text-xs text-slate-400">
          Không có việc cố định nào có lịch hôm nay (Off-day). Bạn có thể bấm <strong>+ Thêm Daily</strong> để tạo mới.
        </div>
      `;
    } else {
      dailiesContainer.innerHTML = todayDailies
        .map(h => {
          const el = ELEMENTS[h.element];
          const parentEl = ELEMENTS[el.generatedBy];
          const hasTuongSinh = Boolean(comp.activeElementsMap[el.generatedBy]);
          const stVal = dayEntries[h.id]?.state ?? 0;
          const cellUI = getCheckinCellVisual(stVal);
          const masteryInfo = getMasteryTier(h.mastery ?? 0.3);
          const isQuota = h.schedule?.mode === 'quota';
          const qProg = isQuota ? getWeeklyQuotaProgress(state, h, todayKey) : null;

          return `
            <div class="pt-2.5 first:pt-0 flex items-center justify-between gap-2.5">
              <div class="flex items-start gap-2.5 min-w-0 flex-1">
                <button
                  type="button"
                  data-action="cycle-checkin"
                  data-habit-id="${h.id}"
                  data-date="${todayKey}"
                  class="quest-cell ${cellUI.className} shrink-0"
                  aria-label="Đánh dấu ${escapeHtml(h.name)}: ${cellUI.label}"
                  title="${cellUI.label} (Bấm để xoay vòng 5 mức)"
                >
                  ${cellUI.symbol}
                </button>

                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-1.5 flex-wrap">
                    <span class="px-1.5 py-0.5 rounded text-[11px] font-bold badge-${h.element}">
                      ${el.emoji} ${el.name}
                    </span>
                    <span class="font-semibold text-xs sm:text-sm text-white leading-snug">${escapeHtml(h.name)}</span>
                    <span class="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-[11px] font-hud font-bold text-sky-300">[+${h.weight}đ]</span>
                    ${
                      isQuota
                        ? `<span class="px-1.5 py-0.5 rounded bg-indigo-500/20 border border-indigo-400/40 text-indigo-300 text-[10px] font-hud font-bold">Quota ${qProg.doneCount}/${qProg.quotaTarget}</span>`
                        : ''
                    }
                  </div>

                  <div class="flex items-center gap-2 mt-1 flex-wrap text-[11px]">
                    <!-- Mastery % (vòng tròn nhỏ + nhãn bậc) -->
                    <span class="inline-flex items-center gap-1 text-slate-300" title="Thông thạo EMA: ${masteryInfo.pct}%">
                      <svg class="w-3.5 h-3.5 -rotate-90" viewBox="0 0 20 20">
                        <circle cx="10" cy="10" r="7" fill="none" stroke="#1e293b" stroke-width="3" />
                        <circle cx="10" cy="10" r="7" fill="none" stroke="${masteryInfo.color}" stroke-width="3" stroke-dasharray="44" stroke-dashoffset="${Math.round(44 * (1 - masteryInfo.pct / 100))}" />
                      </svg>
                      <span style="color:${masteryInfo.color}" class="font-semibold">${masteryInfo.pct}% ${masteryInfo.label}</span>
                    </span>

                    ${
                      hasTuongSinh
                        ? `<span class="px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 text-[10px] font-bold">[Tương Sinh +20%]</span>`
                        : `<span class="text-[10px] text-slate-400">Cần ${parentEl.emoji} ${parentEl.name} để +20%</span>`
                    }
                  </div>
                </div>
              </div>

              <div class="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  data-action="open-pomodoro-modal"
                  data-habit-id="${h.id}"
                  class="min-h-[38px] px-2.5 py-1 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/30 border border-indigo-400/40 text-indigo-300 text-xs font-hud font-bold"
                  aria-label="Tập trung Pomodoro cho ${escapeHtml(h.name)}"
                >
                  ⚔️ Focus
                </button>
                <button
                  type="button"
                  data-action="edit-habit"
                  data-habit-id="${h.id}"
                  class="w-8 h-8 rounded hover:bg-slate-800 text-slate-400 hover:text-sky-300 text-xs"
                  aria-label="Sửa ${escapeHtml(h.name)}"
                >
                  <i class="fa-solid fa-pen"></i>
                </button>
              </div>
            </div>
          `;
        })
        .join('');
    }
  }

  // Thanh tiến độ mục tiêu ngày ở cuối Cột A
  const progLabel = document.getElementById('today-progress-label');
  const progBar = document.getElementById('today-progress-bar');
  if (progLabel) {
    progLabel.textContent = `${comp.totalPoints} / ${comp.target} đ (${comp.ratioPct}%)`;
  }
  if (progBar) {
    const barW = comp.target > 0 ? Math.min(100, Math.round((comp.totalPoints / comp.target) * 100)) : 100;
    progBar.style.width = `${barW}%`;
  }

  // CỘT B: THÓI QUEN PHẢN XẠ [+] & GIỚI LUẬT [-]
  const plusContainer = document.getElementById('today-plus-list');
  const plusHabits = (state.habits || []).filter(h => !h.archived && h.kind === 'plus');
  if (plusContainer) {
    plusContainer.innerHTML = plusHabits
      .map(h => {
        const el = ELEMENTS[h.element];
        const count = Number(dayEntries[h.id]?.count || 0);
        const maxPerDay = Number(h.maxPerDay || 10);
        const rem = Math.max(0, maxPerDay - count);
        return `
          <div class="bg-slate-900/85 border border-sky-500/30 rounded-xl p-2.5 flex items-center justify-between gap-2">
            <div class="flex items-center gap-2.5 min-w-0">
              <button
                type="button"
                data-action="trigger-plus"
                data-habit-id="${h.id}"
                class="min-w-[44px] min-h-[44px] rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-hud font-bold text-lg flex items-center justify-center shadow"
                aria-label="Cộng 1 lần ${escapeHtml(h.name)}"
              >
                +${h.weight}
              </button>
              <div class="min-w-0">
                <div class="font-semibold text-xs sm:text-sm text-white truncate">${el.emoji} ${escapeHtml(h.name)}</div>
                <div class="text-[11px] text-slate-400">
                  Hôm nay: <strong class="text-sky-300 font-hud">x${count}</strong> • Còn <strong class="text-emerald-300">${rem}</strong> lượt có điểm
                </div>
              </div>
            </div>
            <div class="flex items-center gap-1 shrink-0">
              <button type="button" data-action="edit-habit" data-habit-id="${h.id}" class="p-1.5 text-slate-400 hover:text-sky-300 text-xs" aria-label="Sửa ${escapeHtml(h.name)}"><i class="fa-solid fa-pen"></i></button>
              <button type="button" data-action="delete-habit" data-habit-id="${h.id}" class="p-1.5 text-slate-400 hover:text-rose-400 text-xs" aria-label="Xóa ${escapeHtml(h.name)}"><i class="fa-solid fa-trash"></i></button>
            </div>
          </div>
        `;
      })
      .join('');
  }

  const minusContainer = document.getElementById('today-minus-list');
  const minusHabits = (state.habits || []).filter(h => !h.archived && h.kind === 'minus');
  if (minusContainer) {
    minusContainer.innerHTML = minusHabits
      .map(h => {
        const count = Number(dayEntries[h.id]?.count || 0);
        const actualDmg = computePenaltyDamage(state, Number(h.damage || 5), todayKey);
        return `
          <div class="bg-slate-900/85 border border-rose-500/35 rounded-xl p-2.5 flex items-center justify-between gap-2">
            <div class="flex items-center gap-2.5 min-w-0">
              <button
                type="button"
                data-action="trigger-minus"
                data-habit-id="${h.id}"
                class="min-w-[44px] min-h-[44px] rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-hud font-bold text-sm flex items-center justify-center shadow"
                aria-label="Ghi nhận vi phạm ${escapeHtml(h.name)} trừ ${actualDmg} HP"
              >
                -${actualDmg}HP
              </button>
              <div class="min-w-0">
                <div class="font-semibold text-xs sm:text-sm text-rose-200 truncate">${escapeHtml(h.name)}</div>
                <div class="text-[11px] text-slate-400">
                  Vi phạm hôm nay: <strong class="text-rose-400 font-hud">x${count}</strong> (Gốc -${h.damage || 5} HP)
                </div>
              </div>
            </div>
            <div class="flex items-center gap-1 shrink-0">
              <button type="button" data-action="edit-habit" data-habit-id="${h.id}" class="p-1.5 text-slate-400 hover:text-sky-300 text-xs" aria-label="Sửa ${escapeHtml(h.name)}"><i class="fa-solid fa-pen"></i></button>
              <button type="button" data-action="delete-habit" data-habit-id="${h.id}" class="p-1.5 text-slate-400 hover:text-rose-400 text-xs" aria-label="Xóa ${escapeHtml(h.name)}"><i class="fa-solid fa-trash"></i></button>
            </div>
          </div>
        `;
      })
      .join('');
  }

  // CỘT C: TO-DOS & DEADLINES
  // Lọc các To-Do hiển thị ở Tab Hôm Nay (nếu scheduled=true mà due > todayKey thì đợi đến ngày hoặc vẫn hiển thị theo hạn)
  const todosContainer = document.getElementById('today-todos-list');
  if (todosContainer) {
    const visibleTodos = [...(state.todos || [])].sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      const dueA = a.due || '9999-12-31';
      const dueB = b.due || '9999-12-31';
      return dueA.localeCompare(dueB);
    });

    if (visibleTodos.length === 0) {
      todosContainer.innerHTML = `<div class="py-4 text-center text-xs text-slate-500">Chưa có việc phát sinh nào.</div>`;
    } else {
      todosContainer.innerHTML = visibleTodos
        .map(t => {
          const el = ELEMENTS[t.element || 'KIM'] || ELEMENTS.KIM;
          const isOverdue = !t.done && t.due && t.due < todayKey;
          const isDueToday = !t.done && t.due === todayKey;

          let borderClass = 'border-slate-800 bg-slate-900/80';
          let dueBadge = '';
          if (isOverdue) {
            borderClass = 'border-red-500/60 bg-red-950/35';
            dueBadge = `<span class="px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 text-[10px] font-bold">Quá hạn: ${formatShortVN(t.due)} (x0.5)</span>`;
          } else if (isDueToday) {
            borderClass = 'border-amber-500/60 bg-amber-950/30';
            dueBadge = `<span class="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold">Hạn hôm nay (${formatShortVN(t.due)})</span>`;
          } else if (t.due) {
            dueBadge = `<span class="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]">Hạn: ${formatShortVN(t.due)}</span>`;
          }

          return `
            <div class="rounded-xl border p-2.5 flex items-center justify-between gap-2 ${borderClass}">
              <div class="flex items-center gap-2.5 min-w-0">
                <button
                  type="button"
                  data-action="toggle-todo"
                  data-todo-id="${t.id}"
                  class="min-w-[38px] min-h-[38px] rounded-lg border flex items-center justify-center font-bold text-sm ${
                    t.done
                      ? 'bg-emerald-500/30 border-emerald-400 text-emerald-300'
                      : 'bg-slate-950 border-slate-700 text-slate-400 hover:border-sky-400'
                  }"
                  aria-label="Đánh dấu hoàn thành ${escapeHtml(t.title)}"
                >
                  ${t.done ? '✓' : ''}
                </button>
                <div class="min-w-0">
                  <div class="text-xs sm:text-sm font-semibold ${t.done ? 'line-through text-slate-500' : 'text-white'} truncate">
                    ${el.emoji} ${escapeHtml(t.title)}
                  </div>
                  <div class="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    <span class="text-[11px] font-hud font-bold text-sky-300">[+${t.weight}đ]</span>
                    ${dueBadge}
                  </div>
                </div>
              </div>
              <button
                type="button"
                data-action="delete-todo"
                data-todo-id="${t.id}"
                class="p-1.5 text-slate-400 hover:text-rose-400 text-xs shrink-0"
                aria-label="Xóa việc phát sinh ${escapeHtml(t.title)}"
              >
                <i class="fa-solid fa-trash"></i>
              </button>
            </div>
          `;
        })
        .join('');
    }
  }

  // BẢNG CHI TIẾT ĐIỂM HÔM NAY
  const totalPtsEl = document.getElementById('breakdown-total-points');
  const totalGoldEl = document.getElementById('breakdown-total-gold');
  const breakdownTbody = document.getElementById('today-breakdown-tbody');

  if (totalPtsEl) totalPtsEl.textContent = `${comp.totalPoints} đ`;
  if (totalGoldEl) totalGoldEl.textContent = `+${comp.totalGold}`;

  if (breakdownTbody) {
    if (comp.breakdown.length === 0) {
      breakdownTbody.innerHTML = `
        <tr>
          <td colspan="7" class="py-5 text-center text-slate-400">
            Chưa có mục nào được hoàn thành hôm nay. Hãy đánh dấu hoàn thành nhiệm vụ ở 3 cột phía trên để xem bảng giải trình hệ số điểm & Vàng!
          </td>
        </tr>
      `;
    } else {
      breakdownTbody.innerHTML = comp.breakdown
        .map(row => {
          const el = ELEMENTS[row.element];
          const elBadge = el
            ? `<span class="px-1.5 py-0.5 rounded text-[11px] font-bold badge-${row.element}">${el.emoji} ${el.name}</span>`
            : `<span class="px-1.5 py-0.5 rounded text-[11px] font-bold bg-fuchsia-500/20 text-fuchsia-300">⚡ Hợp Nhất</span>`;

          return `
            <tr class="hover:bg-slate-900/50">
              <td class="py-2.5 px-3 font-semibold text-white">${escapeHtml(row.name)}</td>
              <td class="py-2.5 px-2">${elBadge}</td>
              <td class="py-2.5 px-2 text-right font-hud text-slate-300">${row.basePoints} đ</td>
              <td class="py-2.5 px-2 text-right font-hud text-amber-300">x${row.mult}</td>
              <td class="py-2.5 px-2 text-right font-hud font-bold text-sky-300">+${row.finalPoints} đ</td>
              <td class="py-2.5 px-2 text-right font-hud font-bold text-amber-400">+${Math.round(row.gold)} <i class="fa-solid fa-coins"></i></td>
              <td class="py-2.5 px-3 text-[11px] text-emerald-300">${
                row.factors && row.factors.length > 0
                  ? row.factors.map(f => escapeHtml(f)).join(' • ')
                  : 'Chuẩn x1.0'
              }</td>
            </tr>
          `;
        })
        .join('');
    }
  }
}

/* ============================================================================
   3. RENDER TAB 2: MA TRẬN TUẦN (7 NGÀY x DAILIES, STICKY COL, OFF-DAY, QUOTA)
   ============================================================================ */

export function renderWeeklyMatrixTab(state, todayKey, weekOffset = 0, elementFilter = 'ALL') {
  const baseMonday = getWeekStartKey(todayKey);
  const targetMonday = addDays(baseMonday, weekOffset * 7);
  const weekKeys = getWeekDateKeys(targetMonday);

  const weekLbl = document.getElementById('matrix-week-label');
  if (weekLbl) {
    weekLbl.textContent = `${formatShortVN(weekKeys[0])} ➔ ${formatShortVN(weekKeys[6])}`;
  }

  const theadRow = document.getElementById('matrix-thead-row');
  const dayNames = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

  if (theadRow) {
    theadRow.innerHTML = `
      <th class="py-3 px-3 min-w-[230px] sticky-habit-col">Nhiệm Vụ Daily</th>
      <th class="py-3 px-2 text-center">Focus</th>
      ${weekKeys
        .map((dk, i) => {
          const isToday = dk === todayKey;
          const hasNote = Boolean(state.days?.[dk]?.note);
          return `
            <th class="py-2.5 px-1.5 text-center ${
              isToday ? 'bg-sky-500/15 border-b-2 border-sky-400 text-sky-300' : ''
            }">
              <div class="flex flex-col items-center">
                <span>${dayNames[i]}</span>
                <span class="text-[10px] font-normal text-slate-400">${formatShortVN(dk)}</span>
                <button
                  type="button"
                  data-action="open-day-detail"
                  data-date="${dk}"
                  class="mt-0.5 text-xs ${hasNote ? 'text-amber-400' : 'text-slate-500 hover:text-white'}"
                  aria-label="Mở nhật ký ngày ${dk}"
                >
                  📝
                </button>
              </div>
            </th>
          `;
        })
        .join('')}
      <th class="py-3 px-2 text-center">Streak</th>
      <th class="py-3 px-2 text-right">Sửa/Xóa</th>
    `;
  }

  const dailies = (state.habits || []).filter(
    h => !h.archived && h.kind === 'daily' && (elementFilter === 'ALL' || h.element === elementFilter)
  );

  const tbody = document.getElementById('matrix-tbody');
  if (!tbody) return;

  if (dailies.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="11" class="py-8 text-center text-slate-400">
          Không có thói quen Daily nào thuộc bộ lọc này.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = dailies
    .map(habit => {
      const el = ELEMENTS[habit.element];
      const streak = computeHabitStreak(state, habit.id, todayKey);
      const isQuota = habit.schedule?.mode === 'quota';
      const qProg = isQuota ? getWeeklyQuotaProgress(state, habit, targetMonday) : null;

      return `
        <tr class="hover:bg-slate-900/50">
          <td class="py-3 px-3 sticky-habit-col">
            <div class="flex items-start gap-2">
              <span class="px-2 py-0.5 rounded text-xs font-bold badge-${habit.element} shrink-0">
                ${el.emoji} ${el.name}
              </span>
              <div class="min-w-0">
                <div class="font-semibold text-white text-xs sm:text-sm leading-snug">
                  ${escapeHtml(habit.name)}
                  <span class="text-[11px] font-hud font-bold text-sky-300 ml-1">[+${habit.weight}đ]</span>
                </div>
                <div class="text-[11px] text-slate-400 mt-0.5">
                  ${
                    isQuota
                      ? `<span class="text-indigo-300 font-semibold">Quota tuần: ${qProg.doneCount}/${qProg.quotaTarget} lần</span>`
                      : habit.schedule?.mode === 'days'
                      ? `Lịch cố định (${habit.schedule.days.length} ngày/tuần)`
                      : 'Hằng ngày'
                  }
                </div>
              </div>
            </div>
          </td>

          <td class="py-2.5 px-2 text-center">
            <button
              type="button"
              data-action="open-pomodoro-modal"
              data-habit-id="${habit.id}"
              class="min-h-[38px] px-2.5 py-1 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/30 border border-indigo-400/40 text-indigo-300 text-xs font-hud font-bold whitespace-nowrap"
              aria-label="Focus 25p cho ${escapeHtml(habit.name)}"
            >
              ⚔️ 25p
            </button>
          </td>

          ${weekKeys
            .map(dk => {
              const isFuture = dk > todayKey;
              const ageDays = diffDays(dk, todayKey);
              const tooOld = ageDays > 30;
              const checkable = isHabitCheckableOnDate(habit, dk);
              const stVal = state.days?.[dk]?.entries?.[habit.id]?.state ?? 0;

              if (isFuture || tooOld) {
                return `
                  <td class="py-2 px-1.5 text-center">
                    <button type="button" disabled class="quest-cell cell-future" title="${
                      isFuture ? 'Ngày tương lai chưa thể check-in' : 'Quá 30 ngày không thể sửa'
                    }" aria-label="Không khả dụng">—</button>
                  </td>
                `;
              }

              if (!checkable) {
                return `
                  <td class="py-2 px-1.5 text-center">
                    <button type="button" disabled class="quest-cell cell-offday" title="Ngày không có lịch (Off-day): không phạt, giữ Streak" aria-label="Off-day">╱</button>
                  </td>
                `;
              }

              const cellUI = getCheckinCellVisual(stVal);
              return `
                <td class="py-2 px-1.5 text-center">
                  <button
                    type="button"
                    data-action="cycle-checkin"
                    data-habit-id="${habit.id}"
                    data-date="${dk}"
                    class="quest-cell ${cellUI.className}"
                    title="${cellUI.label} (${formatShortVN(dk)})"
                    aria-label="${escapeHtml(habit.name)} ngày ${dk}: ${cellUI.label}"
                  >
                    ${cellUI.symbol}
                  </button>
                </td>
              `;
            })
            .join('')}

          <td class="py-2.5 px-2 text-center">
            <span class="px-2.5 py-1 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-300 font-hud font-bold text-xs">
              🔥 ${streak}
            </span>
          </td>

          <td class="py-2.5 px-2 text-right whitespace-nowrap">
            <button type="button" data-action="edit-habit" data-habit-id="${habit.id}" class="p-2 text-slate-400 hover:text-sky-300" aria-label="Sửa ${escapeHtml(habit.name)}">
              <i class="fa-solid fa-pen-to-square"></i>
            </button>
            <button type="button" data-action="delete-habit" data-habit-id="${habit.id}" class="p-2 text-slate-400 hover:text-rose-400" aria-label="Xóa ${escapeHtml(habit.name)}">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </td>
        </tr>
      `;
    })
    .join('');
}

/* ============================================================================
   4. RENDER TAB 3: LỊCH THÁNG VẠN NIÊN & BẢNG TỔNG KẾT THÁNG
   ============================================================================ */

export function renderMonthlyCalendarTab(state, todayKey, calYear, calMonth) {
  const grid = buildMonthGrid(calYear, calMonth);
  const titleEl = document.getElementById('cal-month-title');
  if (titleEl) {
    titleEl.textContent = `THÁNG ${String(calMonth).padStart(2, '0')} / ${calYear} (${grid.daysInMonth} NGÀY)`;
  }

  const cellsContainer = document.getElementById('calendar-grid-cells');
  if (cellsContainer) {
    cellsContainer.innerHTML = grid.cells
      .map(cell => {
        const dk = cell.dateKey;
        const isToday = dk === todayKey;
        const isFuture = dk > todayKey;
        const hasLog = Boolean(state.days?.[dk]);
        const comp = computeDay(state, dk, { radarRefDateKey: todayKey });
        const note = state.days?.[dk]?.note || '';
        const dueTodosCount = (state.todos || []).filter(t => t.due === dk && !t.done).length;

        let bgClass = 'bg-slate-900/60 border-slate-800';
        if (!cell.inCurrentMonth) {
          bgClass = 'bg-slate-950/35 border-slate-900 opacity-50';
        } else if (comp.isRestDay) {
          bgClass = 'cell-offday border-indigo-500/40';
        } else if (!isFuture && hasLog && comp.ratioPct >= 100) {
          bgClass = 'bg-emerald-950/60 border-emerald-500/50';
        } else if (!isFuture && hasLog && comp.ratioPct >= 50) {
          bgClass = 'bg-sky-950/50 border-sky-500/40';
        } else if (!isFuture && hasLog && comp.totalPoints > 0) {
          bgClass = 'bg-amber-950/40 border-amber-500/40';
        }

        if (isToday) {
          bgClass += ' ring-2 ring-sky-400';
        }

        const actionType = isFuture ? 'open-schedule-quest' : 'open-day-detail';

        return `
          <button
            type="button"
            data-action="${actionType}"
            data-date="${dk}"
            class="min-h-[76px] sm:min-h-[90px] p-2 rounded-xl border text-left flex flex-col justify-between transition hover:border-sky-400 ${bgClass}"
            aria-label="Ngày ${dk}: ${isFuture ? 'Đặt lịch Schedule Quest' : comp.totalPoints + ' điểm'}"
          >
            <div class="flex items-center justify-between w-full">
              <span class="font-hud font-bold text-xs sm:text-sm ${
                isToday ? 'text-sky-300' : cell.inCurrentMonth ? 'text-white' : 'text-slate-500'
              }">
                ${cell.dayNumber}
              </span>
              <div class="flex items-center gap-1">
                ${note ? '<span class="text-[11px]" title="Có nhật ký">📝</span>' : ''}
                ${
                  dueTodosCount > 0
                    ? `<span class="px-1.5 py-0.5 rounded bg-amber-500/25 border border-amber-400/50 text-amber-300 text-[10px] font-bold" title="${dueTodosCount} hạn chót">${dueTodosCount} Hạn</span>`
                    : ''
                }
              </div>
            </div>

            <div class="w-full mt-1">
              ${
                !isFuture && (hasLog || isToday)
                  ? `
                    <div class="text-[11px] font-hud font-bold ${
                      comp.ratioPct >= 100 ? 'text-emerald-300' : 'text-sky-300'
                    }">
                      ${comp.totalPoints} đ <span class="text-[10px] font-normal text-slate-400">(${comp.ratioPct}%)</span>
                    </div>
                  `
                  : isFuture
                  ? `<div class="text-[10px] text-indigo-300/80">+ Hẹn Quest</div>`
                  : `<div class="text-[10px] text-slate-600">—</div>`
              }
            </div>
          </button>
        `;
      })
      .join('');
  }

  // Bảng Tổng Kết Tháng (so sánh tháng đang xem và 4 tháng liền trước kèm mũi tên tăng/giảm)
  const summaryTbody = document.getElementById('monthly-summary-tbody');
  if (summaryTbody) {
    const monthsList = [];
    let y = calYear;
    let m = calMonth;
    for (let i = 0; i < 5; i++) {
      monthsList.push(computeMonthlySummary(state, y, m));
      m -= 1;
      if (m < 1) {
        m = 12;
        y -= 1;
      }
    }

    summaryTbody.innerHTML = monthsList
      .map((item, idx) => {
        const prev = monthsList[idx + 1];
        const diffArrow = (curVal, prevVal) => {
          if (!prev) return '';
          if (curVal > prevVal) return `<span class="text-emerald-400 ml-1">▲</span>`;
          if (curVal < prevVal) return `<span class="text-rose-400 ml-1">▼</span>`;
          return `<span class="text-slate-500 ml-1">•</span>`;
        };

        return `
          <tr class="hover:bg-slate-900/50">
            <td class="py-2.5 px-3 font-hud font-bold text-sky-300">${item.label}</td>
            <td class="py-2.5 px-3 text-right font-hud font-bold text-white">
              ${item.totalPoints} đ ${diffArrow(item.totalPoints, prev?.totalPoints)}
            </td>
            <td class="py-2.5 px-3 text-right font-hud text-emerald-300">
              ${item.avgPct}% ${diffArrow(item.avgPct, prev?.avgPct)}
            </td>
            <td class="py-2.5 px-3 text-right font-hud text-slate-200">
              ${item.safeDaysCount} ngày ${diffArrow(item.safeDaysCount, prev?.safeDaysCount)}
            </td>
            <td class="py-2.5 px-3 text-right font-hud text-orange-300">
              🔥 ${item.longestStreak} ngày
            </td>
            <td class="py-2.5 px-3 text-right font-hud text-fuchsia-300">
              ⚡ ${item.harmonyCount} lần
            </td>
            <td class="py-2.5 px-3 text-right font-hud text-amber-300">
              ${item.bossKills} Boss
            </td>
          </tr>
        `;
      })
      .join('');
  }
}

/* ============================================================================
   5. RENDER BOSS HẦM NGỤC TUẦN (MỤC 5.14)
   ============================================================================ */

export function renderBossRaidCard(state, todayKey, floatingDmg = null) {
  const boss = computeWeeklyBoss(state, todayKey);
  const isoDay = getDayOfWeekISO(todayKey);
  const daysLeft = 7 - isoDay;

  const nameEl = document.getElementById('boss-name-heading');
  const countdownEl = document.getElementById('boss-countdown-label');
  const hpLbl = document.getElementById('boss-hp-label');
  const hpBar = document.getElementById('boss-hp-bar');
  const dmgLbl = document.getElementById('boss-damage-dealt');
  const statusBadge = document.getElementById('boss-status-badge');
  const floatEl = document.getElementById('boss-floating-dmg');

  if (nameEl) nameEl.textContent = boss.name;
  if (countdownEl) {
    if (state.rest?.active) {
      countdownEl.textContent = 'Đang tạm dừng do Nghỉ Trọ (Rest Mode)';
    } else if (boss.killed) {
      countdownEl.textContent = 'Đã bị tiêu diệt trong tuần này!';
    } else {
      countdownEl.textContent =
        daysLeft === 0
          ? 'Hôm nay là Chủ Nhật — Ngày cuối cùng kết liễu Boss!'
          : `Còn ${daysLeft} ngày tới hạn Chủ Nhật`;
    }
  }

  if (hpLbl) hpLbl.textContent = `${boss.remainingHp} / ${boss.maxHp} HP`;
  if (hpBar) hpBar.style.width = `${boss.hpPct}%`;
  if (dmgLbl) dmgLbl.textContent = `${boss.damage} đ`;

  if (statusBadge) {
    if (boss.killed) {
      statusBadge.textContent = 'ĐÃ HẠ GỤC (+200 VÀNG)';
      statusBadge.className = 'px-2.5 py-0.5 rounded text-xs font-hud font-bold bg-emerald-500/20 border border-emerald-400/50 text-emerald-300';
    } else if (state.rest?.active) {
      statusBadge.textContent = 'TẠM DỪNG (NGHỈ TRỌ)';
      statusBadge.className = 'px-2.5 py-0.5 rounded text-xs font-hud font-bold bg-indigo-500/20 border border-indigo-400/50 text-indigo-300';
    } else {
      statusBadge.textContent = 'ĐANG GIAO CHIẾN';
      statusBadge.className = 'px-2.5 py-0.5 rounded text-xs font-hud font-bold bg-rose-500/20 border border-rose-500/50 text-rose-300';
    }
  }

  if (floatEl && floatingDmg !== null && floatingDmg !== 0) {
    const sign = floatingDmg > 0 ? '-' : '+';
    floatEl.textContent = `${sign}${Math.abs(floatingDmg)} HP!`;
    setTimeout(() => {
      if (floatEl) floatEl.textContent = '';
    }, 1800);
  }

  const logEl = document.getElementById('boss-combat-log');
  if (logEl) {
    const todayComp = computeDay(state, todayKey, { radarRefDateKey: todayKey });
    const lines = [
      `<div>• Tổng sát thương tuần (${formatShortVN(boss.weekDates[0])} ➔ ${formatShortVN(boss.weekDates[6])}): <strong class="text-amber-300">${boss.damage} đ</strong></div>`,
      `<div>• Sát thương hôm nay: <strong class="text-sky-300">${todayComp.totalPoints} đ</strong></div>`
    ];
    if (boss.killed) {
      lines.unshift(`<div class="text-emerald-400 font-semibold">★ Đã tiêu diệt [${escapeHtml(boss.name)}]! Nhận +200 Vàng & Danh hiệu tuần.</div>`);
    }
    logEl.innerHTML = lines.join('');
  }
}

/* ============================================================================
   6. RENDER CÁC MODAL (SHOP, CÀI ĐẶT, CHI TIẾT NGÀY, CRON RECAP, TOAST)
   ============================================================================ */

export function renderShopModalContent(state, todayKey) {
  const isPenalty = (state.hp || 0) <= 0;
  const goldEl = document.getElementById('shop-gold-balance');
  const shieldEl = document.getElementById('shop-shield-qty');
  const potionEl = document.getElementById('shop-potion-qty');
  const lockBanner = document.getElementById('shop-penalty-lock-banner');

  if (goldEl) goldEl.textContent = Math.round(state.inventory?.gold || 0).toLocaleString('vi-VN');
  if (shieldEl) shieldEl.textContent = state.inventory?.shields || 0;
  if (potionEl) potionEl.textContent = state.inventory?.potions || 0;
  if (lockBanner) {
    if (isPenalty) lockBanner.classList.remove('hidden');
    else lockBanner.classList.add('hidden');
  }

  const rewardsList = document.getElementById('shop-rewards-list');
  if (rewardsList) {
    rewardsList.innerHTML = (state.rewards || [])
      .map(rw => {
        return `
          <div class="bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex items-center justify-between gap-2">
            <div class="min-w-0">
              <div class="font-semibold text-white text-xs sm:text-sm truncate">${escapeHtml(rw.title)}</div>
              <div class="text-xs font-hud font-bold text-amber-400 mt-0.5"><i class="fa-solid fa-coins"></i> ${rw.cost} Vàng</div>
            </div>
            <div class="flex items-center gap-1 shrink-0">
              <button
                type="button"
                data-action="buy-custom-reward"
                data-reward-id="${rw.id}"
                ${isPenalty ? 'disabled' : ''}
                class="min-h-[38px] px-3 py-1.5 rounded-lg font-hud font-bold text-xs ${
                  isPenalty
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-red-500/30'
                    : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                }"
              >
                ${isPenalty ? '🔒 Khóa Phạt' : 'Mua'}
              </button>
              <button type="button" data-action="edit-custom-reward" data-reward-id="${rw.id}" class="p-1.5 text-slate-400 hover:text-sky-300 text-xs" aria-label="Sửa ${escapeHtml(rw.title)}">
                <i class="fa-solid fa-pen"></i>
              </button>
              <button type="button" data-action="delete-custom-reward" data-reward-id="${rw.id}" class="p-1.5 text-slate-400 hover:text-rose-400 text-xs" aria-label="Xóa ${escapeHtml(rw.title)}">
                <i class="fa-solid fa-trash"></i>
              </button>
            </div>
          </div>
        `;
      })
      .join('');
  }

  // Tính tổng chi tiêu tuần này
  const weekMondayTs = new Date(getWeekStartKey(todayKey) + 'T00:00:00').getTime();
  let weeklySpend = 0;
  for (const h of state.history || []) {
    if (h.ts >= weekMondayTs && h.delta < 0) {
      weeklySpend += Math.abs(h.delta);
    }
  }
  const weeklySpendEl = document.getElementById('shop-weekly-spend');
  if (weeklySpendEl) weeklySpendEl.textContent = weeklySpend.toLocaleString('vi-VN');

  const histContainer = document.getElementById('shop-history-container');
  if (histContainer) {
    if (!state.history || state.history.length === 0) {
      histContainer.innerHTML = `<div class="text-slate-500 text-center py-3">Chưa có giao dịch nào.</div>`;
    } else {
      histContainer.innerHTML = state.history
        .slice(0, 40)
        .map(item => {
          const dt = new Date(item.ts || Date.now());
          const timeStr = `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')} ${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
          const color =
            item.type === 'god'
              ? 'text-fuchsia-300'
              : item.delta < 0
              ? 'text-amber-300'
              : 'text-emerald-300';
          return `
            <div class="flex items-center justify-between border-b border-slate-900 pb-1 gap-2">
              <span class="${color}">${escapeHtml(item.label)}</span>
              <span class="text-[10px] text-slate-500 shrink-0">${timeStr}</span>
            </div>
          `;
        })
        .join('');
    }
  }
}

export function renderSettingsModalContent(state, todayKey, isPersisted = false) {
  // 1. Danh hiệu
  const titlesGrid = document.getElementById('settings-titles-grid');
  const unlockedSet = new Set(state.titles?.unlocked || []);
  const equipped = state.titles?.equipped || null;

  if (titlesGrid) {
    titlesGrid.innerHTML = TITLES_CATALOG.map(t => {
      const isUnlocked = unlockedSet.has(t.id);
      const isEquipped = equipped === t.id;
      const prog = state.titles?.progress?.[t.id] ?? 0;

      return `
        <div class="rounded-xl border p-3 flex items-center justify-between gap-2 ${
          isEquipped
            ? 'border-amber-400 bg-amber-950/25'
            : isUnlocked
            ? 'border-sky-500/40 bg-slate-950/80'
            : 'border-slate-800 bg-slate-950/40 opacity-75'
        }">
          <div class="min-w-0">
            <div class="font-hud font-bold text-xs sm:text-sm text-white flex items-center gap-1.5">
              <span>${isUnlocked ? '★' : '🔒'} ${escapeHtml(t.name)}</span>
              <span class="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-sky-300">${prog}/${t.target}</span>
            </div>
            <div class="text-[11px] text-slate-400 mt-0.5">${escapeHtml(t.conditionDesc)}</div>
            <div class="text-[11px] text-emerald-300 font-medium mt-0.5">Perk: ${escapeHtml(t.perkDesc)}</div>
          </div>
          <button
            type="button"
            data-action="equip-title"
            data-title-id="${t.id}"
            ${!isUnlocked ? 'disabled' : ''}
            class="min-h-[36px] px-3 py-1 rounded-lg font-hud font-bold text-xs shrink-0 ${
              isEquipped
                ? 'bg-amber-400 text-slate-950'
                : isUnlocked
                ? 'bg-sky-500 hover:bg-sky-400 text-slate-950'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }"
          >
            ${isEquipped ? 'Đang dùng' : isUnlocked ? 'Trang bị' : 'Chưa mở'}
          </button>
        </div>
      `;
    }).join('');
  }

  // 2. Âm thanh & Ambient
  const masterVol = document.getElementById('settings-master-vol');
  const ambType = document.getElementById('settings-ambient-type');
  const ambVol = document.getElementById('settings-ambient-vol');
  if (masterVol) masterVol.value = state.settings?.masterVolume ?? 0.8;
  if (ambType) ambType.value = state.settings?.ambientType || 'none';
  if (ambVol) ambVol.value = state.settings?.ambientVolume ?? 0.45;

  // 3. God Mode
  const devChk = document.getElementById('god-dev-mode');
  if (devChk) devChk.checked = Boolean(state.settings?.devMode);

  document.getElementById('god-gold').value = Math.round(state.inventory?.gold || 0);
  document.getElementById('god-hp').value = Math.round(state.hp || 0);
  document.getElementById('god-shields').value = state.inventory?.shields || 0;
  document.getElementById('god-potions').value = state.inventory?.potions || 0;
  document.getElementById('god-safe-threshold').value = Math.round((state.settings?.safeThreshold ?? 0.5) * 100);
  document.getElementById('god-gold-per-point').value = state.settings?.goldPerPoint ?? 5;
  document.getElementById('god-gold-mult').value = state.settings?.goldMultiplier ?? 1.0;
  document.getElementById('god-maxhp-bonus').value = state.settings?.maxHpBonus ?? 0;

  const bossNow = computeWeeklyBoss(state, todayKey);
  document.getElementById('god-boss-name').value = bossNow.name;
  document.getElementById('god-penalty-quests').value = (
    state.settings?.penaltyQuests || DEFAULT_PENALTY_QUESTS
  ).join('\n');

  // 4. Thông tin dung lượng lưu trữ
  const storageInfo = getStorageUsageInfo();
  const sizeEl = document.getElementById('settings-storage-size');
  const persistEl = document.getElementById('settings-persist-status');
  if (sizeEl) {
    sizeEl.textContent = `${storageInfo.kb} KB (${storageInfo.mb} MB)`;
    if (storageInfo.warning) {
      sizeEl.className = 'text-red-400 font-bold';
    }
  }
  if (persistEl) {
    persistEl.textContent = isPersisted ? 'Đã bảo vệ bền vững (Persisted)' : 'Tiêu chuẩn trình duyệt';
  }
}

export function renderDayDetailModalContent(state, dateKey, todayKey) {
  document.getElementById('day-detail-datekey').value = dateKey;
  document.getElementById('day-detail-title').textContent = `CHI TIẾT NGÀY: ${formatFullVN(dateKey)}`;

  const comp = computeDay(state, dateKey, { radarRefDateKey: todayKey });
  document.getElementById('day-detail-score').textContent = `${comp.totalPoints} / ${comp.target} đ (${comp.ratioPct}%)`;
  document.getElementById('day-detail-energy').value = state.days?.[dateKey]?.energy === 'low' ? 'low' : 'full';
  document.getElementById('day-detail-note').value = state.days?.[dateKey]?.note || '';

  const listEl = document.getElementById('day-detail-habits-list');
  const entries = state.days?.[dateKey]?.entries || {};
  const dailies = (state.habits || []).filter(h => !h.archived && h.kind === 'daily');

  if (listEl) {
    listEl.innerHTML = dailies
      .map(h => {
        const el = ELEMENTS[h.element];
        const checkable = isHabitCheckableOnDate(h, dateKey);
        const stVal = entries[h.id]?.state ?? 0;
        const cellUI = getCheckinCellVisual(stVal);

        return `
          <div class="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between gap-2">
            <div class="flex items-center gap-2 min-w-0">
              <span class="px-1.5 py-0.5 rounded text-[11px] font-bold badge-${h.element}">${el.emoji} ${el.name}</span>
              <span class="text-xs sm:text-sm font-semibold text-white truncate">${escapeHtml(h.name)}</span>
              <span class="text-xs font-hud text-sky-300">[+${h.weight}đ]</span>
            </div>
            ${
              checkable
                ? `<button type="button" data-action="cycle-checkin" data-habit-id="${h.id}" data-date="${dateKey}" class="quest-cell ${cellUI.className}">${cellUI.symbol}</button>`
                : `<span class="px-2.5 py-1 rounded cell-offday text-xs">Off-day</span>`
            }
          </div>
        `;
      })
      .join('');
  }
}

export function renderCronRecapModalContent(cronReport) {
  const body = document.getElementById('cron-recap-body');
  if (!body) return;

  const rowsHtml = cronReport.recapDays
    .map(r => {
      let badge = `<span class="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-xs font-bold">Đạt ${r.ratioPct}%</span>`;
      if (r.status === 'PENALTY') {
        badge = `<span class="px-2 py-0.5 rounded bg-red-500/20 text-red-300 text-xs font-bold">-${r.hpLost} HP (${r.ratioPct}%)</span>`;
      } else if (r.status === 'REST') {
        badge = `<span class="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-xs font-bold">Nghỉ Trọ</span>`;
      } else if (r.status === 'OFF') {
        badge = `<span class="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-xs font-bold">Off-day</span>`;
      }

      return `
        <div class="flex items-center justify-between bg-slate-900/80 border border-slate-800 rounded-lg px-3 py-2 gap-2">
          <div>
            <div class="font-hud font-bold text-white text-xs sm:text-sm">${formatFullVN(r.dateKey)}</div>
            <div class="text-[11px] text-slate-400">${escapeHtml(r.note)}</div>
          </div>
          <div class="shrink-0">${badge}</div>
        </div>
      `;
    })
    .join('');

  body.innerHTML = `
    <div class="grid grid-cols-3 gap-2 text-center bg-slate-950/90 border border-slate-800 rounded-xl p-3">
      <div>
        <div class="text-[11px] text-slate-400">Số ngày quét</div>
        <div class="font-hud font-bold text-base text-sky-300">${cronReport.recapDays.length} ngày</div>
      </div>
      <div>
        <div class="text-[11px] text-slate-400">Tổng HP Phạt</div>
        <div class="font-hud font-bold text-base text-rose-400">-${cronReport.totalHpLost} HP</div>
      </div>
      <div>
        <div class="text-[11px] text-slate-400">Streak Hiện Tại</div>
        <div class="font-hud font-bold text-base text-orange-300">🔥 ${cronReport.currentStreak} ngày</div>
      </div>
    </div>
    ${
      cronReport.skippedOldDaysCount > 0
        ? `<div class="p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-300">Đã bỏ qua ${cronReport.skippedOldDaysCount} ngày cũ hơn 30 ngày (đánh dấu không ghi nhận, không phạt).</div>`
        : ''
    }
    ${
      cronReport.morningHeal > 0
        ? `<div class="p-2.5 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-xs text-emerald-300 font-semibold">🌿 Linh căn Mộc ≥ 70%: Tự động hồi phục +${cronReport.morningHeal} HP đầu ngày mới!</div>`
        : ''
    }
    <div class="space-y-1.5 max-h-60 overflow-y-auto pr-1">${rowsHtml}</div>
  `;
}

export function showToast(title, message, theme = 'cyan') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const themeClasses = {
    cyan: 'border-sky-400 bg-slate-950/95 text-sky-300',
    emerald: 'border-emerald-400 bg-slate-950/95 text-emerald-300',
    amber: 'border-amber-400 bg-slate-950/95 text-amber-300',
    gold: 'border-amber-400 bg-slate-950/95 text-amber-300',
    purple: 'border-fuchsia-400 bg-slate-950/95 text-fuchsia-300',
    crimson: 'border-red-500 bg-red-950/95 text-red-200'
  };

  const el = document.createElement('div');
  el.className = `pointer-events-auto border-l-4 rounded-xl p-3.5 shadow-2xl transition-all duration-300 ${
    themeClasses[theme] || themeClasses.cyan
  }`;
  el.innerHTML = `
    <div class="flex items-start justify-between gap-2">
      <div>
        <div class="font-hud font-bold text-xs sm:text-sm uppercase">${escapeHtml(title)}</div>
        <div class="text-xs text-slate-200 mt-0.5 leading-relaxed">${escapeHtml(message)}</div>
      </div>
      <button type="button" class="text-slate-400 hover:text-white text-xs px-1" aria-label="Đóng thông báo">✕</button>
    </div>
  `;
  el.querySelector('button')?.addEventListener('click', () => el.remove());
  container.appendChild(el);

  setTimeout(() => {
    if (el.parentElement) {
      el.style.opacity = '0';
      setTimeout(() => el.remove(), 250);
    }
  }, 4600);
}
