/**
 * SYSTEM: NGŨ HÀNH LEVELING v4.0 ULTIMATE
 * Module: js/state.js — State Management, Seed Data, Migration, Backup/Restore & Ledger Helpers
 */

import {
  SCHEMA_VERSION,
  DEFAULT_BOSS_NAMES,
  DEFAULT_PENALTY_QUESTS,
  createSeededRNG,
  toDateKey,
  addDays,
  getWeekStartKey,
  computeDay,
  computeWeeklyBoss,
  computeMaxHp,
  isHabitScheduledOnDate
} from './engine.js';

export const STORAGE_KEY = 'nhl_v4';
export const LEGACY_KEYS = ['nhl_v3', 'SYSTEM_NGU_HANH_LEVELING_STATE_V1'];

export function createDefaultSettings() {
  return {
    soundEnabled: true,
    masterVolume: 0.8,
    ambientType: 'none', // 'none' | 'rain' | 'library' | 'tavern'
    ambientVolume: 0.45,
    autoAmbientInPomo: true,
    safeThreshold: 0.5, // 50%
    goldPerPoint: 5,
    goldMultiplier: 1.0,
    maxHpBonus: 0,
    devMode: false,
    virtualDayOffset: 0,
    seedBannerDismissed: false,
    bossNames: [...DEFAULT_BOSS_NAMES],
    penaltyQuests: [...DEFAULT_PENALTY_QUESTS],
    activePenaltyQuestIdx: 0
  };
}

/**
 * Tạo Dữ Liệu Mẫu 14 Ngày (Section 10) bằng PRNG cố định.
 * 14 ngày kết thúc vào HÔM QUA, hôm nay để trống để người dùng bắt đầu tương tác.
 */
