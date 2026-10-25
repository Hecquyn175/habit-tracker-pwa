/**
 * SYSTEM: NGŨ HÀNH LEVELING v4.0 ULTIMATE
 * Module: js/engine.js — Pure Functions & Game Rules (No DOM / No window / No localStorage)
 */

export const SCHEMA_VERSION = 4;

export const ELEMENT_KEYS = ['MOC', 'HOA', 'THO', 'KIM', 'THUY'];

export const ELEMENTS = {
  MOC: {
    key: 'MOC',
    name: 'Mộc',
    stat: 'VIT',
    title: 'Sinh Mệnh & Hồi Phục',
    color: '#10b981',
    iconHtml: '<i class="fa-solid fa-leaf"></i>',
    emoji: '🌿',
    generates: 'HOA',
    generatedBy: 'THUY',
    buffName: '+25 Max HP & Hồi +5 HP đầu ngày',
    buffDesc: 'Mộc ≥ 70%: Tăng 25 Sinh Mệnh tối đa và tự động hồi +5 HP mỗi sáng.'
  },
  HOA: {
    key: 'HOA',
    name: 'Hỏa',
    stat: 'WIS',
    title: 'Thần Thức & Ngoại Ngữ',
    color: '#f97316',
    iconHtml: '<i class="fa-solid fa-fire"></i>',
    emoji: '🔥',
    generates: 'THO',
    generatedBy: 'MOC',
    buffName: '+10% Tỷ lệ rớt Rương Bóng Tối',
    buffDesc: 'Hỏa ≥ 70%: Cộng thẳng +10 điểm phần trăm tỷ lệ rơi Rương (20% ➔ 30%).'
  },
  THO: {
    key: 'THO',
    name: 'Thổ',
    stat: 'WIL',
    title: 'Định Lực & Thể Phách',
    color: '#f59e0b',
    iconHtml: '<i class="fa-solid fa-mountain"></i>',
    emoji: '⛰️',
    generates: 'KIM',
    generatedBy: 'HOA',
    buffName: 'Giảm 50% Sát Thương Phạt HP',
    buffDesc: 'Thổ ≥ 70%: Mọi sát thương phạt HP (trượt mục tiêu, [-], thiếu quota) nhân 0.5.'
  },
  KIM: {
    key: 'KIM',
    name: 'Kim',
    stat: 'DEX',
    title: 'Thực Thi & Xuất Chiêu',
    color: '#38bdf8',
    iconHtml: '<i class="fa-solid fa-khanda"></i>',
    emoji: '⚔️',
    generates: 'THUY',
    generatedBy: 'THO',
    buffName: '15% Bạo Kích Chí Mạng (x2 Điểm & Vàng)',
    buffDesc: 'Kim ≥ 70%: Khi hoàn thành nhiệm vụ có 15% cơ hội nổ Chí Mạng nhân đôi Điểm và Vàng.'
  },
  THUY: {
    key: 'THUY',
    name: 'Thủy',
    stat: 'INT',
    title: 'Tĩnh Trí & Ngộ Tính',
    color: '#818cf8',
    iconHtml: '<i class="fa-solid fa-droplet"></i>',
    emoji: '💧',
    generates: 'MOC',
    generatedBy: 'KIM',
    buffName: '+20% Điểm Phiên Tập Trung Pomodoro',
    buffDesc: 'Thủy ≥ 70%: Mục hoàn thành từ Hầm Ngục Tập Trung nhận hệ số x1.20 điểm.'
  }
};

export const CHECKIN_STATES = [0, 1, 0.5, 1.5, 'freeze'];

export const TITLES_CATALOG = [
  {
    id: 'cu_dem',
    name: 'Cú Đêm Chuyên Nghiệp',
    conditionDesc: '7 ngày liên tiếp (không tính Off-day) có ít nhất 1 lần tick sau 22:00',
    perkDesc: 'Vàng x1.10 cho mọi lượt tick từ 22:00 đến 02:00',
    hudColor: 'purple',
    target: 7
  },
  {
    id: 'doc_ton_toc_do',
    name: 'Độc Tôn Tốc Độ',
    conditionDesc: '5 ngày hoàn thành toàn bộ Dailies trước 12:00 trưa',
    perkDesc: 'Hệ số tốc độ speed = 1.10 cho các mục tick trước 12:00',
    hudColor: 'cyan',
    target: 5
  },
  {
    id: 'bat_khuat',
    name: 'Bất Khuất',
    conditionDesc: 'Hoàn thành 1 nhiệm vụ phạt khi chạm HP = 0 và hồi phục',
    perkDesc: 'Mỗi lần mất HP được trừ bớt 5 sát thương (tối thiểu 0)',
    hudColor: 'crimson',
    target: 1
  },
  {
    id: 'chien_binh_ngu_hanh',
    name: 'Chiến Binh Ngũ Hành',
    conditionDesc: 'Đạt Ngũ Hành Hợp Nhất 10 lần',
    perkDesc: 'Thanh Khí Vận (Pity) chỉ cần 3 lần trượt để nổ Rương Hoàng Kim',
    hudColor: 'emerald',
    target: 10
  },
  {
    id: 'ke_diet_boss',
    name: 'Kẻ Diệt Boss',
    conditionDesc: 'Hạ gục 1 Boss Hầm Ngục Tuần',
    perkDesc: 'Vàng x1.05 từ mọi nguồn thu nhập',
    hudColor: 'gold',
    target: 1
  },
  {
    id: 'thien_gia',
    name: 'Thiền Giả',
    conditionDesc: 'Hoàn thành 20 phiên Hầm Ngục Tập Trung (Pomodoro) thật',
    perkDesc: 'Thưởng chuyên cần Pomodoro tăng từ +25 lên +40 Vàng',
    hudColor: 'blue',
    target: 20
  }
];

export const DEFAULT_BOSS_NAMES = [
  'Thực Thể Trì Hoãn',
  'Ma Ảnh Phân Tâm',
  'Khổng Lồ Mệt Mỏi',
  'Bóng Ma Thức Khuya'
];

export const DEFAULT_PENALTY_QUESTS = [
  'Chống đẩy 30 cái hoặc Dọn dẹp bàn học trong 10 phút',
  'Squat 40 cái liên tục và uống ngay 500ml nước lọc',
  'Tắt điện thoại 20 phút và đọc 5 trang tài liệu chuyên môn',
  'Plank 90 giây và viết ra 3 ưu tiên quan trọng nhất hôm nay'
];

export const INVENTORY_LIMITS = {
  shields: 5,
  potions: 9,
  shieldOverflowGold: 50,
  potionOverflowGold: 40
};

/* ============================================================================
   1. PRNG CÓ SEED CỐ ĐỊNH (DÙNG CHO SEED DATA & UNIT TEST)
   ============================================================================ */

