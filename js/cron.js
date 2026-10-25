/**
 * SYSTEM: NGŨ HÀNH LEVELING v4.0 ULTIMATE
 * Module: js/cron.js — Daily Cron & Offline Day-Gap Detector (Section 5.13)
 */

import {
  addDays,
  diffDays,
  getDayOfWeekISO,
  getWeekStartKey,
  getWeekDateKeys,
  isDateInRest,
  isHabitScheduledOnDate,
  getWeeklyQuotaProgress,
  computeRadarAndBuffs,
  computeMaxHp,
  computePenaltyDamage,
  computeDay,
  computeWeeklyBoss,
  computeGlobalStreak,
  evaluateTitles
} from './engine.js';

/**
 * Chạy tiến trình chốt ngày (Daily Cron) từ `state.lastOpenDate` đến `yesterday` (so với `todayKey`).
 * Trả về báo cáo chi tiết để hiển thị Modal Tổng Kết Qua Đêm (Daily Cron Recap).
 */
export function runDailyCron(state, todayKey) {
  if (!state.lastOpenDate) {
    state.lastOpenDate = todayKey;
    return { ran: false, clockSkew: false, recapDays: [] };
  }

  const gap = diffDays(state.lastOpenDate, todayKey);

  // Nếu đồng hồ máy bị chỉnh lùi (today < lastOpenDate) -> không chạy cron, báo cảnh báo nhẹ
  if (gap < 0) {
    return {
      ran: false,
      clockSkew: true,
      lastOpenDate: state.lastOpenDate,
      todayKey,
      recapDays: []
    };
  }

  if (gap === 0) {
    return { ran: false, clockSkew: false, recapDays: [] };
  }

  const maxHpAtStart = computeMaxHp(state, todayKey);
  const maxTotalPenaltyCap = Math.floor(maxHpAtStart * 0.6); // Trần phạt 60% Max HP mỗi lần mở app
  let accumulatedPenalty = 0;

  const recapDays = [];
  const skippedOldDaysCount = Math.max(0, gap - 30);

  // Đánh dấu các ngày quá 30 ngày là "không ghi nhận" (không phạt)
  for (let i = gap; i > 30; i--) {
    const oldKey = addDays(todayKey, -i);
    if (!state.days[oldKey]) {
      state.days[oldKey] = {
        energy: 'full',
        restDay: false,
        note: '',
        entries: {},
        todosDone: [],
        closed: true,
        untracked: true,
        ratio: 0,
        penaltyApplied: 0,
        harmonyAwarded: false
      };
    } else {
      state.days[oldKey].closed = true;
      state.days[oldKey].untracked = true;
    }
  }

  const scanSteps = Math.min(gap, 30);
  const bossEvents = [];

  for (let step = scanSteps; step >= 1; step--) {
    const dKey = addDays(todayKey, -step);
    if (!state.days[dKey]) {
      state.days[dKey] = {
        energy: 'full',
        restDay: false,
        note: '',
        entries: {},
        todosDone: [],
        closed: false,
        ratio: 0,
        penaltyApplied: 0,
        harmonyAwarded: false
      };
    }

    const dayLog = state.days[dKey];

    // Nếu ngày này đã được chốt trước đó thì chỉ ghi nhận vào recap
    if (dayLog.closed) {
      recapDays.push({
        dateKey: dKey,
        status: dayLog.restDay ? 'REST' : 'CLOSED',
        ratioPct: Math.round((dayLog.ratio || 0) * 100),
        hpLost: dayLog.penaltyApplied || 0,
        quotaHpLost: 0,
        note: 'Đã chốt trước đó'
      });
      continue;
    }

    // 1. Kiểm tra Rest Mode
    if (isDateInRest(state, dKey)) {
      dayLog.restDay = true;
      dayLog.closed = true;
      dayLog.penaltyApplied = 0;
      recapDays.push({
        dateKey: dKey,
        status: 'REST',
        ratioPct: 0,
        hpLost: 0,
        quotaHpLost: 0,
        note: 'Nghỉ Trọ (Đóng băng Streak & không phạt)'
      });
      continue;
    }

    // 2. Tính điểm và mục tiêu ngày D
    const comp = computeDay(state, dKey, { radarRefDateKey: dKey });
    dayLog.ratio = comp.ratio;

    if (comp.isOffDay) {
      dayLog.closed = true;
      dayLog.penaltyApplied = 0;
      recapDays.push({
        dateKey: dKey,
        status: 'OFF',
        ratioPct: 100,
        hpLost: 0,
        quotaHpLost: 0,
        note: 'Ngày nghỉ lịch trình (Off-day)'
      });
    } else {
      // 3. Kiểm tra ngưỡng an toàn (safeThreshold mặc định 0.5 = 50%)
      const safeThreshold = Number(state.settings?.safeThreshold ?? 0.5);
      let dayPenalty = 0;

      if (comp.ratio < safeThreshold) {
        const rawDamage = computePenaltyDamage(state, 20, dKey);
        const allowedDamage = Math.max(0, Math.min(rawDamage, maxTotalPenaltyCap - accumulatedPenalty));
        dayPenalty = allowedDamage;
        accumulatedPenalty += dayPenalty;
        state.hp = Math.max(0, (state.hp || 0) - dayPenalty);
        state.stats.globalStreakCached = 0;
      } else {
        state.stats.globalStreakCached = (state.stats.globalStreakCached || 0) + 1;
      }

      dayLog.penaltyApplied = dayPenalty;
      dayLog.closed = true;

      // 4 & 5. Cập nhật Streak riêng & Mastery EMA cho từng thói quen daily
      for (const habit of state.habits || []) {
        if (habit.archived || habit.kind !== 'daily') continue;
        const scheduled = isHabitScheduledOnDate(habit, dKey);
        if (!scheduled) continue;

        const st = dayLog.entries?.[habit.id]?.state ?? 0;
        if (st === 'freeze') {
          habit.streakCount = (habit.streakCount || 0) + 1;
          continue; // freeze giữ streak nhưng bỏ qua cập nhật Mastery EMA
        }

        if (typeof st === 'number' && st >= 0.5) {
          habit.streakCount = (habit.streakCount || 0) + 1;
        } else {
          habit.streakCount = 0;
        }

        const prevMastery = typeof habit.mastery === 'number' ? habit.mastery : 0.3;
        const sample = typeof st === 'number' ? Math.min(1, Math.max(0, st)) : 0;
        habit.mastery = Number((0.9 * prevMastery + 0.1 * sample).toFixed(4));
      }

      recapDays.push({
        dateKey: dKey,
        status: comp.ratio < safeThreshold ? 'PENALTY' : 'SAFE',
        ratioPct: comp.ratioPct,
        totalPoints: comp.totalPoints,
        target: comp.target,
        hpLost: dayPenalty,
        quotaHpLost: 0,
        note:
          comp.ratio < safeThreshold
            ? `Đạt ${comp.ratioPct}% (< ${Math.round(safeThreshold * 100)}%)`
            : `Đạt chuẩn ${comp.ratioPct}%`
      });
    }

    // 6. Cuối tuần (sau ngày Chủ Nhật - ISO = 7): đánh giá Quota tuần & đóng băng Boss tuần
    if (getDayOfWeekISO(dKey) === 7) {
      const weekDates = getWeekDateKeys(dKey);
      const weekInRest = weekDates.some(wk => isDateInRest(state, wk));
      let quotaPenaltyApplied = 0;

      if (!weekInRest) {
        let totalMissingQuota = 0;
        for (const habit of state.habits || []) {
          if (habit.archived || habit.kind !== 'daily' || habit.schedule?.mode !== 'quota') continue;
          if (habit.startDate && habit.startDate > dKey) continue;
          const qProg = getWeeklyQuotaProgress(state, habit, dKey);
          totalMissingQuota += qProg.remaining;
        }

        if (totalMissingQuota > 0) {
          const baseQuotaDmg = Math.min(30, 10 * totalMissingQuota);
          const reducedQuotaDmg = computePenaltyDamage(state, baseQuotaDmg, dKey);
          const allowedQuotaDmg = Math.max(
            0,
            Math.min(reducedQuotaDmg, maxTotalPenaltyCap - accumulatedPenalty)
          );
          quotaPenaltyApplied = allowedQuotaDmg;
          accumulatedPenalty += quotaPenaltyApplied;
          state.hp = Math.max(0, (state.hp || 0) - quotaPenaltyApplied);

          const lastRecap = recapDays[recapDays.length - 1];
          if (lastRecap && lastRecap.dateKey === dKey) {
            lastRecap.quotaHpLost = quotaPenaltyApplied;
            lastRecap.hpLost += quotaPenaltyApplied;
            lastRecap.note += ` | Thiếu ${totalMissingQuota} lượt Quota tuần (-${quotaPenaltyApplied} HP)`;
          }
        }
      }

      // Đánh giá Boss tuần
      const bossInfo = computeWeeklyBoss(state, dKey);
      if (!state.boss) state.boss = {};
      if (!state.boss[bossInfo.weekKey]) {
        state.boss[bossInfo.weekKey] = {
          name: bossInfo.name,
          damage: bossInfo.damage,
          killed: bossInfo.killed,
          maxHpSnapshot: bossInfo.maxHp
        };
      } else {
        state.boss[bossInfo.weekKey].maxHpSnapshot = bossInfo.maxHp;
        state.boss[bossInfo.weekKey].damage = bossInfo.damage;
      }

      if (bossInfo.remainingHp <= 0 && !state.boss[bossInfo.weekKey].killed) {
        state.boss[bossInfo.weekKey].killed = true;
        state.inventory.gold = (state.inventory.gold || 0) + 200;
        state.stats.bossKills = (state.stats.bossKills || 0) + 1;
        bossEvents.push({
          weekKey: bossInfo.weekKey,
          name: bossInfo.name,
          outcome: 'KILLED',
          rewardGold: 200
        });
      } else if (!state.boss[bossInfo.weekKey].killed) {
        state.boss[bossInfo.weekKey].escaped = true;
        bossEvents.push({
          weekKey: bossInfo.weekKey,
          name: bossInfo.name,
          outcome: 'ESCAPED',
          rewardGold: 0
        });
      }
    }
  }

  // Hồi HP đầu ngày mới nếu Mộc >= 70% và hôm nay không phải ngày Rest (5.7 & 5.13)
  const radarToday = computeRadarAndBuffs(state, todayKey);
  const newMaxHp = computeMaxHp(state, todayKey, radarToday);
  let morningHeal = 0;

  // Chặn HP hiện tại về Max mới nếu mất buff Mộc (5.7)
  if (state.hp > newMaxHp) {
    state.hp = newMaxHp;
  }

  if (radarToday.buffs.moc && !isDateInRest(state, todayKey) && state.hp > 0) {
    const beforeHeal = state.hp;
    state.hp = Math.min(newMaxHp, state.hp + 5);
    morningHeal = state.hp - beforeHeal;
  }

  // Cập nhật lastOpenDate = hôm nay
  state.lastOpenDate = todayKey;

  // Cập nhật Danh hiệu
  const newlyUnlockedTitles = evaluateTitles(state, todayKey);
  const currentStreak = computeGlobalStreak(state, todayKey);

  return {
    ran: true,
    clockSkew: false,
    gapDays: gap,
    skippedOldDaysCount,
    totalHpLost: accumulatedPenalty,
    maxTotalPenaltyCap,
    morningHeal,
    currentHp: state.hp,
    maxHp: newMaxHp,
    penaltyZoneTriggered: state.hp <= 0,
    currentStreak,
    recapDays,
    bossEvents,
    newlyUnlockedTitles
  };
}