export function createSeedState(todayKey = toDateKey(new Date())) {
  const rng = createSeededRNG(20261025);
  const startSeedDate = addDays(todayKey, -14);

  const habits = [
    {
      id: 'h_thuy_yolo',
      name: 'Đọc paper & Nghiên cứu mô hình YOLO',
      element: 'THUY',
      weight: 5,
      kind: 'daily',
      schedule: { mode: 'days', days: [1, 2, 3, 4, 5, 6], quota: 6 },
      maxPerDay: 10,
      damage: 5,
      startDate: startSeedDate,
      archived: false,
      seed: true,
      mastery: 0.72,
      streakCount: 5
    },
    {
      id: 'h_kim_code',
      name: 'Code thực nghiệm & Commit GitHub',
      element: 'KIM',
      weight: 5,
      kind: 'daily',
      schedule: { mode: 'everyday', days: [1, 2, 3, 4, 5, 6, 7], quota: 7 },
      maxPerDay: 10,
      damage: 5,
      startDate: startSeedDate,
      archived: false,
      seed: true,
      mastery: 0.86,
      streakCount: 6
    },
    {
      id: 'h_hoa_toeic',
      name: 'Luyện đề TOEIC 45 phút (Listening/Reading)',
      element: 'HOA',
      weight: 4,
      kind: 'daily',
      schedule: { mode: 'days', days: [1, 2, 4, 6], quota: 4 },
      maxPerDay: 10,
      damage: 5,
      startDate: startSeedDate,
      archived: false,
      seed: true,
      mastery: 0.65,
      streakCount: 4
    },
    {
      id: 'h_tho_run',
      name: 'Vận động / Chạy bộ 30 phút & Giữ kỷ luật',
      element: 'THO',
      weight: 3,
      kind: 'daily',
      schedule: { mode: 'days', days: [1, 3, 5, 7], quota: 4 },
      maxPerDay: 10,
      damage: 5,
      startDate: startSeedDate,
      archived: false,
      seed: true,
      mastery: 0.58,
      streakCount: 3
    },
    {
      id: 'h_moc_sleep',
      name: 'Ngủ trước 23h30 & Uống đủ 2L nước',
      element: 'MOC',
      weight: 3,
      kind: 'daily',
      schedule: { mode: 'everyday', days: [1, 2, 3, 4, 5, 6, 7], quota: 7 },
      maxPerDay: 10,
      damage: 5,
      startDate: startSeedDate,
      archived: false,
      seed: true,
      mastery: 0.71,
      streakCount: 4
    },
    // [+] Thói quen Phản xạ
    {
      id: 'h_plus_water',
      name: 'Uống 1 cốc nước',
      element: 'MOC',
      weight: 1,
      kind: 'plus',
      schedule: { mode: 'everyday', days: [1, 2, 3, 4, 5, 6, 7], quota: 7 },
      maxPerDay: 10,
      damage: 0,
      startDate: startSeedDate,
      archived: false,
      seed: true,
      mastery: 0.5
    },
    {
      id: 'h_plus_pushup',
      name: 'Hít đất 10 cái',
      element: 'THO',
      weight: 1,
      kind: 'plus',
      schedule: { mode: 'everyday', days: [1, 2, 3, 4, 5, 6, 7], quota: 7 },
      maxPerDay: 10,
      damage: 0,
      startDate: startSeedDate,
      archived: false,
      seed: true,
      mastery: 0.5
    },
    // [-] Giới luật
    {
      id: 'h_minus_tiktok',
      name: 'Lướt TikTok quá đà',
      element: 'THO',
      weight: 1,
      kind: 'minus',
      schedule: { mode: 'everyday', days: [1, 2, 3, 4, 5, 6, 7], quota: 7 },
      maxPerDay: 10,
      damage: 5,
      startDate: startSeedDate,
      archived: false,
      seed: true,
      mastery: 0
    },
    {
      id: 'h_minus_late',
      name: 'Thức khuya sau 0h',
      element: 'MOC',
      weight: 1,
      kind: 'minus',
      schedule: { mode: 'everyday', days: [1, 2, 3, 4, 5, 6, 7], quota: 7 },
      maxPerDay: 10,
      damage: 8,
      startDate: startSeedDate,
      archived: false,
      seed: true,
      mastery: 0
    }
  ];

  const todos = [
    {
      id: 'todo_seed_today',
      title: 'Tổng hợp bảng so sánh mAP YOLOv8 vs YOLOv10',
      weight: 4,
      element: 'THUY',
      due: todayKey,
      scheduled: false,
      done: false,
      doneAt: null,
      doneDate: null,
      seed: true
    },
    {
      id: 'todo_seed_future',
      title: 'Nộp báo cáo tiến độ tuần & đẩy tag release v1.2',
      weight: 5,
      element: 'KIM',
      due: addDays(todayKey, 3),
      scheduled: true,
      done: false,
      doneAt: null,
      doneDate: null,
      seed: true
    }
  ];

  const rewards = [
    {
      id: 'rw_tft',
      title: 'Chơi 2 trận Đấu Trường Chân Lý',
      cost: 120,
      icon: 'fa-gamepad',
      seed: false
    },
    {
      id: 'rw_movie',
      title: 'Xem 1 tập phim',
      cost: 150,
      icon: 'fa-film',
      seed: false
    },
    {
      id: 'rw_drink',
      title: 'Uống 1 ly trà sữa/cà phê ngon',
      cost: 200,
      icon: 'fa-mug-hot',
      seed: false
    }
  ];

  // Mẫu 14 ngày kết thúc hôm qua (daysAgo = 14 .. 1)
  // Đảm bảo: tuần trước hơi thấp (~68%), tuần này khá hơn (~85%, đạt Hạng A);
  // có Overdrive (1.5), có freeze, có ngày < 50%, có ngày đạt Hợp Nhất (cả 5 hành >= 1),
  // ít nhất 3 ngày có nhật ký, Mộc quanh 68-75%.
  const seedPatterns = {
    14: {
      entries: { h_thuy_yolo: 0.5, h_kim_code: 1, h_hoa_toeic: 0.5, h_tho_run: 0.5, h_moc_sleep: 0.5, h_plus_water: 1 },
      note: ''
    },
    13: {
      entries: { h_thuy_yolo: 1, h_kim_code: 0.5, h_hoa_toeic: 0.5, h_tho_run: 0, h_moc_sleep: 0.5, h_plus_water: 1 },
      note: ''
    },
    12: {
      // Ngày dưới 50%
      entries: { h_thuy_yolo: 0, h_kim_code: 0.5, h_hoa_toeic: 0, h_tho_run: 0.5, h_moc_sleep: 0.5 },
      note: 'Ngày họp dày đặc, năng lượng giảm nhẹ nhưng vẫn giữ nhịp code cơ bản.'
    },
    11: {
      entries: { h_thuy_yolo: 1, h_kim_code: 0.5, h_hoa_toeic: 0.5, h_tho_run: 1, h_moc_sleep: 1, h_plus_pushup: 1 },
      note: ''
    },
    10: {
      // Ngày có freeze
      entries: { h_thuy_yolo: 'freeze', h_kim_code: 1, h_hoa_toeic: 0.5, h_tho_run: 0.5, h_moc_sleep: 1 },
      note: 'Dùng 1 Khiên Định Hồn bảo vệ chuỗi nghiên cứu paper khi đi công tác.'
    },
    9: {
      entries: { h_thuy_yolo: 0.5, h_kim_code: 1, h_hoa_toeic: 1, h_tho_run: 0.5, h_moc_sleep: 0.5, h_plus_water: 1 },
      note: ''
    },
    8: {
      entries: { h_thuy_yolo: 1, h_kim_code: 0.5, h_hoa_toeic: 0.5, h_tho_run: 1, h_moc_sleep: 1 },
      note: ''
    },
    // 7 ngày gần nhất (kết thúc hôm qua) -> quyết định Radar Ngũ Hành (Mộc ~71%) & Hunter Rank B-A (~85%)
    7: {
      entries: { h_thuy_yolo: 0.5, h_kim_code: 0.5, h_hoa_toeic: 0.5, h_tho_run: 0.5, h_moc_sleep: 0.5 },
      note: ''
    },
    6: {
      entries: { h_thuy_yolo: 1, h_kim_code: 1, h_hoa_toeic: 1, h_tho_run: 1, h_moc_sleep: 1 },
      note: 'Đạt trạng thái Ngũ Hành Hợp Nhất! Hoàn thành trọn vẹn cả 5 nhóm linh căn.'
    },
    5: {
      entries: { h_thuy_yolo: 0.5, h_kim_code: 0.5, h_hoa_toeic: 0.5, h_tho_run: 0.5, h_moc_sleep: 0.5 },
      note: ''
    },
    4: {
      // Ngày có Overdrive 1.5
      entries: { h_thuy_yolo: 1.5, h_kim_code: 1, h_hoa_toeic: 0.5, h_tho_run: 0.5, h_moc_sleep: 1 },
      note: 'Bứt phá Overdrive 150%! Tối ưu hóa thành công pipeline huấn luyện mô hình.'
    },
    3: {
      entries: { h_thuy_yolo: 0.5, h_kim_code: 0.5, h_hoa_toeic: 0.5, h_tho_run: 0.5, h_moc_sleep: 0.5 },
      note: ''
    },
    2: {
      entries: { h_thuy_yolo: 0.5, h_kim_code: 1, h_hoa_toeic: 0.5, h_tho_run: 1, h_moc_sleep: 1 },
      note: 'Giải đề TOEIC đạt 880 điểm, chạy bộ 4km và ngủ đúng 23h15.'
    },
    1: {
      entries: { h_thuy_yolo: 0.5, h_kim_code: 0.5, h_hoa_toeic: 0.5, h_tho_run: 0.5, h_moc_sleep: 0.5 },
      note: ''
    }
  };

  const state = {
    schemaVersion: SCHEMA_VERSION,
    createdAt: startSeedDate,
    lastOpenDate: todayKey,
    settings: createDefaultSettings(),
    profile: {
      hunterName: 'Thợ Săn Ngũ Hành'
    },
    habits,
    todos,
    rewards,
    days: {},
    rest: {
      active: false,
      startDate: null,
      periods: []
    },
    boss: {},
    inventory: {
      gold: 150,
      shields: 2,
      potions: 1
    },
    hp: 85,
    maxHpBase: 100,
    pity: 2,
    flowUntil: 0,
    titles: {
      unlocked: ['ke_diet_boss'],
      equipped: null,
      progress: {
        cu_dem: 2,
        doc_ton_toc_do: 2,
        bat_khuat: 0,
        chien_binh_ngu_hanh: 2,
        ke_diet_boss: 1,
        thien_gia: 4
      }
    },
    history: [
      {
        ts: Date.now() - 86400000 * 2,
        type: 'loot',
        delta: 30,
        label: 'Rương Bóng Tối: +30 Vàng',
        seed: true
      },
      {
        ts: Date.now() - 86400000 * 4,
        type: 'pomo',
        delta: 25,
        label: 'Hoàn tất Hầm Ngục Tập Trung (25p): +25 Vàng',
        seed: true
      }
    ],
    stats: {
      harmonyCount: 2,
      pomodoroCount: 4,
      bossKills: 1,
      penaltyQuestsCompleted: 0,
      globalStreakCached: 5
    }
  };

  // Điền 14 ngày mẫu
  for (let daysAgo = 14; daysAgo >= 1; daysAgo--) {
    const dk = addDays(todayKey, -daysAgo);
    const pat = seedPatterns[daysAgo];
    const entries = {};

    for (const [hId, val] of Object.entries(pat.entries)) {
      const hObj = habits.find(h => h.id === hId);
      if (!hObj) continue;
      if (hObj.kind === 'daily' && daysAgo !== 6 && !isHabitScheduledOnDate(hObj, dk)) {
        continue;
      }
      if (hObj.kind === 'plus') {
        entries[hId] = {
          state: 0,
          count: val,
          crit: false,
          lootRolled: true,
          tickHour: 10 + Math.floor(rng() * 8),
          paidGold: 0,
          pomoBonus: false,
          backfilled: false
        };
      } else {
        entries[hId] = {
          state: val,
          count: 0,
          crit: val === 1.5,
          lootRolled: true,
          tickHour: 9 + Math.floor(rng() * 11),
          paidGold: 0,
          pomoBonus: daysAgo === 4 && hId === 'h_thuy_yolo',
          backfilled: false
        };
      }
    }

    state.days[dk] = {
      energy: 'full',
      restDay: false,
      note: pat.note || '',
      entries,
      todosDone: [],
      closed: true,
      ratio: 0,
      penaltyApplied: daysAgo === 12 ? 20 : 0,
      harmonyAwarded: daysAgo === 6 || daysAgo === 2,
      paidGold: 0,
      seed: true
    };
  }

  // Tính toán ratio & paidGold cho 14 ngày mẫu
  for (let daysAgo = 14; daysAgo >= 1; daysAgo--) {
    const dk = addDays(todayKey, -daysAgo);
    const comp = computeDay(state, dk, { radarRefDateKey: todayKey });
    state.days[dk].ratio = comp.ratio;
    state.days[dk].paidGold = comp.totalGold;
    state.days[dk].harmonyAwarded = comp.isHarmony;
  }

  // Khởi tạo ngày hôm nay trống để người dùng bắt đầu check-in
  state.days[todayKey] = {
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

  // Khởi tạo Boss tuần hiện tại sao cho máu còn khoảng 45-60%
  const currentWeekBoss = computeWeeklyBoss(state, todayKey);
  const desiredMaxHp = Math.max(currentWeekBoss.maxHp, Math.round(currentWeekBoss.damage * 1.9) || 95);
  state.boss[currentWeekBoss.weekKey] = {
    name: currentWeekBoss.name,
    damage: currentWeekBoss.damage,
    killed: false,
    maxHpSnapshot: desiredMaxHp,
    seed: true
  };

  return state;
}

/**
 * Nâng cấp / Migrate dữ liệu từ cấu trúc cũ (nhl_v3 hoặc v1) sang schemaVersion 4
 */
export function migrate(raw, todayKey = toDateKey(new Date())) {
  if (!raw || typeof raw !== 'object') {
    return createSeedState(todayKey);
  }

  if (raw.schemaVersion === SCHEMA_VERSION && raw.days && Array.isArray(raw.habits)) {
    // Đảm bảo các trường mới đều tồn tại
    raw.settings = { ...createDefaultSettings(), ...(raw.settings || {}) };
    raw.inventory = { gold: 100, shields: 1, potions: 1, ...(raw.inventory || {}) };
    raw.rest = { active: false, startDate: null, periods: [], ...(raw.rest || {}) };
    raw.titles = {
      unlocked: [],
      equipped: null,
      progress: {},
      ...(raw.titles || {})
    };
    raw.history = Array.isArray(raw.history) ? raw.history.slice(0, 500) : [];
    raw.stats = {
      harmonyCount: 0,
      pomodoroCount: 0,
      bossKills: 0,
      penaltyQuestsCompleted: 0,
      ...(raw.stats || {})
    };
    return raw;
  }

  // Migrate từ cấu trúc cũ (v1/v3)
  const migrated = createSeedState(todayKey);
  migrated.settings.seedBannerDismissed = true;

  if (Array.isArray(raw.habits) && raw.habits.length > 0) {
    migrated.habits = raw.habits.map((h, i) => ({
      id: h.id || `h_mig_${i}`,
      name: h.name || 'Thói quen',
      element: ['MOC', 'HOA', 'THO', 'KIM', 'THUY'].includes(h.element) ? h.element : 'KIM',
      weight: Number(h.weight) || 5,
      kind: h.kind || 'daily',
      schedule: h.schedule || { mode: 'everyday', days: [1, 2, 3, 4, 5, 6, 7], quota: 7 },
      maxPerDay: Number(h.maxPerDay || 10),
      damage: Number(h.damage || 5),
      startDate: h.startDate || h.createdAt || addDays(todayKey, -30),
      archived: Boolean(h.archived),
      seed: false,
      mastery: typeof h.mastery === 'number' ? h.mastery : 0.5
    }));
  }

  if (typeof raw.gold === 'number') migrated.inventory.gold = raw.gold;
  if (typeof raw.shields === 'number') migrated.inventory.shields = raw.shields;
  if (typeof raw.potions === 'number') migrated.inventory.potions = raw.potions;
  if (typeof raw.hp === 'number') migrated.hp = raw.hp;

  if (raw.records && typeof raw.records === 'object') {
    migrated.days = {};
    for (const [dk, rec] of Object.entries(raw.records)) {
      const entries = {};
      for (const [hId, st] of Object.entries(rec || {})) {
        entries[hId] = {
          state: st,
          count: 0,
          crit: false,
          lootRolled: true,
          tickHour: 12,
          paidGold: 0,
          pomoBonus: false,
          backfilled: false
        };
      }
      migrated.days[dk] = {
        energy: 'full',
        restDay: false,
        note: raw.notes?.[dk] || '',
        entries,
        todosDone: [],
        closed: dk < todayKey,
        ratio: 0,
        penaltyApplied: 0,
        harmonyAwarded: false,
        paidGold: 0,
        seed: false
      };
    }
  }

  migrated.schemaVersion = SCHEMA_VERSION;
  return migrated;
}

/**
 * Xóa lịch sử mẫu (Bắt đầu từ Ngày 1) — Mục 9.1:
 * Xóa mọi DayLog, Todo, lịch sử, boss có seed:true; GIỮ nguyên danh sách thói quen (bỏ cờ seed);
 * reset Streak, pity, stats, hp = maxHp, Boss tuần hiện tại;
 * Vàng/Khiên/Đan Dược về giá trị khởi đầu (Vàng 100, Khiên 1, Đan Dược 1).
 */
export function clearSeedHistoryInState(state, todayKey) {
  // Giữ thói quen nhưng bỏ cờ seed và đặt lại mastery/streak
  state.habits = (state.habits || []).map(h => ({
    ...h,
    seed: false,
    startDate: todayKey,
    mastery: 0.3,
    streakCount: 0
  }));

  // Xóa các DayLog có seed: true (hoặc xóa toàn bộ lịch sử mẫu)
  const cleanDays = {};
  for (const [dk, dLog] of Object.entries(state.days || {})) {
    if (!dLog.seed && dk === todayKey) {
      cleanDays[dk] = dLog;
    }
  }
  cleanDays[todayKey] = {
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
  state.days = cleanDays;

  // Xóa Todo có seed:true
  state.todos = (state.todos || []).filter(t => !t.seed);

  // Xóa lịch sử có seed:true
  state.history = [
    {
      ts: Date.now(),
      type: 'system',
      delta: 0,
      label: 'Đã xóa lịch sử mẫu — Bắt đầu Hành Trình Ngày 1'
    }
  ];

  // Reset Boss, Pity, Stats, Inventory, HP
  state.boss = {};
  state.pity = 0;
  state.flowUntil = 0;
  state.stats = {
    harmonyCount: 0,
    pomodoroCount: 0,
    bossKills: 0,
    penaltyQuestsCompleted: 0,
    globalStreakCached: 0
  };
  state.titles = {
    unlocked: [],
    equipped: null,
    progress: {
      cu_dem: 0,
      doc_ton_toc_do: 0,
      bat_khuat: 0,
      chien_binh_ngu_hanh: 0,
      ke_diet_boss: 0,
      thien_gia: 0
    }
  };
  state.inventory = {
    gold: 100,
    shields: 1,
    potions: 1
  };
  state.createdAt = todayKey;
  state.lastOpenDate = todayKey;
  state.settings.seedBannerDismissed = true;

  const maxHp = computeMaxHp(state, todayKey);
  state.hp = maxHp;

  const bossNow = computeWeeklyBoss(state, todayKey);
  state.boss[bossNow.weekKey] = {
    name: bossNow.name,
    damage: 0,
    killed: false,
    maxHpSnapshot: null
  };

  return state;
}

/**
 * Khởi đầu Trắng (Blank Slate) — Mục 9.2:
 * Xóa 100% dữ liệu (kể cả thói quen, phần thưởng tùy chỉnh).
 */
export function createBlankSlateState(todayKey) {
  const settings = createDefaultSettings();
  settings.seedBannerDismissed = true;

  return {
    schemaVersion: SCHEMA_VERSION,
    createdAt: todayKey,
    lastOpenDate: todayKey,
    settings,
    profile: { hunterName: 'Thợ Săn Mới' },
    habits: [],
    todos: [],
    rewards: [],
    days: {
      [todayKey]: {
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
      }
    },
    rest: { active: false, startDate: null, periods: [] },
    boss: {},
    inventory: { gold: 0, shields: 0, potions: 0 },
    hp: 100,
    maxHpBase: 100,
    pity: 0,
    flowUntil: 0,
    titles: { unlocked: [], equipped: null, progress: {} },
    history: [
      {
        ts: Date.now(),
        type: 'system',
        delta: 0,
        label: 'Khởi đầu Trắng (Blank Slate) đã kích hoạt'
      }
    ],
    stats: {
      harmonyCount: 0,
      pomodoroCount: 0,
      bossKills: 0,
      penaltyQuestsCompleted: 0,
      globalStreakCached: 0
    }
  };
}

/**
 * Kiểm tra tính hợp lệ của file JSON trước khi Restore
 */
export function validateStateSchema(payload) {
  if (!payload || typeof payload !== 'object') {
    return { valid: false, reason: 'Dữ liệu JSON không phải là một đối tượng hợp lệ.' };
  }
  if (!Array.isArray(payload.habits)) {
    return { valid: false, reason: 'Thiếu danh sách thói quen (habits).' };
  }
  if (!payload.days || typeof payload.days !== 'object') {
    return { valid: false, reason: 'Thiếu dữ liệu nhật ký ngày (days).' };
  }
  if (!payload.inventory || typeof payload.inventory.gold !== 'number') {
    return { valid: false, reason: 'Thiếu thông tin kho tài nguyên (inventory.gold).' };
  }
  return { valid: true, reason: null };
}

/* ============================================================================
   LOCAL STORAGE PERSISTENCE LAYER (VỚI DEBOUNCE & DUNG LƯỢNG KIỂM TRA)
   ============================================================================ */

let saveTimer = null;

export function loadFromStorage(todayKey = toDateKey(new Date())) {
  if (typeof localStorage === 'undefined') {
    return createSeedState(todayKey);
  }

  try {
    const rawV4 = localStorage.getItem(STORAGE_KEY);
    if (rawV4) {
      const parsed = JSON.parse(rawV4);
      return migrate(parsed, todayKey);
    }

    for (const legacyKey of LEGACY_KEYS) {
      const rawLegacy = localStorage.getItem(legacyKey);
      if (rawLegacy) {
        const parsedLegacy = JSON.parse(rawLegacy);
        const migrated = migrate(parsedLegacy, todayKey);
        saveToStorageImmediate(migrated);
        return migrated;
      }
    }
  } catch (err) {
    console.error('Lỗi đọc localStorage, tạo lại dữ liệu mặc định:', err);
  }

  const seeded = createSeedState(todayKey);
  saveToStorageImmediate(seeded);
  return seeded;
}

export function saveToStorageImmediate(state) {
  if (typeof localStorage === 'undefined') return true;
  try {
    if (Array.isArray(state.history) && state.history.length > 500) {
      state.history = state.history.slice(0, 500);
    }
    const serialized = JSON.stringify(state);
    localStorage.setItem(STORAGE_KEY, serialized);
    return true;
  } catch (err) {
    console.error('Lỗi ghi localStorage:', err);
    return false;
  }
}

export function saveToStorageDebounced(state, delayMs = 300) {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveToStorageImmediate(state);
    saveTimer = null;
  }, delayMs);
}

export function getStorageUsageInfo() {
  if (typeof localStorage === 'undefined') {
    return { bytes: 0, kb: 0, mb: 0, warning: false };
  }
  try {
    const str = localStorage.getItem(STORAGE_KEY) || '';
    const bytes = new Blob([str]).size;
    const kb = Number((bytes / 1024).toFixed(1));
    const mb = Number((bytes / (1024 * 1024)).toFixed(2));
    return {
      bytes,
      kb,
      mb,
      warning: bytes > 4 * 1024 * 1024 // Cảnh báo khi > 4MB
    };
  } catch {
    return { bytes: 0, kb: 0, mb: 0, warning: false };
  }
}