export function createSeededRNG(seed = 20261025) {
  let s = seed >>> 0;
  return function nextRandom() {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ============================================================================
   2. XỬ LÝ NGÀY THÁNG THEO GIỜ ĐỊA PHƯƠNG (YYYY-MM-DD, TUẦN BẮT ĐẦU THỨ HAI)
   ============================================================================ */

export function toDateKey(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseDateKey(dateKey) {
  if (!dateKey || typeof dateKey !== 'string') {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  }
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 0, 0, 0, 0);
}

export function addDays(dateKey, deltaDays) {
  const d = parseDateKey(dateKey);
  d.setDate(d.getDate() + deltaDays);
  return toDateKey(d);
}

export function diffDays(startKey, endKey) {
  const d1 = parseDateKey(startKey);
  const d2 = parseDateKey(endKey);
  const utc1 = Date.UTC(d1.getFullYear(), d1.getMonth(), d1.getDate());
  const utc2 = Date.UTC(d2.getFullYear(), d2.getMonth(), d2.getDate());
  return Math.round((utc2 - utc1) / 86400000);
}

/**
 * Thứ trong tuần chuẩn ISO: Thứ Hai = 1 ... Chủ Nhật = 7
 */
export function getDayOfWeekISO(dateKey) {
  const day = parseDateKey(dateKey).getDay();
  return day === 0 ? 7 : day;
}

export function getWeekStartKey(dateKey) {
  const iso = getDayOfWeekISO(dateKey);
  return addDays(dateKey, -(iso - 1));
}

export function getWeekDateKeys(dateKeyOrMonday) {
  const monday = getWeekStartKey(dateKeyOrMonday);
  const list = [];
  for (let i = 0; i < 7; i++) {
    list.push(addDays(monday, i));
  }
  return list;
}

export function isLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function getDaysInMonth(year, month1Based) {
  return new Date(year, month1Based, 0).getDate();
}

/**
 * Dựng lưới Lịch Tháng Vạn Niên 7 cột (T2 -> CN)
 * Chính xác cho mọi năm (kể cả 02/2024, 02/2028 năm nhuận, 02/2100 không nhuận, tháng 31 ngày bắt đầu CN)
 */
export function buildMonthGrid(year, month1Based) {
  const daysInCurrent = getDaysInMonth(year, month1Based);
  const firstDayKey = `${year}-${String(month1Based).padStart(2, '0')}-01`;
  const firstIso = getDayOfWeekISO(firstDayKey); // 1 (T2) -> 7 (CN)
  const leadingCount = firstIso - 1;

  const cells = [];
  for (let i = leadingCount; i > 0; i--) {
    const dk = addDays(firstDayKey, -i);
    const dt = parseDateKey(dk);
    cells.push({
      dateKey: dk,
      dayNumber: dt.getDate(),
      month: dt.getMonth() + 1,
      year: dt.getFullYear(),
      inCurrentMonth: false,
      dayOfWeekISO: getDayOfWeekISO(dk)
    });
  }

  for (let d = 1; d <= daysInCurrent; d++) {
    const dk = `${year}-${String(month1Based).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push({
      dateKey: dk,
      dayNumber: d,
      month: month1Based,
      year,
      inCurrentMonth: true,
      dayOfWeekISO: getDayOfWeekISO(dk)
    });
  }

  const lastDayKey = `${year}-${String(month1Based).padStart(2, '0')}-${String(daysInCurrent).padStart(2, '0')}`;
  const remainder = cells.length % 7;
  const trailingCount = remainder === 0 ? 0 : 7 - remainder;

  for (let i = 1; i <= trailingCount; i++) {
    const dk = addDays(lastDayKey, i);
    const dt = parseDateKey(dk);
    cells.push({
      dateKey: dk,
      dayNumber: dt.getDate(),
      month: dt.getMonth() + 1,
      year: dt.getFullYear(),
      inCurrentMonth: false,
      dayOfWeekISO: getDayOfWeekISO(dk)
    });
  }

  return {
    year,
    month: month1Based,
    daysInMonth: daysInCurrent,
    isLeapFeb: month1Based === 2 && isLeapYear(year),
    leadingCount,
    trailingCount,
    weeksCount: cells.length / 7,
    cells
  };
}

/* ============================================================================
   3. KIỂM TRA NGHỈ TRỌ (REST MODE) & LỊCH THÓI QUEN (SCHEDULE)
   ============================================================================ */

export function isDateInRest(state, dateKey) {
  if (!state) return false;
  const dayLog = state.days?.[dateKey];
  if (dayLog?.restDay) return true;

  const periods = state.rest?.periods || [];
  for (const p of periods) {
    if (p.start && dateKey >= p.start && (!p.end || dateKey <= p.end)) {
      return true;
    }
  }
  if (state.rest?.active && state.rest?.startDate && dateKey >= state.rest.startDate) {
    return true;
  }
  return false;
}

/**
 * Kiểm tra thói quen `daily` có lịch cố định vào ngày `dateKey` không
 * (Dùng cho mục tiêu ngày và Radar Ngũ Hành; KHÔNG bao gồm quota tuần)
 */
export function isHabitScheduledOnDate(habit, dateKey) {
  if (!habit || habit.archived || habit.kind !== 'daily') return false;
  if (habit.startDate && dateKey < habit.startDate) return false;

  const schedule = habit.schedule || { mode: 'everyday' };
  if (schedule.mode === 'everyday') return true;
  if (schedule.mode === 'days') {
    const days = Array.isArray(schedule.days) ? schedule.days : [1, 2, 3, 4, 5, 6, 7];
    return days.includes(getDayOfWeekISO(dateKey));
  }
  return false;
}

/**
 * Kiểm tra thói quen `daily` có được phép bấm check-in vào ngày `dateKey` không
 * (Thói quen quota tuần bấm được ở mọi ngày trong tuần)
 */
export function isHabitCheckableOnDate(habit, dateKey) {
  if (!habit || habit.archived || habit.kind !== 'daily') return false;
  if (habit.startDate && dateKey < habit.startDate) return false;
  if (habit.schedule?.mode === 'quota') return true;
  return isHabitScheduledOnDate(habit, dateKey);
}

/**
 * Đếm số lần hoàn thành trong tuần của một thói quen `quota`
 */
export function getWeeklyQuotaProgress(state, habit, anyDateInWeek) {
  const weekKeys = getWeekDateKeys(anyDateInWeek);
  const quotaTarget = habit.schedule?.quota || 3;
  let doneCount = 0;

  for (const dk of weekKeys) {
    const st = state.days?.[dk]?.entries?.[habit.id]?.state ?? 0;
    if (st === 'freeze' || (typeof st === 'number' && st >= 0.5)) {
      doneCount += 1;
    }
  }
  return {
    doneCount,
    quotaTarget,
    remaining: Math.max(0, quotaTarget - doneCount),
    completed: doneCount >= quotaTarget
  };
}

/* ============================================================================
   4. RADAR NGŨ HÀNH (5.6) & BUFF BỊ ĐỘNG (5.7)
   ============================================================================ */

/**
 * Cửa sổ: 7 ngày kết thúc HÔM QUA so với refDateKey (không gồm hôm nay để buff ổn định).
 * Bỏ qua ngày Rest, ngày Off, và mục freeze. Overdrive chặn ở 1.0.
 * Nếu hành không có ngày nào có lịch trong cửa sổ -> pct = null.
 */
export function computeRadarAndBuffs(state, refDateKey) {
  const windowDates = [];
  for (let i = 7; i >= 1; i--) {
    windowDates.push(addDays(refDateKey, -i));
  }

  const pcts = {};
  const details = {};

  for (const elKey of ELEMENT_KEYS) {
    let numer = 0;
    let denom = 0;

    for (const dk of windowDates) {
      if (isDateInRest(state, dk)) continue;
      const targetInfo = computeDailyTarget(state, dk);
      if (targetInfo.isOffDay) continue;

      const dayEntries = state.days?.[dk]?.entries || {};
      for (const habit of state.habits || []) {
        if (habit.archived || habit.kind !== 'daily' || habit.element !== elKey) continue;

        const isQuota = habit.schedule?.mode === 'quota';
        const isScheduled = isHabitScheduledOnDate(habit, dk);
        const entry = dayEntries[habit.id];
        const st = entry?.state ?? 0;

        if (st === 'freeze') continue;

        if (isScheduled || (isQuota && typeof st === 'number' && st > 0)) {
          denom += habit.weight;
          const clampedState = typeof st === 'number' ? Math.min(1, Math.max(0, st)) : 0;
          numer += clampedState * habit.weight;
        }
      }
    }

    if (denom === 0) {
      pcts[elKey] = null;
    } else {
      pcts[elKey] = Math.round((numer / denom) * 100);
    }

    details[elKey] = {
      pct: pcts[elKey],
      buffActive: pcts[elKey] !== null && pcts[elKey] >= 70,
      numer,
      denom
    };
  }

  const validValues = ELEMENT_KEYS.map(k => pcts[k]).filter(v => v !== null);
  let balanceScore = 0;
  if (validValues.length > 0) {
    const mean = validValues.reduce((a, b) => a + b, 0) / validValues.length;
    const variance =
      validValues.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / validValues.length;
    const stdDev = Math.sqrt(variance);
    balanceScore = Math.max(0, Math.min(100, Math.round(100 - stdDev)));
  }

  const buffs = {
    moc: details.MOC.buffActive,
    hoa: details.HOA.buffActive,
    tho: details.THO.buffActive,
    kim: details.KIM.buffActive,
    thuy: details.THUY.buffActive
  };

  const mocWarning = pcts.MOC !== null && pcts.MOC < 40;

  return {
    windowDates,
    pcts,
    details,
    buffs,
    balanceScore,
    mocWarning
  };
}

/**
 * Tính Max HP động theo Mộc buff + God Mode bonus
 */
export function computeMaxHp(state, refDateKey, precomputedRadar = null) {
  const radar = precomputedRadar || computeRadarAndBuffs(state, refDateKey);
  const base = state.maxHpBase || 100;
  const mocBonus = radar.buffs.moc ? 25 : 0;
  const godBonus = Number(state.settings?.maxHpBonus || 0);
  return Math.max(10, base + mocBonus + godBonus);
}

/**
 * Tính sát thương phạt HP sau khi áp dụng giảm sát thương của Thổ (x0.5) và danh hiệu Bất Khuất (-5)
 * Mục 5.7: damage = ceil(max(0, base * thoFactor - (batKhuat ? 5 : 0)))
 */
export function computePenaltyDamage(state, baseDamage, refDateKey, precomputedRadar = null) {
  const radar = precomputedRadar || computeRadarAndBuffs(state, refDateKey);
  const thoFactor = radar.buffs.tho ? 0.5 : 1.0;
  const hasBatKhuat = state.titles?.equipped === 'bat_khuat';
  const reduced = baseDamage * thoFactor - (hasBatKhuat ? 5 : 0);
  return Math.max(0, Math.ceil(reduced));
}

/* ============================================================================
   5. STATUS EFFECTS: EXHAUSTED & FLOW STATE (5.11)
   ============================================================================ */

export function computeElementDayPct(state, elementKey, dateKey) {
  const dayEntries = state.days?.[dateKey]?.entries || {};
  let numer = 0;
  let denom = 0;

  for (const habit of state.habits || []) {
    if (habit.archived || habit.kind !== 'daily' || habit.element !== elementKey) continue;
    if (!isHabitScheduledOnDate(habit, dateKey)) continue;
    const st = dayEntries[habit.id]?.state ?? 0;
    if (st === 'freeze') continue;
    denom += habit.weight;
    const clamped = typeof st === 'number' ? Math.min(1, Math.max(0, st)) : 0;
    numer += clamped * habit.weight;
  }

  if (denom === 0) return null;
  return Math.round((numer / denom) * 100);
}

/**
 * Exhausted: bật khi có ít nhất 1 thói quen Mộc trong cài đặt và trong 3 ngày liên tiếp
 * đã chốt gần nhất (không Off/Rest) tỷ lệ hoàn thành của Mộc < 40%.
 * Tắt ngay khi một ngày Mộc đạt >= 70% (kể cả ngày hiện tại).
 */
export function computeExhaustedStatus(state, refDateKey) {
  const hasMocHabit = (state.habits || []).some(
    h => !h.archived && h.kind === 'daily' && h.element === 'MOC'
  );
  if (!hasMocHabit) return false;

  // Nếu hôm nay Mộc đã đạt >= 70% -> tắt ngay lập tức
  const todayMocPct = computeElementDayPct(state, 'MOC', refDateKey);
  if (todayMocPct !== null && todayMocPct >= 70) {
    return false;
  }

  // Tìm 3 ngày đã chốt gần nhất trước refDateKey (không Off, không Rest)
  const closedMocPcts = [];
  for (let i = 1; i <= 30 && closedMocPcts.length < 3; i++) {
    const dk = addDays(refDateKey, -i);
    const dayLog = state.days?.[dk];
    if (!dayLog?.closed) continue;
    if (isDateInRest(state, dk)) continue;
    const targetInfo = computeDailyTarget(state, dk);
    if (targetInfo.isOffDay) continue;

    const mocPct = computeElementDayPct(state, 'MOC', dk);
    if (mocPct === null) continue;
    closedMocPcts.push({ dateKey: dk, pct: mocPct });
  }

  if (closedMocPcts.length < 3) return false;
  return closedMocPcts.every(item => item.pct < 40);
}

/* ============================================================================
   6. MỤC TIÊU NGÀY (5.3) & HÀM THUẦN COMPUTE DAY (5.1 - 5.5)
   ============================================================================ */

export function computeDailyTarget(state, dateKey) {
  const dayLog = state.days?.[dateKey] || {};
  const entries = dayLog.entries || {};
  const energy = dayLog.energy === 'low' ? 'low' : 'full';
  const energyFactor = energy === 'low' ? 0.5 : 1.0;

  let scheduledDailyWeight = 0;
  for (const habit of state.habits || []) {
    if (!isHabitScheduledOnDate(habit, dateKey)) continue;
    const st = entries[habit.id]?.state ?? 0;
    if (st === 'freeze') continue; // freeze loại thói quen khỏi mục tiêu ngày (trung lập)
    scheduledDailyWeight += Number(habit.weight) || 0;
  }

  let dueTodoWeight = 0;
  for (const todo of state.todos || []) {
    if (todo.due === dateKey) {
      dueTodoWeight += Number(todo.weight) || 0;
    }
  }

  const rawTarget = scheduledDailyWeight + dueTodoWeight;
  const target = Number((rawTarget * energyFactor).toFixed(2));
  const isOffDay = target === 0;

  return {
    dateKey,
    energy,
    energyFactor,
    scheduledDailyWeight,
    dueTodoWeight,
    rawTarget,
    target,
    isOffDay
  };
}

export function getGoldStateFactor(stateVal) {
  if (stateVal === 0.5) return 0.5;
  if (stateVal === 1) return 1.0;
  if (stateVal === 1.5) return 2.0;
  return 0;
}

/**
 * Kiểm tra hành `elementKey` trong ngày `dateKey` có ít nhất 1 thói quen daily đạt state >= 1 không
 */
export function isElementActiveOnDate(state, elementKey, dateKey) {
  const entries = state.days?.[dateKey]?.entries || {};
  return (state.habits || []).some(h => {
    if (h.archived || h.kind !== 'daily' || h.element !== elementKey) return false;
    const st = entries[h.id]?.state ?? 0;
    return typeof st === 'number' && st >= 1;
  });
}

/**
 * Kiểm tra người dùng đã tạo đủ cả 5 hành trong danh sách thói quen daily chưa
 */
export function hasAllFiveElementsConfigured(state) {
  return ELEMENT_KEYS.every(elKey =>
    (state.habits || []).some(h => !h.archived && h.kind === 'daily' && h.element === elKey)
  );
}

/**
 * HÀM THUẦN TRUNG TÂM: computeDay(state, dateKey, options)
 * Tính toàn bộ điểm, vàng, chi tiết từng dòng, hệ số nhân, Tương Sinh, Hợp Nhất, tỷ lệ hoàn thành.
 */
export function computeDay(state, dateKey, options = {}) {
  const refForRadar = options.radarRefDateKey || dateKey;
  const radar = options.precomputedRadar || computeRadarAndBuffs(state, refForRadar);
  const exhausted =
    options.exhausted !== undefined
      ? options.exhausted
      : computeExhaustedStatus(state, refForRadar);

  const dayLog = state.days?.[dateKey] || {};
  const entries = dayLog.entries || {};
  const targetInfo = computeDailyTarget(state, dateKey);

  const goldPerPoint = Number(state.settings?.goldPerPoint ?? 5);
  const globalGoldMult = Number(state.settings?.goldMultiplier ?? 1);
  const equippedTitle = state.titles?.equipped || null;
  const exhaustedGoldFactor = exhausted ? 0.8 : 1.0;
  const bossSlayerGoldFactor = equippedTitle === 'ke_diet_boss' ? 1.05 : 1.0;

  // Trạng thái kích hoạt của từng hành trong ngày dateKey
  const activeElementsMap = {};
  for (const elKey of ELEMENT_KEYS) {
    activeElementsMap[elKey] = isElementActiveOnDate(state, elKey, dateKey);
  }

  const breakdown = [];
  let dailyPointsSum = 0;
  let plusPointsSum = 0;
  let todoPointsSum = 0;
  let totalGoldBeforeHarmony = 0;

  // 1. Dailies (gồm cả everyday, days, quota)
  for (const habit of state.habits || []) {
    if (habit.archived || habit.kind !== 'daily') continue;
    const entry = entries[habit.id];
    if (!entry) continue;

    const st = entry.state ?? 0;
    if (st === 0 || st === 'freeze') {
      if (st === 'freeze') {
        breakdown.push({
          type: 'daily-freeze',
          id: habit.id,
          name: habit.name,
          element: habit.element,
          state: 'freeze',
          basePoints: 0,
          mult: 1,
          finalPoints: 0,
          gold: 0,
          factors: ['Đóng băng Khiên Định Hồn (Loại khỏi mục tiêu ngày)']
        });
      }
      continue;
    }

    if (typeof st !== 'number' || st <= 0) continue;

    const basePoints = habit.weight * st;
    const parentElKey = ELEMENTS[habit.element]?.generatedBy;
    const hasTuongSinh = parentElKey ? Boolean(activeElementsMap[parentElKey]) : false;
    const tuongSinh = hasTuongSinh ? 1.2 : 1.0;

    const isBackfilled = Boolean(entry.backfilled);
    const hasCrit = Boolean(radar.buffs.kim && entry.crit && !isBackfilled);
    const crit = hasCrit ? 2.0 : 1.0;

    const hasFlow = Boolean(entry.inFlow);
    const flow = hasFlow ? 1.25 : 1.0;

    const hasThuyPomo = Boolean(radar.buffs.thuy && entry.pomoBonus);
    const thuyPomo = hasThuyPomo ? 1.2 : 1.0;

    const tickHour = typeof entry.tickHour === 'number' ? entry.tickHour : 14;
    const hasSpeed = equippedTitle === 'doc_ton_toc_do' && tickHour < 12;
    const speed = hasSpeed ? 1.1 : 1.0;

    const rawMult = tuongSinh * crit * flow * thuyPomo * speed;
    const mult = Math.min(3.0, Number(rawMult.toFixed(4)));
    const finalPoints = Number((basePoints * mult).toFixed(2));

    // Vàng của Daily
    const gState = getGoldStateFactor(st);
    const rawGold = habit.weight * goldPerPoint * gState;
    const backfillGoldFactor = isBackfilled ? 0.5 : 1.0;
    const isNightOwlHour = tickHour >= 22 || tickHour < 2;
    const nightOwlGoldFactor = equippedTitle === 'cu_dem' && isNightOwlHour ? 1.1 : 1.0;

    const goldMult =
      crit *
      flow *
      backfillGoldFactor *
      exhaustedGoldFactor *
      nightOwlGoldFactor *
      bossSlayerGoldFactor *
      globalGoldMult;
    const itemGold = Number((rawGold * goldMult).toFixed(2));

    const factors = [];
    if (hasTuongSinh) factors.push(`Tương Sinh x1.2 (${ELEMENTS[parentElKey].name}➔${ELEMENTS[habit.element].name})`);
    if (hasCrit) factors.push('Chí Mạng x2.0');
    if (hasFlow) factors.push('Flow x1.25');
    if (hasThuyPomo) factors.push('Thủy Pomo x1.2');
    if (hasSpeed) factors.push('Độc Tôn Tốc Độ x1.1');
    if (rawMult > 3.0) factors.push('Chặn trần x3.0');
    if (isBackfilled) factors.push('Check-in bù (Vàng x0.5)');
    if (exhausted) factors.push('Exhausted (Vàng x0.8)');

    dailyPointsSum += finalPoints;
    totalGoldBeforeHarmony += itemGold;

    breakdown.push({
      type: 'daily',
      id: habit.id,
      name: habit.name,
      element: habit.element,
      state: st,
      basePoints: Number(basePoints.toFixed(2)),
      mult: Number(mult.toFixed(2)),
      finalPoints,
      gold: itemGold,
      tuongSinh,
      crit,
      flow,
      thuyPomo,
      speed,
      factors
    });
  }

  // 2. Thói quen phản xạ [+]
  for (const habit of state.habits || []) {
    if (habit.archived || habit.kind !== 'plus') continue;
    const entry = entries[habit.id];
    const count = Number(entry?.count || 0);
    if (count <= 0) continue;

    const maxPerDay = Number(habit.maxPerDay || 10);
    const effectiveCount = Math.min(count, maxPerDay);
    const finalPoints = Number((effectiveCount * habit.weight).toFixed(2));
    const rawGold = effectiveCount * habit.weight * goldPerPoint * 0.4;
    const itemGold = Number(
      (rawGold * exhaustedGoldFactor * bossSlayerGoldFactor * globalGoldMult).toFixed(2)
    );

    plusPointsSum += finalPoints;
    totalGoldBeforeHarmony += itemGold;

    breakdown.push({
      type: 'plus',
      id: habit.id,
      name: `${habit.name} (x${count}${count > maxPerDay ? `, tính điểm ${effectiveCount}/${maxPerDay}` : ''})`,
      element: habit.element,
      basePoints: finalPoints,
      mult: 1,
      finalPoints,
      gold: itemGold,
      factors: [`[+] Phản xạ (${effectiveCount}/${maxPerDay} lượt có điểm)`]
    });
  }

  // 3. To-Dos hoàn thành trong ngày dateKey
  const doneTodoIds = Array.isArray(dayLog.todosDone) ? dayLog.todosDone : [];
  for (const todoId of doneTodoIds) {
    const todo = (state.todos || []).find(t => t.id === todoId);
    if (!todo) continue;

    const isLate = Boolean(todo.due && dateKey > todo.due);
    const lateFactor = isLate ? 0.5 : 1.0;
    const finalPoints = Number((todo.weight * lateFactor).toFixed(2));
    const rawGold = todo.weight * goldPerPoint * lateFactor;
    const itemGold = Number(
      (rawGold * exhaustedGoldFactor * bossSlayerGoldFactor * globalGoldMult).toFixed(2)
    );

    todoPointsSum += finalPoints;
    totalGoldBeforeHarmony += itemGold;

    breakdown.push({
      type: 'todo',
      id: todo.id,
      name: todo.title,
      element: todo.element || 'KIM',
      basePoints: todo.weight,
      mult: lateFactor,
      finalPoints,
      gold: itemGold,
      factors: isLate ? ['Hoàn thành sau hạn (x0.5 Điểm & Vàng)'] : ['Hoàn thành đúng hạn (100%)']
    });
  }

  const basePoints = Number((dailyPointsSum + plusPointsSum + todoPointsSum).toFixed(2));

  // 4. Ngũ Hành Hợp Nhất (Elemental Harmony - 5.5)
  const activeElementCount = ELEMENT_KEYS.filter(k => activeElementsMap[k]).length;
  const isHarmony = activeElementCount === 5;
  const harmonyBonusPoints = isHarmony ? Number((basePoints * 0.25).toFixed(2)) : 0;
  const harmonyBonusGold = isHarmony ? Number((totalGoldBeforeHarmony * 0.25).toFixed(2)) : 0;

  if (isHarmony && basePoints > 0) {
    breakdown.push({
      type: 'harmony',
      id: 'elemental_harmony',
      name: 'NGŨ HÀNH HỢP NHẤT (Đủ 5 Hành ≥ 100%)',
      element: 'ALL',
      basePoints,
      mult: 0.25,
      finalPoints: harmonyBonusPoints,
      gold: harmonyBonusGold,
      factors: ['Thưởng +25% Tổng điểm ngày & +25% Vàng ngày', 'Hồi phục +15 HP (1 lần/ngày)']
    });
  }

  const totalPoints = Number((basePoints + harmonyBonusPoints).toFixed(2));
  const totalGold = Math.round(totalGoldBeforeHarmony + harmonyBonusGold);

  // ratio(D) = basePoints(D) / target(D) (mục 5.3: basePoints chưa gồm thưởng Hợp Nhất; có thể > 1)
  const ratio =
    targetInfo.target > 0 ? Number((basePoints / targetInfo.target).toFixed(4)) : 0;
  const completionPct =
    targetInfo.target > 0 ? Math.round((totalPoints / targetInfo.target) * 100) : 0;
  const ratioPct = Math.round(ratio * 100);

  return {
    dateKey,
    target: targetInfo.target,
    rawTarget: targetInfo.rawTarget,
    energy: targetInfo.energy,
    energyFactor: targetInfo.energyFactor,
    isOffDay: targetInfo.isOffDay,
    isRestDay: isDateInRest(state, dateKey),
    dailyPointsSum: Number(dailyPointsSum.toFixed(2)),
    plusPointsSum: Number(plusPointsSum.toFixed(2)),
    todoPointsSum: Number(todoPointsSum.toFixed(2)),
    basePoints,
    harmonyBonusPoints,
    totalPoints,
    totalGold,
    ratio,
    ratioPct,
    completionPct,
    activeElementsMap,
    activeElementCount,
    isHarmony,
    hasAllFiveElements: hasAllFiveElementsConfigured(state),
    breakdown
  };
}

/* ============================================================================
   7. RƯƠNG, KHÍ VẬN (PITY) & MYSTERY LOOT (5.8)
   ============================================================================ */

export function rollLootWithPity(state, refDateKey, rng = Math.random, precomputedRadar = null) {
  const radar = precomputedRadar || computeRadarAndBuffs(state, refDateKey);
  const currentPity = Number(state.pity || 0);
  const hasChienBinhTitle = state.titles?.equipped === 'chien_binh_ngu_hanh';
  const pityThreshold = hasChienBinhTitle ? 3 : 4;

  // Nếu pity đạt ngưỡng (4 hoặc 3 khi trang bị Chiến Binh Ngũ Hành) -> Rương Hoàng Kim 100%
  if (currentPity >= pityThreshold) {
    const bonusRoll = rng();
    const bonusItem = bonusRoll < 0.5 ? 'shield' : 'potion';
    return {
      dropped: true,
      chestType: 'GOLDEN',
      newPity: 0,
      goldReward: 100,
      shieldReward: bonusItem === 'shield' ? 1 : 0,
      potionReward: bonusItem === 'potion' ? 1 : 0,
      label: `Rương Hoàng Kim (Khí Vận cực đại): +100 Vàng & +1 ${
        bonusItem === 'shield' ? 'Khiên Định Hồn' : 'Đan Dược HP'
      }`
    };
  }

  // Tính xác suất rơi Rương Bóng Tối: 20% + 10% (Hỏa >= 70) + 5% (Flow)
  const nowMs = Date.now();
  const inFlow = Number(state.flowUntil || 0) > nowMs;
  const prob = 0.2 + (radar.buffs.hoa ? 0.1 : 0) + (inFlow ? 0.05 : 0);

  const hitRoll = rng();
  if (hitRoll < prob) {
    const itemRoll = rng();
    if (itemRoll < 0.6) {
      return {
        dropped: true,
        chestType: 'SHADOW',
        newPity: 0,
        goldReward: 30,
        shieldReward: 0,
        potionReward: 0,
        label: 'Rương Bóng Tối: +30 Vàng'
      };
    } else if (itemRoll < 0.85) {
      return {
        dropped: true,
        chestType: 'SHADOW',
        newPity: 0,
        goldReward: 0,
        shieldReward: 0,
        potionReward: 1,
        label: 'Rương Bóng Tối: +1 Đan Dược HP'
      };
    } else {
      return {
        dropped: true,
        chestType: 'SHADOW',
        newPity: 0,
        goldReward: 0,
        shieldReward: 1,
        potionReward: 0,
        label: 'Rương Bóng Tối: +1 Khiên Định Hồn'
      };
    }
  }

  return {
    dropped: false,
    chestType: null,
    newPity: currentPity + 1,
    goldReward: 0,
    shieldReward: 0,
    potionReward: 0,
    label: null
  };
}

/**
 * Cộng vật phẩm vào kho, nếu vượt trần (5 Khiên, 9 Đan Dược) thì tự quy đổi sang Vàng (5.8)
 */
export function applyInventoryRewards(inventory, { gold = 0, shields = 0, potions = 0 }) {
  let finalGold = Number(inventory.gold || 0) + gold;
  let finalShields = Number(inventory.shields || 0) + shields;
  let finalPotions = Number(inventory.potions || 0) + potions;
  let convertedGold = 0;

  if (finalShields > INVENTORY_LIMITS.shields) {
    const overflow = finalShields - INVENTORY_LIMITS.shields;
    finalShields = INVENTORY_LIMITS.shields;
    convertedGold += overflow * INVENTORY_LIMITS.shieldOverflowGold;
  }

  if (finalPotions > INVENTORY_LIMITS.potions) {
    const overflow = finalPotions - INVENTORY_LIMITS.potions;
    finalPotions = INVENTORY_LIMITS.potions;
    convertedGold += overflow * INVENTORY_LIMITS.potionOverflowGold;
  }

  finalGold += convertedGold;

  return {
    gold: Math.max(0, Math.round(finalGold)),
    shields: Math.max(0, finalShields),
    potions: Math.max(0, finalPotions),
    convertedGold
  };
}

/* ============================================================================
   8. BOSS HẦM NGỤC TUẦN (5.14)
   ============================================================================ */

export function computeWeeklyBoss(state, anyDateInWeek) {
  const weekStartKey = getWeekStartKey(anyDateInWeek);
  const weekDates = getWeekDateKeys(weekStartKey);
  const existingBoss = state.boss?.[weekStartKey] || {};

  // Tên Boss
  const bossNames =
    Array.isArray(state.settings?.bossNames) && state.settings.bossNames.length > 0
      ? state.settings.bossNames
      : DEFAULT_BOSS_NAMES;
  const weekIdx = Math.abs(Math.floor(parseDateKey(weekStartKey).getTime() / (7 * 86400000)));
  const bossName = existingBoss.name || bossNames[weekIdx % bossNames.length];

  // Nếu tuần đã đóng băng maxHpSnapshot thì dùng snapshot, ngược lại tính động:
  // bossMaxHp = round(0.8 * (sum_{ngày tuần không Rest} target(ngày) ở energy=full + quota * weight))
  let bossMaxHp = existingBoss.maxHpSnapshot;
  if (!bossMaxHp) {
    let fullWeekTargetSum = 0;
    for (const dk of weekDates) {
      if (isDateInRest(state, dk)) continue;
      // Tính target ở chế độ energy = full
      let dayTargetFull = 0;
      const entries = state.days?.[dk]?.entries || {};
      for (const h of state.habits || []) {
        if (!isHabitScheduledOnDate(h, dk)) continue;
        if (entries[h.id]?.state === 'freeze') continue;
        dayTargetFull += Number(h.weight) || 0;
      }
      for (const t of state.todos || []) {
        if (t.due === dk) dayTargetFull += Number(t.weight) || 0;
      }
      fullWeekTargetSum += dayTargetFull;
    }

    // Cộng thêm quota * weight của các thói quen quota (nếu tuần không phải toàn bộ trong Rest)
    const nonRestDaysCount = weekDates.filter(dk => !isDateInRest(state, dk)).length;
    if (nonRestDaysCount > 0) {
      for (const h of state.habits || []) {
        if (!h.archived && h.kind === 'daily' && h.schedule?.mode === 'quota') {
          const q = Number(h.schedule.quota || 3);
          fullWeekTargetSum += q * (Number(h.weight) || 0);
        }
      }
    }

    bossMaxHp = Math.max(10, Math.round(0.8 * fullWeekTargetSum));
  }

  // Tổng sát thương = tổng điểm của các ngày trong tuần
  let totalDamage = 0;
  for (const dk of weekDates) {
    const dayComp = computeDay(state, dk);
    totalDamage += dayComp.totalPoints;
  }
  totalDamage = Number(totalDamage.toFixed(2));

  const remainingHp = Math.max(0, Number((bossMaxHp - totalDamage).toFixed(2)));
  const hpPct = bossMaxHp > 0 ? Math.max(0, Math.min(100, Math.round((remainingHp / bossMaxHp) * 100))) : 0;
  const killed = Boolean(existingBoss.killed || remainingHp <= 0);

  return {
    weekKey: weekStartKey,
    weekDates,
    name: bossName,
    maxHp: bossMaxHp,
    damage: totalDamage,
    remainingHp,
    hpPct,
    killed,
    rewardClaimed: Boolean(existingBoss.killed)
  };
}

/* ============================================================================
   9. HẠNG THỢ SĂN (HUNTER RANK - 5.15) & MASTERY BẬC (5.13)
   ============================================================================ */

export function computeHunterRank(state, refDateKey) {
  const validRatios = [];
  for (let i = 1; i <= 7; i++) {
    const dk = addDays(refDateKey, -i);
    const dayLog = state.days?.[dk];
    if (!dayLog?.closed) continue;
    if (isDateInRest(state, dk)) continue;
    const comp = computeDay(state, dk);
    if (comp.isOffDay) continue;
    validRatios.push(comp.ratio * 100);
  }

  if (validRatios.length < 3) {
    return {
      calibrated: false,
      daysCount: validRatios.length,
      avgPct: validRatios.length > 0
        ? Math.round(validRatios.reduce((a, b) => a + b, 0) / validRatios.length)
        : 0,
      code: 'RANK E',
      shortCode: 'E',
      title: 'Rank E — Đang Hiệu Chuẩn Hệ Thống',
      badgeClass: 'rank-e'
    };
  }

  const avgPct = Number(
    (validRatios.reduce((a, b) => a + b, 0) / validRatios.length).toFixed(1)
  );

  if (avgPct >= 100) {
    return {
      calibrated: true,
      daysCount: validRatios.length,
      avgPct,
      code: 'NATIONAL',
      shortCode: 'NATIONAL',
      title: 'National Level — Thợ Săn Cấp Quốc Gia',
      badgeClass: 'rank-national'
    };
  }
  if (avgPct >= 92) {
    return {
      calibrated: true,
      daysCount: validRatios.length,
      avgPct,
      code: 'RANK S',
      shortCode: 'S',
      title: 'Rank S — Quân Vương Ngũ Hành',
      badgeClass: 'rank-s'
    };
  }
  if (avgPct >= 82) {
    return {
      calibrated: true,
      daysCount: validRatios.length,
      avgPct,
      code: 'RANK A',
      shortCode: 'A',
      title: 'Rank A — Đại Sư Linh Căn',
      badgeClass: 'rank-a'
    };
  }
  if (avgPct >= 70) {
    return {
      calibrated: true,
      daysCount: validRatios.length,
      avgPct,
      code: 'RANK B',
      shortCode: 'B',
      title: 'Rank B — Tinh Anh Linh Căn',
      badgeClass: 'rank-b'
    };
  }
  if (avgPct >= 55) {
    return {
      calibrated: true,
      daysCount: validRatios.length,
      avgPct,
      code: 'RANK C',
      shortCode: 'C',
      title: 'Rank C — Thợ Săn Thực Chiến',
      badgeClass: 'rank-c'
    };
  }
  if (avgPct >= 40) {
    return {
      calibrated: true,
      daysCount: validRatios.length,
      avgPct,
      code: 'RANK D',
      shortCode: 'D',
      title: 'Rank D — Thợ Săn Sơ Cấp',
      badgeClass: 'rank-d'
    };
  }

  return {
    calibrated: true,
    daysCount: validRatios.length,
    avgPct,
    code: 'RANK E',
    shortCode: 'E',
    title: 'Rank E — Tân Thủ Linh Đồ',
    badgeClass: 'rank-e'
  };
}

export function getMasteryTier(masteryValue = 0) {
  const pct = Math.round(Math.max(0, Math.min(1, masteryValue)) * 100);
  if (pct >= 85) return { pct, label: 'Bậc Thầy', color: '#f59e0b' };
  if (pct >= 60) return { pct, label: 'Thuần Thục', color: '#38bdf8' };
  if (pct >= 30) return { pct, label: 'Quen Tay', color: '#10b981' };
  return { pct, label: 'Tập Sự', color: '#94a3b8' };
}

/* ============================================================================
   10. TÍNH CHUỖI STREAK TOÀN CỤC & STREAK RIÊNG TỪNG THÓI QUEN (5.13)
   ============================================================================ */

export function computeGlobalStreak(state, todayKey) {
  const safeThreshold = Number(state.settings?.safeThreshold ?? 0.5);
  let streak = 0;

  for (let i = 0; i <= 365; i++) {
    const dk = addDays(todayKey, -i);
    if (dk < (state.createdAt || '2000-01-01') && !state.days?.[dk]) {
      if (i > 0) break;
    }

    if (isDateInRest(state, dk)) {
      continue; // Ngày Rest đóng băng Streak, không đếm và không phá
    }

    const comp = computeDay(state, dk);
    if (comp.isOffDay) {
      continue; // Off-day không đổi Streak
    }

    if (comp.ratio >= safeThreshold) {
      streak += 1;
    } else {
      if (i === 0) continue; // Hôm nay chưa xong chưa làm đứt streak của hôm qua
      break;
    }
  }
  return streak;
}

export function computeHabitStreak(state, habitId, todayKey) {
  const habit = (state.habits || []).find(h => h.id === habitId);
  if (!habit) return 0;

  let streak = 0;
  for (let i = 0; i <= 365; i++) {
    const dk = addDays(todayKey, -i);
    if (habit.startDate && dk < habit.startDate) break;
    if (isDateInRest(state, dk)) continue;

    const scheduled =
      habit.schedule?.mode === 'quota' ? true : isHabitScheduledOnDate(habit, dk);
    const st = state.days?.[dk]?.entries?.[habitId]?.state ?? 0;
    const kept = st === 'freeze' || (typeof st === 'number' && st >= 0.5);

    if (kept) {
      streak += 1;
    } else if (!scheduled || habit.schedule?.mode === 'quota') {
      continue;
    } else {
      if (i === 0) continue;
      break;
    }
  }
  return streak;
}

/* ============================================================================
   11. SỔ CÁI CHÊNH LỆCH (LEDGER DELTA - MỤC 5)
   ============================================================================ */

/**
 * Đồng bộ lại sổ cái của ngày `dateKey` và Boss tuần chứa ngày đó.
 * Chỉ cộng/trừ phần chênh lệch (delta) vào Vàng và sát thương Boss!
 */
export function reconcileDayLedger(state, dateKey, todayKey) {
  if (!state.days[dateKey]) {
    state.days[dateKey] = {
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

  const dayLog = state.days[dateKey];
  const comp = computeDay(state, dateKey, { radarRefDateKey: todayKey });

  // 1. Delta Vàng của ngày
  const prevPaidGold = Number(dayLog.paidGold || 0);
  const newTotalGold = comp.totalGold;
  const goldDelta = newTotalGold - prevPaidGold;

  if (goldDelta !== 0) {
    state.inventory.gold = Math.max(0, Math.round((state.inventory.gold || 0) + goldDelta));
    dayLog.paidGold = newTotalGold;
  }

  dayLog.ratio = comp.ratio;

  // 2. Ngũ Hành Hợp Nhất (+15 HP một lần/ngày, không thu hồi HP nếu bỏ tick)
  let harmonyJustTriggered = false;
  if (comp.isHarmony && !dayLog.harmonyAwarded) {
    dayLog.harmonyAwarded = true;
    harmonyJustTriggered = true;
    const maxHp = computeMaxHp(state, todayKey);
    state.hp = Math.min(maxHp, (state.hp || 0) + 15);
    state.stats.harmonyCount = (state.stats.harmonyCount || 0) + 1;
  }

  // 3. Nếu ngày đã chốt (closed) mà người dùng check-in bù / sửa lại -> tính lại phạt HP theo delta
  let retroactiveHpDelta = 0;
  if (dayLog.closed && !comp.isRestDay && !comp.isOffDay) {
    const safeThreshold = Number(state.settings?.safeThreshold ?? 0.5);
    const shouldPenalize = comp.ratio < safeThreshold;
    const expectedPenalty = shouldPenalize
      ? computePenaltyDamage(state, 20, dateKey)
      : 0;
    const prevPenalty = Number(dayLog.penaltyApplied || 0);
    const penaltyDiff = expectedPenalty - prevPenalty; // < 0 nghĩa là được hoàn HP, > 0 là bị trừ thêm HP

    if (penaltyDiff !== 0) {
      const maxHp = computeMaxHp(state, todayKey);
      state.hp = Math.max(0, Math.min(maxHp, state.hp - penaltyDiff));
      dayLog.penaltyApplied = expectedPenalty;
      retroactiveHpDelta = -penaltyDiff;
    }
  }

  // 4. Cập nhật Boss tuần
  const bossInfo = computeWeeklyBoss(state, dateKey);
  if (!state.boss) state.boss = {};
  const prevBossRecord = state.boss[bossInfo.weekKey] || {
    name: bossInfo.name,
    damage: 0,
    killed: false,
    maxHpSnapshot: null
  };
  const bossDamageDelta = Number((bossInfo.damage - (prevBossRecord.damage || 0)).toFixed(2));
  prevBossRecord.name = bossInfo.name;
  prevBossRecord.damage = bossInfo.damage;

  let bossJustKilled = false;
  if (bossInfo.remainingHp <= 0 && !prevBossRecord.killed) {
    prevBossRecord.killed = true;
    bossJustKilled = true;
    state.inventory.gold = (state.inventory.gold || 0) + 200;
    state.stats.bossKills = (state.stats.bossKills || 0) + 1;
    state.history.unshift({
      ts: Date.now(),
      type: 'boss',
      delta: 200,
      label: `Hạ gục Boss tuần [${bossInfo.name}] (+200 Vàng)`
    });
  }
  state.boss[bossInfo.weekKey] = prevBossRecord;

  return {
    dayComputation: comp,
    goldDelta,
    bossDamageDelta,
    harmonyJustTriggered,
    bossJustKilled,
    retroactiveHpDelta
  };
}

/* ============================================================================
   12. ĐÁNH GIÁ MỞ KHÓA DANH HIỆU (5.10)
   ============================================================================ */

export function evaluateTitles(state, todayKey) {
  if (!state.titles) {
    state.titles = { unlocked: [], equipped: null, progress: {} };
  }
  const unlockedSet = new Set(state.titles.unlocked || []);
  const newlyUnlocked = [];

  // 1. Cú Đêm Chuyên Nghiệp: 7 ngày liên tiếp (không tính Off) có ít nhất 1 lần tick sau 22:00 (22..23 hoặc 0..1)
  let nightOwlStreak = 0;
  for (let i = 0; i <= 30; i++) {
    const dk = addDays(todayKey, -i);
    if (isDateInRest(state, dk)) continue;
    const comp = computeDay(state, dk);
    if (comp.isOffDay) continue;
    const entries = Object.values(state.days?.[dk]?.entries || {});
    const hasLateTick = entries.some(
      e =>
        (typeof e.state === 'number' && e.state > 0) &&
        typeof e.tickHour === 'number' &&
        (e.tickHour >= 22 || e.tickHour < 2)
    );
    if (hasLateTick) {
      nightOwlStreak += 1;
    } else {
      if (i === 0) continue;
      break;
    }
  }
  state.titles.progress.cu_dem = Math.min(7, nightOwlStreak);
  if (nightOwlStreak >= 7 && !unlockedSet.has('cu_dem')) {
    unlockedSet.add('cu_dem');
    newlyUnlocked.push('cu_dem');
  }

  // 2. Độc Tôn Tốc Độ: 5 ngày hoàn thành toàn bộ dailies trước 12:00
  let speedDays = 0;
  for (const [dk, dayLog] of Object.entries(state.days || {})) {
    if (isDateInRest(state, dk)) continue;
    const scheduledHabits = (state.habits || []).filter(h => isHabitScheduledOnDate(h, dk));
    if (scheduledHabits.length === 0) continue;
    const allEarly = scheduledHabits.every(h => {
      const e = dayLog.entries?.[h.id];
      return (
        e &&
        typeof e.state === 'number' &&
        e.state >= 1 &&
        typeof e.tickHour === 'number' &&
        e.tickHour < 12
      );
    });
    if (allEarly) speedDays += 1;
  }
  state.titles.progress.doc_ton_toc_do = Math.min(5, speedDays);
  if (speedDays >= 5 && !unlockedSet.has('doc_ton_toc_do')) {
    unlockedSet.add('doc_ton_toc_do');
    newlyUnlocked.push('doc_ton_toc_do');
  }

  // 3. Bất Khuất: Hoàn thành 1 nhiệm vụ phạt
  const penaltyDone = Number(state.stats?.penaltyQuestsCompleted || 0);
  state.titles.progress.bat_khuat = Math.min(1, penaltyDone);
  if (penaltyDone >= 1 && !unlockedSet.has('bat_khuat')) {
    unlockedSet.add('bat_khuat');
    newlyUnlocked.push('bat_khuat');
  }

  // 4. Chiến Binh Ngũ Hành: 10 lần Hợp Nhất
  const harmonyCount = Number(state.stats?.harmonyCount || 0);
  state.titles.progress.chien_binh_ngu_hanh = Math.min(10, harmonyCount);
  if (harmonyCount >= 10 && !unlockedSet.has('chien_binh_ngu_hanh')) {
    unlockedSet.add('chien_binh_ngu_hanh');
    newlyUnlocked.push('chien_binh_ngu_hanh');
  }

  // 5. Kẻ Diệt Boss: Hạ gục 1 Boss tuần
  const bossKills = Number(state.stats?.bossKills || 0);
  state.titles.progress.ke_diet_boss = Math.min(1, bossKills);
  if (bossKills >= 1 && !unlockedSet.has('ke_diet_boss')) {
    unlockedSet.add('ke_diet_boss');
    newlyUnlocked.push('ke_diet_boss');
  }

  // 6. Thiền Giả: Hoàn thành 20 phiên Pomodoro thật
  const pomoCount = Number(state.stats?.pomodoroCount || 0);
  state.titles.progress.thien_gia = Math.min(20, pomoCount);
  if (pomoCount >= 20 && !unlockedSet.has('thien_gia')) {
    unlockedSet.add('thien_gia');
    newlyUnlocked.push('thien_gia');
  }

  state.titles.unlocked = Array.from(unlockedSet);
  return newlyUnlocked;
}

/* ============================================================================
   13. BẢNG TỔNG KẾT THÁNG (TAB 3 - SO SÁNH CÁC THÁNG)
   ============================================================================ */

export function computeMonthlySummary(state, year, month1Based) {
  const daysInMonth = getDaysInMonth(year, month1Based);
  const safeThreshold = Number(state.settings?.safeThreshold ?? 0.5);

  let totalPoints = 0;
  let validDaysCount = 0;
  let ratioSum = 0;
  let safeDaysCount = 0;
  let longestStreakInMonth = 0;
  let currentStreak = 0;
  let harmonyCount = 0;

  for (let d = 1; d <= daysInMonth; d++) {
    const dk = `${year}-${String(month1Based).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const hasLog = Boolean(state.days?.[dk]);
    if (!hasLog) continue;

    const comp = computeDay(state, dk);
    totalPoints += comp.totalPoints;
    if (comp.isHarmony) harmonyCount += 1;

    if (!comp.isOffDay && !comp.isRestDay) {
      validDaysCount += 1;
      ratioSum += comp.ratio * 100;
      if (comp.ratio >= safeThreshold) {
        safeDaysCount += 1;
        currentStreak += 1;
        if (currentStreak > longestStreakInMonth) {
          longestStreakInMonth = currentStreak;
        }
      } else if (state.days[dk]?.closed) {
        currentStreak = 0;
      }
    }
  }

  // Đếm số Boss hạ gục thuộc tháng đó
  const monthPrefix = `${year}-${String(month1Based).padStart(2, '0')}`;
  let bossKills = 0;
  for (const [wk, bObj] of Object.entries(state.boss || {})) {
    if (wk.startsWith(monthPrefix) && bObj?.killed) {
      bossKills += 1;
    }
  }

  const avgPct = validDaysCount > 0 ? Math.round(ratioSum / validDaysCount) : 0;

  return {
    year,
    month: month1Based,
    label: `Tháng ${String(month1Based).padStart(2, '0')}/${year}`,
    totalPoints: Number(totalPoints.toFixed(1)),
    avgPct,
    safeDaysCount,
    longestStreak: longestStreakInMonth,
    harmonyCount,
    bossKills
  };
}
