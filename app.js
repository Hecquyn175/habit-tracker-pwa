/**
 * ============================================================================
 * SYSTEM: NGŨ HÀNH LEVELING — Core Application & Analytics Engine (app.js)
 * ============================================================================
 * Kiến trúc: 100% Client-side Static PWA, LocalStorage State Management,
 * Chart.js 3-Layer Analytics, SVG Pentagon Radar, Boss Raid, Pomodoro & Shop.
 */

const STORAGE_KEY = 'SYSTEM_NGU_HANH_LEVELING_STATE_V1';

const ELEMENTS = {
  MOC: {
    key: 'MOC',
    name: 'Mộc',
    stat: 'VIT',
    title: 'Sinh Mệnh & Hồi Phục',
    icon: '🌿',
    color: '#10b981',
    badgeClass: 'badge-moc',
    Generates: 'HOA',
    GeneratedBy: 'THUY'
  },
  HOA: {
    key: 'HOA',
    name: 'Hỏa',
    stat: 'WIS',
    title: 'Thần Thức & Ngoại Ngữ',
    icon: '🔥',
    color: '#f97316',
    badgeClass: 'badge-hoa',
    Generates: 'THO',
    GeneratedBy: 'MOC'
  },
  THO: {
    key: 'THO',
    name: 'Thổ',
    stat: 'WIL',
    title: 'Định Lực & Thể Phách',
    icon: '🪨',
    color: '#f59e0b',
    badgeClass: 'badge-tho',
    Generates: 'KIM',
    GeneratedBy: 'HOA'
  },
  KIM: {
    key: 'KIM',
    name: 'Kim',
    stat: 'DEX',
    title: 'Thực Thi & Xuất Chiêu',
    icon: '⚔️',
    color: '#38bdf8',
    badgeClass: 'badge-kim',
    Generates: 'THUY',
    GeneratedBy: 'THO'
  },
  THUY: {
    key: 'THUY',
    name: 'Thủy',
    stat: 'INT',
    title: 'Tĩnh Trí & Ngộ Tính',
    icon: '💧',
    color: '#818cf8',
    badgeClass: 'badge-thuy',
    Generates: 'MOC',
    GeneratedBy: 'KIM'
  }
};

// Chu trình Ngũ Hành Tương Sinh: Mộc ➔ Hỏa ➔ Thổ ➔ Kim ➔ Thủy ➔ Mộc
const ELEMENT_ORDER = ['MOC', 'HOA', 'THO', 'KIM', 'THUY'];

// Chu trình 5 mức click trong bảng nhiệm vụ tuần
const CHECKIN_CYCLE = [0, 1, 0.5, 1.5, 'freeze'];

// Danh sách Boss Hầm Ngục Tuần xoay vòng theo số tuần trong năm
const WEEKLY_BOSSES = [
  {
    name: 'Thực Thể Trì Hoãn (Chronos Devourer)',
    avatar: '👹',
    rank: '[S-RANK DUNGEON BOSS]',
    lore: 'Kẻ đánh cắp thời gian và làm tê liệt ý chí mỗi tối. Mọi điểm nỗ lực trong tuần sẽ giáng sát thương trực diện!',
    titleReward: '👑 Kẻ Chinh Phục Trì Hoãn'
  },
  {
    name: 'Ma Ảnh Phân Tâm (Phantom of Distraction)',
    avatar: '👁️‍🗨️',
    rank: '[S-RANK SHADOW BOSS]',
    lore: 'Quái vật sinh ra từ thông báo mạng xã hội và sự mất tập trung. Hãy dùng Kim & Thủy kiếm khí để chém tan!',
    titleReward: '⚔️ Kiếm Thánh Tuyệt Đối Tập Trung'
  },
  {
    name: 'Khổng Lồ Mệt Mỏi (Titan of Burnout)',
    avatar: '🗿',
    rank: '[S-RANK ANCIENT BOSS]',
    lore: 'Áp lực tích tụ khi thiếu ngủ và thiếu kỷ luật vận động. Duy trì Mộc & Thổ linh căn để nghiền nát hắn!',
    titleReward: '🔥 Chiến Thần Bất Diệt'
  },
  {
    name: 'Hư Không Lười Biếng (Abyssal Sloth)',
    avatar: '🐉',
    rank: '[NATIONAL-LEVEL BOSS]',
    lore: 'Thực thể cổ đại kéo con người vào vùng an toàn giả tạo. Kích hoạt Ngũ Hành Hợp Nhất để kết liễu!',
    titleReward: '🌌 Chí Tôn Ngũ Hành Vương'
  }
];

// Danh sách Nhiệm Vụ Phạt bắt buộc khi HP = 0
const PENALTY_QUESTS = [
  'Chống đẩy 30 cái hoặc Dọn dẹp bàn học trong 10 phút',
  'Squat 40 cái liên tục & Uống ngay 500ml nước lọc',
  'Tắt điện thoại 20 phút & Đọc 5 trang sách chuyên ngành',
  'Plank 90 giây & Viết ra 3 mục tiêu quan trọng nhất hôm nay'
];

class NguHanhLevelingApp {
  constructor() {
    this.state = null;
    this.chartInstance = null;
    this.chartRange = 14; // Mặc định hiển thị 14 ngày để thấy trọn vẹn dữ liệu mẫu 2 tuần
    this.currentWeekOffset = 0; // 0 = tuần này, -1 = tuần trước, +1 = tuần sau
    this.elementFilter = 'ALL';

    // Pomodoro state
    this.pomoTimer = null;
    this.pomoTotalSeconds = 25 * 60;
    this.pomoRemainingSeconds = 25 * 60;
    this.pomoRunning = false;

    this.init();
  }

  /* ==========================================================================
     1. TIỆN ÍCH NGÀY THÁNG (LOCAL DATE HELPERS)
     ========================================================================== */

  formatDateKey(dateObj) {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  getDateDaysAgo(daysAgo) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - daysAgo);
    return d;
  }

  getDateKeyDaysAgo(daysAgo) {
    return this.formatDateKey(this.getDateDaysAgo(daysAgo));
  }

  getTodayKey() {
    return this.getDateKeyDaysAgo(0);
  }

  parseDateKey(dateKey) {
    const [y, m, d] = dateKey.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  formatShortVNDate(dateKey) {
    const [, m, d] = dateKey.split('-');
    return `${d}/${m}`;
  }

  formatFullVNDate(dateKey) {
    const dateObj = this.parseDateKey(dateKey);
    const dayNames = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    const [, m, d] = dateKey.split('-');
    return `${dayNames[dateObj.getDay()]}, ${d}/${m}/${dateObj.getFullYear()}`;
  }

  getMondayOfWeek(offsetWeeks = 0) {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const day = now.getDay(); // 0 (CN) -> 6 (T7)
    const diffToMonday = day === 0 ? -6 : 1 - day;
    now.setDate(now.getDate() + diffToMonday + offsetWeeks * 7);
    return now;
  }

  getWeekDateKeys(offsetWeeks = 0) {
    const monday = this.getMondayOfWeek(offsetWeeks);
    const keys = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      keys.push(this.formatDateKey(d));
    }
    return keys;
  }

  getWeekId(offsetWeeks = 0) {
    const monday = this.getMondayOfWeek(offsetWeeks);
    return `WEEK_${this.formatDateKey(monday)}`;
  }

  /* ==========================================================================
     2. KHỞI TẠO & DỮ LIỆU MẪU PHONG PHÚ (RICH SEED DATA - PHẦN 5)
     ========================================================================== */

  init() {
    this.loadState();
    this.checkDailyHpPenalty();
    this.syncSoundButtonUI();
    this.renderAll();
    this.registerServiceWorker();
  }

  loadState() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        this.state = JSON.parse(raw);
        return;
      } catch (e) {
        console.error('Lỗi đọc dữ liệu localStorage, khởi tạo lại seed data:', e);
      }
    }
    this.state = this.createRichSeedData();
    this.saveState();
  }

  saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
  }

  /**
   * Tạo dữ liệu mẫu sống động cho 14 ngày gần nhất (+ nền 60 ngày cho Heatmap 90 ngày)
   * với đúng 5 thói quen thực tế theo yêu cầu Phần 5.
   */
  createRichSeedData() {
    const habits = [
      {
        id: 'h_thuy_yolo',
        name: 'Đọc paper & Nghiên cứu mô hình YOLO',
        element: 'THUY',
        weight: 5,
        createdAt: this.getDateKeyDaysAgo(45)
      },
      {
        id: 'h_kim_code',
        name: 'Code thực nghiệm & Commit GitHub',
        element: 'KIM',
        weight: 5,
        createdAt: this.getDateKeyDaysAgo(45)
      },
      {
        id: 'h_hoa_toeic',
        name: 'Luyện đề TOEIC 45 phút (Listening/Reading)',
        element: 'HOA',
        weight: 4,
        createdAt: this.getDateKeyDaysAgo(45)
      },
      {
        id: 'h_tho_run',
        name: 'Vận động / Chạy bộ 30 phút & Giữ kỷ luật',
        element: 'THO',
        weight: 3,
        createdAt: this.getDateKeyDaysAgo(45)
      },
      {
        id: 'h_moc_sleep',
        name: 'Ngủ trước 23h30 & Uống đủ 2L nước',
        element: 'MOC',
        weight: 3,
        createdAt: this.getDateKeyDaysAgo(45)
      }
    ];

    const records = {};
    const notes = {};

    // Kịch bản mẫu chi tiết cho 14 ngày gần nhất (từ 13 ngày trước đến hôm nay = 0)
    // Giúp đồ thị Hiện tại, Đường Bóng Ma (Ghost Line), MA7 và Radar Ngũ Hành sống động ngay lập tức
    const fourteenDayPatterns = {
      13: { h_thuy_yolo: 1, h_kim_code: 0.5, h_hoa_toeic: 1, h_tho_run: 0, h_moc_sleep: 1 },
      12: { h_thuy_yolo: 0.5, h_kim_code: 1, h_hoa_toeic: 0, h_tho_run: 1, h_moc_sleep: 1 },
      11: { h_thuy_yolo: 1, h_kim_code: 1, h_hoa_toeic: 1, h_tho_run: 0.5, h_moc_sleep: 0.5 },
      10: { h_thuy_yolo: 0, h_kim_code: 1, h_hoa_toeic: 1, h_tho_run: 1, h_moc_sleep: 1 },
      9:  { h_thuy_yolo: 1, h_kim_code: 1, h_hoa_toeic: 0.5, h_tho_run: 'freeze', h_moc_sleep: 1 },
      8:  { h_thuy_yolo: 1, h_kim_code: 1.5, h_hoa_toeic: 1, h_tho_run: 1, h_moc_sleep: 1 }, // Ngũ Hành Hợp Nhất
      7:  { h_thuy_yolo: 0.5, h_kim_code: 1, h_hoa_toeic: 1, h_tho_run: 0.5, h_moc_sleep: 1 },
      6:  { h_thuy_yolo: 1, h_kim_code: 1, h_hoa_toeic: 1, h_tho_run: 1, h_moc_sleep: 1 }, // Ngũ Hành Hợp Nhất
      5:  { h_thuy_yolo: 1.5, h_kim_code: 1, h_hoa_toeic: 0.5, h_tho_run: 1, h_moc_sleep: 1 },
      4:  { h_thuy_yolo: 1, h_kim_code: 1.5, h_hoa_toeic: 1, h_tho_run: 0.5, h_moc_sleep: 1 },
      3:  { h_thuy_yolo: 1, h_kim_code: 1, h_hoa_toeic: 1.5, h_tho_run: 1, h_moc_sleep: 1 }, // Ngũ Hành Hợp Nhất + Overdrive
      2:  { h_thuy_yolo: 0.5, h_kim_code: 1, h_hoa_toeic: 1, h_tho_run: 1, h_moc_sleep: 0.5 },
      1:  { h_thuy_yolo: 1, h_kim_code: 1.5, h_hoa_toeic: 1, h_tho_run: 1, h_moc_sleep: 1 }, // Hôm qua xuất sắc
      0:  { h_thuy_yolo: 1, h_kim_code: 1, h_hoa_toeic: 1, h_tho_run: 1, h_moc_sleep: 0 } // Hôm nay đã làm 4/5 hành (để người dùng bấm nốt Mộc là nổ Ngũ Hành Hợp Nhất!)
    };

    const sampleNotes = {
      13: 'Bắt đầu đọc kiến trúc backbone CSPDarknet của YOLO, ghi chép 3 trang.',
      11: 'Refactor thành công dataloader PyTorch, tốc độ train tăng 18%.',
      9: 'Ngày bận họp lab, dùng 1 Khiên Định Hồn cho bài chạy bộ.',
      8: '🔥 Bứt phá cuối tuần! Đạt Ngũ Hành Hợp Nhất, commit 6 PR lên GitHub.',
      6: 'Giải full 1 đề TOEIC ETS đạt 865 điểm, chạy bộ 3.5km quanh hồ.',
      5: 'Đọc sâu paper YOLOv10 NMS-free training, hiểu rõ cơ chế Dual Label Assignments.',
      3: '⚡ Overdrive! Hoàn thành sớm toàn bộ mục tiêu và ngủ trước 23h00.',
      1: 'Tối ưu hóa mAP thêm 2.4% trên tập validation, tinh thần cực kỳ minh mẫn.',
      0: 'Hôm nay đã hoàn thành Thủy, Kim, Hỏa, Thổ! Chỉ còn nhiệm vụ Hành Mộc để kích hoạt Ngũ Hành Hợp Nhất!'
    };

    // Điền dữ liệu nền nhẹ nhàng từ ngày 40 -> 14 trước đó để Heatmap 90 ngày và biểu đồ 30 ngày đẹp mắt
    for (let d = 40; d >= 14; d--) {
      const key = this.getDateKeyDaysAgo(d);
      records[key] = {
        h_thuy_yolo: d % 3 === 0 ? 1 : (d % 2 === 0 ? 0.5 : 0),
        h_kim_code: d % 2 === 0 ? 1 : 0.5,
        h_hoa_toeic: d % 4 === 0 ? 0 : 1,
        h_tho_run: d % 3 === 1 ? 1 : 0.5,
        h_moc_sleep: d % 5 === 0 ? 0.5 : 1
      };
    }

    // Điền 14 ngày gần nhất
    Object.keys(fourteenDayPatterns).forEach(daysAgoStr => {
      const daysAgo = Number(daysAgoStr);
      const dateKey = this.getDateKeyDaysAgo(daysAgo);
      records[dateKey] = { ...fourteenDayPatterns[daysAgo] };
      if (sampleNotes[daysAgo]) {
        notes[dateKey] = sampleNotes[daysAgo];
      }
    });

    return {
      hp: 85,
      maxHp: 100,
      gold: 640,
      shields: 2,
      potions: 2,
      penaltyActive: false,
      penaltyQuestIndex: 0,
      lastPenaltyCheckDate: this.getTodayKey(),
      harmonyRewardedDates: {
        [this.getDateKeyDaysAgo(8)]: true,
        [this.getDateKeyDaysAgo(6)]: true,
        [this.getDateKeyDaysAgo(3)]: true,
        [this.getDateKeyDaysAgo(1)]: true
      },
      bossDefeatedWeeks: {},
      earnedTitles: ['👑 Kẻ Chinh Phục Hầm Ngục'],
      habits,
      records,
      notes,
      customRewards: [
        { id: 'rw_tft', title: 'Chơi 2 trận Đấu Trường Chân Lý', cost: 120, icon: '🎮' },
        { id: 'rw_movie', title: 'Xem 1 tập phim Anime / Netflix', cost: 150, icon: '🍿' },
        { id: 'rw_drink', title: 'Uống 1 ly trà sữa / cà phê ngon', cost: 200, icon: '🧋' },
        { id: 'rw_cheatmeal', title: 'Bữa ăn Cheat Meal cuối tuần', cost: 350, icon: '🍕' }
      ],
      shopHistory: [
        {
          id: 'log_1',
          time: 'Hôm qua, 21:15',
          text: 'Mua [Uống 1 ly trà sữa / cà phê ngon] (-200 🪙)',
          type: 'spend'
        },
        {
          id: 'log_2',
          time: '3 ngày trước',
          text: 'Rương Bóng Tối rơi ra [+1 Khiên Định Hồn 🛡️]',
          type: 'loot'
        }
      ]
    };
  }

  /* ==========================================================================
     3. THUẬT TOÁN TÍNH ĐIỂM ĐA TẦNG, TƯƠNG SINH & NGŨ HÀNH HỢP NHẤT
     ========================================================================== */

  /**
   * Kiểm tra một hành có ít nhất 1 thói quen đạt mức >= 1 (1 hoặc 1.5) trong ngày `dateKey` không
   */
  isElementCompletedOnDate(elementKey, dateKey) {
    const dayRecord = this.state.records[dateKey] || {};
    return this.state.habits.some(h => {
      if (h.element !== elementKey) return false;
      const val = dayRecord[h.id];
      return typeof val === 'number' && val >= 1;
    });
  }

  /**
   * Kiểm tra Hành Con có đang nhận hiệu ứng [Tương Sinh +20% Điểm] từ Hành Mẹ trong ngày `dateKey` không
   */
  hasTuongSinhBonus(elementKey, dateKey) {
    const parentElement = ELEMENTS[elementKey]?.GeneratedBy;
    if (!parentElement) return false;
    return this.isElementCompletedOnDate(parentElement, dateKey);
  }

  /**
   * Kiểm tra ngày `dateKey` có kích hoạt "NGŨ HÀNH HỢP NHẤT" (cả 5 hành đều có ít nhất 1 thói quen >= 1)
   */
  hasElementalHarmony(dateKey) {
    return ELEMENT_ORDER.every(elKey => this.isElementCompletedOnDate(elKey, dateKey));
  }

  /**
   * Tính điểm chi tiết cho 1 ngày `dateKey`
   */
  calculateDayStats(dateKey) {
    const dayRecord = this.state.records[dateKey] || {};
    let baseMaxScore = 0;
    let rawEffortScore = 0;
    let tuongSinhBonusScore = 0;
    let hasAnyActivity = false;
    let allFrozenOrActive = true;

    this.state.habits.forEach(habit => {
      baseMaxScore += habit.weight;
      const status = dayRecord[habit.id] ?? 0;

      if (status === 'freeze') {
        hasAnyActivity = true;
      } else if (typeof status === 'number' && status > 0) {
        hasAnyActivity = true;
        const habitBase = habit.weight * status;
        rawEffortScore += habitBase;

        // Nếu Hành Mẹ đã hoàn thành (>= 1) trong ngày đó ➔ +20% điểm Tương Sinh
        if (this.hasTuongSinhBonus(habit.element, dateKey)) {
          tuongSinhBonusScore += habitBase * 0.2;
        }
      } else {
        allFrozenOrActive = false;
      }
    });

    const subtotal = rawEffortScore + tuongSinhBonusScore;
    const isHarmony = this.hasElementalHarmony(dateKey);
    const harmonyBonusScore = isHarmony ? subtotal * 0.25 : 0;
    const totalScore = Number((subtotal + harmonyBonusScore).toFixed(1));
    const completionPct = baseMaxScore > 0 ? Math.round((totalScore / baseMaxScore) * 100) : 0;

    return {
      dateKey,
      baseMaxScore,
      rawEffortScore: Number(rawEffortScore.toFixed(1)),
      tuongSinhBonusScore: Number(tuongSinhBonusScore.toFixed(1)),
      harmonyBonusScore: Number(harmonyBonusScore.toFixed(1)),
      totalScore,
      completionPct,
      isHarmony,
      hasAnyActivity,
      allFrozenOrActive
    };
  }

  /**
   * Tính chuỗi Streak riêng của 1 thói quen (tính từ hôm nay hoặc hôm qua ngược về trước)
   * Mức 0.5, 1, 1.5 và 'freeze' đều giữ chuỗi Streak không bị đứt.
   */
  calculateHabitStreak(habitId) {
    let streak = 0;
    for (let i = 0; i <= 365; i++) {
      const dateKey = this.getDateKeyDaysAgo(i);
      const val = (this.state.records[dateKey] || {})[habitId] ?? 0;
      const kept = val === 'freeze' || (typeof val === 'number' && val >= 0.5);
      if (kept) {
        streak++;
      } else {
        // Nếu hôm nay (i === 0) chưa tick thì kiểm tra tiếp từ hôm qua
        if (i === 0) continue;
        break;
      }
    }
    return streak;
  }

  /**
   * Tính Chuỗi Ngày Bất Bại (Global Streak): Ngày đạt >= 50% mục tiêu hoặc có dùng Khiên Định Hồn
   */
  calculateGlobalStreak() {
    let streak = 0;
    for (let i = 0; i <= 365; i++) {
      const dateKey = this.getDateKeyDaysAgo(i);
      const stats = this.calculateDayStats(dateKey);
      const dayRec = this.state.records[dateKey] || {};
      const hasFreeze = Object.values(dayRec).some(v => v === 'freeze');

      if (stats.completionPct >= 50 || hasFreeze) {
        streak++;
      } else {
        if (i === 0) continue;
        break;
      }
    }
    return streak;
  }

  /**
   * Tính Hạng Thợ Săn (Hunter Rank) dựa trên Hiệu suất trung bình 7 ngày gần nhất
   */
  calculateHunterRank() {
    let sumPct = 0;
    for (let i = 0; i < 7; i++) {
      const stats = this.calculateDayStats(this.getDateKeyDaysAgo(i));
      sumPct += stats.completionPct;
    }
    const avg7d = Math.round(sumPct / 7);

    let rankCode = 'E';
    let rankTitle = 'Rank E — Tân Thủ Linh Đồ';
    let pillClass = 'bg-slate-600 text-white';

    if (avg7d >= 110) {
      rankCode = 'NATIONAL';
      rankTitle = 'National Level — Thợ Săn Cấp Quốc Gia';
      pillClass = 'bg-gradient-to-r from-amber-400 via-fuchsia-500 to-sky-400 text-slate-950';
    } else if (avg7d >= 95) {
      rankCode = 'RANK S';
      rankTitle = 'Rank S — Quân Vương Ngũ Hành';
      pillClass = 'bg-fuchsia-500 text-white';
    } else if (avg7d >= 80) {
      rankCode = 'RANK A';
      rankTitle = 'Rank A — Đại Sư Linh Căn';
      pillClass = 'bg-amber-500 text-slate-950';
    } else if (avg7d >= 65) {
      rankCode = 'RANK B';
      rankTitle = 'Rank B — Tinh Anh Linh Căn';
      pillClass = 'bg-sky-500 text-slate-950';
    } else if (avg7d >= 45) {
      rankCode = 'RANK C';
      rankTitle = 'Rank C — Thợ Săn Thực Chiến';
      pillClass = 'bg-emerald-500 text-slate-950';
    } else if (avg7d >= 25) {
      rankCode = 'RANK D';
      rankTitle = 'Rank D — Thợ Săn Sơ Cấp';
      pillClass = 'bg-indigo-500 text-white';
    }

    return { avg7d, rankCode, rankTitle, pillClass };
  }

  /* ==========================================================================
     4. CƠ CHẾ SINH MỆNH (HP BAR) & KHU VỰC PHẠT (PENALTY ZONE)
     ========================================================================== */

  checkDailyHpPenalty() {
    const todayKey = this.getTodayKey();
    if (this.state.lastPenaltyCheckDate !== todayKey) {
      const yesterdayKey = this.getDateKeyDaysAgo(1);
      const yStats = this.calculateDayStats(yesterdayKey);
      const yRec = this.state.records[yesterdayKey] || {};
      const usedFreezeYesterday = Object.values(yRec).some(v => v === 'freeze');

      if (yStats.completionPct < 50 && !usedFreezeYesterday && this.state.habits.length > 0) {
        this.state.hp = Math.max(0, this.state.hp - 20);
        this.showToast(
          '⚠️ Cảnh Báo Hệ Thống',
          `Hôm qua đạt ${yStats.completionPct}% (< 50% mục tiêu). Bị trừ -20 HP!`,
          'crimson'
        );
      }
      this.state.lastPenaltyCheckDate = todayKey;
    }

    if (this.state.hp <= 0) {
      this.state.hp = 0;
      this.state.penaltyActive = true;
      playPenaltyAlarm();
    } else {
      this.state.penaltyActive = false;
    }
    this.saveState();
  }

  triggerPenaltyDemo() {
    this.state.hp = 0;
    this.state.penaltyActive = true;
    this.saveState();
    playPenaltyAlarm();
    this.triggerScreenShake();
    this.renderAll();
    this.showToast(
      '🚨 KÍCH HOẠT KHU VỰC PHẠT',
      'HP = 0! Hãy hoàn thành nhiệm vụ phạt trên đỉnh màn hình để hồi sinh 50 HP.',
      'crimson'
    );
  }

  rerollPenaltyQuest() {
    this.state.penaltyQuestIndex = (this.state.penaltyQuestIndex + 1) % PENALTY_QUESTS.length;
    this.saveState();
    this.renderTopHUD();
  }

  completePenaltyQuest() {
    this.state.hp = 50;
    this.state.penaltyActive = false;
    this.saveState();
    playLevelUp();
    this.fireConfetti();
    this.renderAll();
    this.showToast(
      '⚡ ĐÃ THOÁT KHU VỰC PHẠT!',
      'Chúc mừng Thợ Săn vượt qua hình phạt! Hồi phục +50 HP và mở khóa Cửa Hàng.',
      'emerald'
    );
  }

  useHpPotion() {
    if (this.state.potions <= 0) {
      this.showToast('🧪 Hết Đan Dược HP', 'Bạn chưa có Bình Hồi Phục. Hãy mua trong Cửa Hàng (80 Vàng)!', 'amber');
      return;
    }
    if (this.state.hp >= this.state.maxHp && !this.state.penaltyActive) {
      this.showToast('💚 Sinh Mệnh Đã Đầy', 'Thanh máu của bạn đang ở mức tối đa 100 / 100 HP!', 'cyan');
      return;
    }

    this.state.potions -= 1;
    this.state.hp = Math.min(this.state.maxHp, this.state.hp + 30);
    if (this.state.hp > 0) {
      this.state.penaltyActive = false;
    }
    this.saveState();
    playLevelUp();
    this.renderAll();
    this.showToast('🧪 Đã Dùng Đan Dược', 'Hồi phục +30 HP Sinh Mệnh thành công!', 'emerald');
  }

  /* ==========================================================================
     5. XOAY VÒNG TRẠNG THÁI CHECK-IN (5 MỨC) & NỔ RƯƠNG BÓNG TỐI (LOOT DROP)
     ========================================================================== */

  cycleHabitStatus(habitId, dateKey) {
    const habit = this.state.habits.find(h => h.id === habitId);
    if (!habit) return;

    if (!this.state.records[dateKey]) {
      this.state.records[dateKey] = {};
    }

    const currentVal = this.state.records[dateKey][habitId] ?? 0;
    const currentIndex = CHECKIN_CYCLE.indexOf(currentVal);
    let nextVal = CHECKIN_CYCLE[(currentIndex + 1) % CHECKIN_CYCLE.length];

    // Nếu chuyển sang trạng thái 'freeze', kiểm tra số lượng Khiên Định Hồn
    if (nextVal === 'freeze') {
      if (this.state.shields <= 0) {
        this.showToast(
          '🛡️ Không Đủ Khiên Định Hồn',
          'Bạn cần ít nhất 1 Khiên Định Hồn trong túi đồ để đóng băng chuỗi (Mua tại Cửa Hàng giá 100 🪙). Đã chuyển về Chưa làm.',
          'amber'
        );
        nextVal = 0;
      } else {
        this.state.shields -= 1;
        this.showToast(
          '🛡️ Kích Hoạt Khiên Định Hồn!',
          `Đã dùng 1 Khiên Định Hồn bảo toàn chuỗi Streak cho [${habit.name}].`,
          'cyan'
        );
      }
    }

    // Nếu rời khỏi trạng thái 'freeze' về 0, hoàn trả lại 1 Khiên Định Hồn
    if (currentVal === 'freeze' && nextVal !== 'freeze') {
      this.state.shields += 1;
    }

    // Tính chênh lệch Vàng thưởng của ô này
    const oldGold = this.getGoldForStatus(habit.weight, currentVal);
    const newGold = this.getGoldForStatus(habit.weight, nextVal);
    const goldDiff = newGold - oldGold;
    this.state.gold = Math.max(0, this.state.gold + goldDiff);

    // Cập nhật trạng thái
    if (nextVal === 0) {
      delete this.state.records[dateKey][habitId];
    } else {
      this.state.records[dateKey][habitId] = nextVal;
    }

    // Phát âm thanh và hiệu ứng theo trạng thái
    if (nextVal === 1.5) {
      playOverdrive();
      this.animateBossHit();
    } else if (nextVal === 1 || nextVal === 0.5) {
      playSlash();
      this.animateBossHit();
    } else if (nextVal === 'freeze') {
      playSlash();
    }

    // Kiểm tra kích hoạt NGŨ HÀNH HỢP NHẤT (Elemental Harmony)
    const dayStats = this.calculateDayStats(dateKey);
    if (dayStats.isHarmony && !this.state.harmonyRewardedDates[dateKey]) {
      this.state.harmonyRewardedDates[dateKey] = true;
      this.state.hp = Math.min(this.state.maxHp, this.state.hp + 15);
      if (this.state.hp > 0) this.state.penaltyActive = false;

      playOverdrive();
      this.fireConfetti();
      this.showToast(
        '🌌 NGŨ HÀNH HỢP NHẤT (ELEMENTAL HARMONY)!',
        'Cả 5 hành Kim - Mộc - Thủy - Hỏa - Thổ đã hội tụ! Cộng thưởng +25% Tổng điểm nỗ lực hôm nay & Hồi phục +15 HP!',
        'purple'
      );
    }

    // Tỷ lệ 20% rớt "Rương Bóng Tối" (Mystery Loot Drop) khi bấm hoàn thành (mức 1 hoặc 1.5)
    if ((nextVal === 1 || nextVal === 1.5) && Math.random() < 0.2) {
      this.triggerMysteryLootDrop();
    }

    // Kiểm tra hạ gục Boss Hầm Ngục Tuần
    this.checkWeeklyBossDefeat();

    this.saveState();
    this.renderAll();
  }

  getGoldForStatus(weight, status) {
    if (status === 1) return weight * 10;
    if (status === 1.5) return weight * 20; // Gấp đôi vàng khi Overdrive
    if (status === 0.5) return Math.round(weight * 5);
    return 0;
  }

  triggerMysteryLootDrop() {
    setTimeout(() => {
      playChestOpen();
      this.triggerScreenShake();

      const roll = Math.random();
      let lootTitle = '';
      let lootDesc = '';

      if (roll < 0.5) {
        this.state.gold += 30;
        lootTitle = '🎁 RƯƠNG BÓNG TỐI NỔ LỚN!';
        lootDesc = 'Bạn nhặt được [+30 🪙 Vàng] từ quái vật hầm ngục!';
      } else if (roll < 0.78) {
        this.state.potions += 1;
        lootTitle = '🎁 RƯƠNG BÓNG TỐI HIẾM!';
        lootDesc = 'Bạn nhặt được [+1 🧪 Bình Máu Hồi Phục HP]!';
      } else {
        this.state.shields += 1;
        lootTitle = '🎁 RƯƠNG BÓNG TỐI CỰC PHẨM!';
        lootDesc = 'Bạn nhặt được [+1 🛡️ Khiên Định Hồn] bảo vệ Streak!';
      }

      this.state.shopHistory.unshift({
        id: 'loot_' + Date.now(),
        time: 'Vừa xong',
        text: `Nổ Rương Bóng Tối: ${lootDesc}`,
        type: 'loot'
      });

      this.saveState();
      this.renderTopHUD();
      this.showToast(lootTitle, lootDesc, 'gold', true);
    }, 180);
  }

  /* ==========================================================================
     6. BOSS HẦM NGỤC TUẦN (WEEKLY DUNGEON RAID)
     ========================================================================== */

  getWeeklyBossData(offsetWeeks = 0) {
    const weekKeys = this.getWeekDateKeys(offsetWeeks);
    const weekId = this.getWeekId(offsetWeeks);

    // Chọn Boss theo tuần
    const mondayDate = this.getMondayOfWeek(offsetWeeks);
    const weekNumber = Math.abs(Math.floor(mondayDate.getTime() / (7 * 24 * 3600 * 1000)));
    const bossTemplate = WEEKLY_BOSSES[weekNumber % WEEKLY_BOSSES.length];

    // Max HP = Tổng điểm cơ bản tối đa 1 tuần * 80%
    const dailyMax = this.state.habits.reduce((acc, h) => acc + h.weight, 0);
    const weeklyMaxPossible = dailyMax * 7;
    const bossMaxHp = Math.max(20, Math.round(weeklyMaxPossible * 0.8));

    // Tổng sát thương = Tổng điểm nỗ lực người dùng kiếm được trong 7 ngày của tuần đó
    let damageDealt = 0;
    weekKeys.forEach(k => {
      damageDealt += this.calculateDayStats(k).totalScore;
    });
    damageDealt = Number(damageDealt.toFixed(1));

    const remainingHp = Math.max(0, Number((bossMaxHp - damageDealt).toFixed(1)));
    const hpPercent = bossMaxHp > 0 ? Math.max(0, Math.min(100, (remainingHp / bossMaxHp) * 100)) : 0;
    const isDefeated = remainingHp <= 0;

    return {
      weekId,
      bossTemplate,
      bossMaxHp,
      damageDealt,
      remainingHp,
      hpPercent,
      isDefeated
    };
  }

  checkWeeklyBossDefeat() {
    const bossData = this.getWeeklyBossData(0);
    if (bossData.isDefeated && !this.state.bossDefeatedWeeks[bossData.weekId]) {
      this.state.bossDefeatedWeeks[bossData.weekId] = true;
      this.state.gold += 200;
      if (!this.state.earnedTitles.includes(bossData.bossTemplate.titleReward)) {
        this.state.earnedTitles.unshift(bossData.bossTemplate.titleReward);
      }

      this.state.shopHistory.unshift({
        id: 'boss_' + Date.now(),
        time: 'Vừa xong',
        text: `Hạ gục Boss [${bossData.bossTemplate.name}]: Nhận +200 🪙 & ${bossData.bossTemplate.titleReward}`,
        type: 'loot'
      });

      setTimeout(() => {
        playLevelUp();
        this.fireConfetti();
        this.showToast(
          '⚔️ BOSS HẦM NGỤC TUẦN ĐÃ BỊ TIÊU DIỆT!',
          `Thưởng nóng +200 🪙 Vàng và Danh hiệu [${bossData.bossTemplate.titleReward}]!`,
          'gold',
          true
        );
      }, 260);
    }
  }

  animateBossHit() {
    const bossCard = document.getElementById('boss-raid-card');
    if (!bossCard) return;
    bossCard.classList.remove('boss-hit-anim');
    void bossCard.offsetWidth;
    bossCard.classList.add('boss-hit-anim');
  }

  triggerScreenShake() {
    const wrapper = document.getElementById('app-wrapper');
    if (!wrapper) return;
    wrapper.classList.remove('shake-screen');
    void wrapper.offsetWidth;
    wrapper.classList.add('shake-screen');
  }

  /* ==========================================================================
     7. RENDER TOÀN BỘ GIAO DIỆN (HUD, CHART, HEATMAP, MATRIX, RADAR, BOSS)
     ========================================================================== */

  renderAll() {
    this.renderTopHUD();
    this.renderEffortChart();
    this.renderHeatmap90Days();
    this.renderWeeklyMatrix();
    this.renderPentagonRadarSVG();
    this.renderBossRaidCard();
  }

  renderTopHUD() {
    // Penalty Zone Toggle
    const penaltyBanner = document.getElementById('penalty-zone-banner');
    if (this.state.penaltyActive || this.state.hp <= 0) {
      document.body.classList.add('penalty-zone-active');
      penaltyBanner.classList.remove('hidden');
      document.getElementById('penalty-quest-text').textContent =
        PENALTY_QUESTS[this.state.penaltyQuestIndex % PENALTY_QUESTS.length];
    } else {
      document.body.classList.remove('penalty-zone-active');
      penaltyBanner.classList.add('hidden');
    }

    // Hunter Rank
    const rankInfo = this.calculateHunterRank();
    const rankPill = document.getElementById('hud-rank-pill');
    rankPill.textContent = rankInfo.rankCode;
    rankPill.className = `absolute -bottom-2 -right-2 px-2 py-0.5 text-[11px] font-hud font-black rounded shadow ${rankInfo.pillClass}`;
    document.getElementById('hunter-rank-name').textContent = rankInfo.rankTitle;
    document.getElementById('hunter-avg-7d').textContent = `${rankInfo.avg7d}%`;

    // Weekly Title Badge
    const titleBadge = document.getElementById('weekly-title-badge');
    if (this.state.earnedTitles && this.state.earnedTitles.length > 0) {
      titleBadge.textContent = this.state.earnedTitles[0];
      titleBadge.classList.remove('hidden');
    } else {
      titleBadge.classList.add('hidden');
    }

    // HP Bar
    const hpPct = Math.max(0, Math.min(100, Math.round((this.state.hp / this.state.maxHp) * 100)));
    document.getElementById('hp-status-text').textContent = `${this.state.hp} / ${this.state.maxHp} HP`;
    const hpFill = document.getElementById('hp-bar-fill');
    hpFill.style.width = `${hpPct}%`;
    if (hpPct <= 25) {
      hpFill.className = 'hp-bar-fill h-full rounded-full bg-gradient-to-r from-red-700 to-rose-500';
    } else if (hpPct <= 60) {
      hpFill.className = 'hp-bar-fill h-full rounded-full bg-gradient-to-r from-amber-600 to-yellow-400';
    } else {
      hpFill.className = 'hp-bar-fill h-full rounded-full bg-gradient-to-r from-rose-600 via-emerald-500 to-teal-400';
    }

    // Kho Tài Nguyên
    document.getElementById('stat-gold').textContent = this.state.gold.toLocaleString('vi-VN');
    document.getElementById('stat-shields').textContent = this.state.shields;
    document.getElementById('stat-potions').textContent = this.state.potions;
    document.getElementById('stat-global-streak').textContent = this.calculateGlobalStreak();
  }

  /* ==========================================================================
     8. ĐỒ THỊ SỰ CỐ GẮNG ĐA TẦNG (CHART.JS: CURRENT + GHOST LINE + MA7)
     ========================================================================== */

  setChartRange(days) {
    this.chartRange = days;
    [7, 14, 30].forEach(d => {
      const btn = document.getElementById(`range-btn-${d}`);
      if (!btn) return;
      if (d === days) {
        btn.className = 'px-3 py-1 rounded-md text-xs font-hud font-bold transition bg-sky-500 text-slate-950';
      } else {
        btn.className = 'px-3 py-1 rounded-md text-xs font-hud font-bold transition text-slate-300 hover:text-white';
      }
    });
    this.renderEffortChart();
  }

  renderEffortChart() {
    const N = this.chartRange;
    const labels = [];
    const currentData = [];
    const ghostData = [];
    const ma7Data = [];

    let currentSum = 0;
    let ghostSum = 0;

    for (let i = N - 1; i >= 0; i--) {
      const dateKey = this.getDateKeyDaysAgo(i);
      const ghostDateKey = this.getDateKeyDaysAgo(i + N);

      labels.push(this.formatShortVNDate(dateKey));

      const cScore = this.calculateDayStats(dateKey).totalScore;
      const gScore = this.calculateDayStats(ghostDateKey).totalScore;

      currentData.push(cScore);
      ghostData.push(gScore);

      currentSum += cScore;
      ghostSum += gScore;

      // Tính Trung Bình Động 7 Ngày (MA7) tại thời điểm ngày thứ i
      let maSum = 0;
      for (let m = 0; m < 7; m++) {
        maSum += this.calculateDayStats(this.getDateKeyDaysAgo(i + m)).totalScore;
      }
      ma7Data.push(Number((maSum / 7).toFixed(2)));
    }

    // Cập nhật 4 thẻ KPI phía trên đồ thị
    const todayStats = this.calculateDayStats(this.getTodayKey());
    document.getElementById('kpi-today-score').textContent = `${todayStats.totalScore} đ`;
    document.getElementById('kpi-today-max').textContent = `/ ${todayStats.baseMaxScore} đ (${todayStats.completionPct}%)`;

    const harmonyBadge = document.getElementById('kpi-harmony-badge');
    if (todayStats.isHarmony) {
      harmonyBadge.textContent = '🌌 ĐÃ KÍCH HOẠT NGŨ HÀNH HỢP NHẤT (+25%)';
      harmonyBadge.className = 'text-[10px] text-fuchsia-400 mt-1 font-bold animate-pulse';
    } else {
      harmonyBadge.textContent = `Cộng Tương Sinh hôm nay: +${todayStats.tuongSinhBonusScore} đ`;
      harmonyBadge.className = 'text-[10px] text-emerald-400 mt-1 font-medium';
    }

    // So sánh với Kỳ trước (Ghost Line)
    const vsGhostEl = document.getElementById('kpi-vs-ghost');
    const vsGhostSub = document.getElementById('kpi-vs-ghost-sub');
    if (ghostSum > 0) {
      const diffPct = Math.round(((currentSum - ghostSum) / ghostSum) * 100);
      const sign = diffPct >= 0 ? '+' : '';
      vsGhostEl.textContent = `${sign}${diffPct}%`;
      vsGhostEl.className =
        diffPct >= 0
          ? 'text-xl font-hud font-extrabold text-emerald-400 glow-emerald'
          : 'text-xl font-hud font-extrabold text-rose-400';
      vsGhostSub.textContent = `Kỳ này: ${currentSum.toFixed(1)}đ vs Kỳ trước: ${ghostSum.toFixed(1)}đ`;
    } else {
      vsGhostEl.textContent = `${currentSum.toFixed(1)} đ`;
      vsGhostSub.textContent = `Tổng điểm ${N} ngày qua`;
    }

    // MA7 hiện tại
    const latestMa7 = ma7Data[ma7Data.length - 1] || 0;
    document.getElementById('kpi-ma7-val').textContent = `${latestMa7} đ/ngày`;

    // Số hành đã kích hoạt hôm nay
    const activeElementsCount = ELEMENT_ORDER.filter(el =>
      this.isElementCompletedOnDate(el, this.getTodayKey())
    ).length;
    document.getElementById('kpi-active-elements').textContent = `${activeElementsCount} / 5 Hành`;

    // Vẽ biểu đồ bằng Chart.js
    const canvas = document.getElementById('effortChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    if (this.chartInstance) {
      this.chartInstance.destroy();
    }

    const gradientFill = ctx.createLinearGradient(0, 0, 0, 300);
    gradientFill.addColorStop(0, 'rgba(56, 189, 248, 0.42)');
    gradientFill.addColorStop(0.6, 'rgba(16, 185, 129, 0.12)');
    gradientFill.addColorStop(1, 'rgba(6, 9, 19, 0.0)');

    this.chartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: '⚡ Đường Nỗ Lực Hiện Tại (Thực tế)',
            data: currentData,
            borderColor: '#38bdf8',
            backgroundColor: gradientFill,
            borderWidth: 3,
            pointBackgroundColor: '#060913',
            pointBorderColor: '#38bdf8',
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
            tension: 0.35,
            fill: true,
            order: 1
          },
          {
            label: '👑 Xu Hướng Trung Bình Động (MA7)',
            data: ma7Data,
            borderColor: '#f59e0b',
            backgroundColor: 'transparent',
            borderWidth: 2.5,
            pointRadius: 2,
            pointHoverRadius: 5,
            tension: 0.42,
            fill: false,
            order: 2
          },
          {
            label: `👻 Đường Bóng Ma Quá Khứ (${N} ngày liền trước)`,
            data: ghostData,
            borderColor: 'rgba(148, 163, 184, 0.55)',
            backgroundColor: 'transparent',
            borderDash: [6, 5],
            borderWidth: 2,
            pointRadius: 2,
            pointHoverRadius: 4,
            tension: 0.35,
            fill: false,
            order: 3
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: {
            position: 'top',
            labels: {
              color: '#cbd5e1',
              font: {
                family: "'Be Vietnam Pro', sans-serif",
                size: 11,
                weight: '600'
              },
              usePointStyle: true,
              boxWidth: 8
            }
          },
          tooltip: {
            backgroundColor: 'rgba(6, 9, 19, 0.95)',
            titleColor: '#38bdf8',
            bodyColor: '#f1f5f9',
            borderColor: 'rgba(56, 189, 248, 0.45)',
            borderWidth: 1,
            padding: 10,
            callbacks: {
              afterBody: (items) => {
                const idx = items[0].dataIndex;
                const dKey = this.getDateKeyDaysAgo(N - 1 - idx);
                const st = this.calculateDayStats(dKey);
                const note = this.state.notes[dKey];
                const lines = [`Hiệu suất: ${st.completionPct}% mục tiêu`];
                if (st.isHarmony) lines.push('🌌 Đạt Ngũ Hành Hợp Nhất (+25%)');
                if (note) lines.push(`📝 Ghi chú: "${note}"`);
                return lines;
              }
            }
          }
        },
        scales: {
          x: {
            grid: {
              color: 'rgba(30, 41, 59, 0.55)'
            },
            ticks: {
              color: '#94a3b8',
              font: { size: 11 }
            }
          },
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(30, 41, 59, 0.55)'
            },
            ticks: {
              color: '#94a3b8',
              font: { size: 11 },
              callback: (val) => `${val}đ`
            }
          }
        }
      }
    });
  }

  /* ==========================================================================
     9. LƯỚI NHIỆT ĐỘ 90 NGÀY (CONSISTENCY HEATMAP + HOVER MICRO-LOG)
     ========================================================================== */

  renderHeatmap90Days() {
    const container = document.getElementById('heatmap-container');
    if (!container) return;
    container.innerHTML = '';

    // Để lưới 7 hàng chuẩn từ Thứ 2 -> Chủ Nhật kết thúc vào tuần hiện tại (91 ô = 13 tuần)
    const totalDays = 90;
    for (let i = totalDays - 1; i >= 0; i--) {
      const dateKey = this.getDateKeyDaysAgo(i);
      const stats = this.calculateDayStats(dateKey);
      const note = this.state.notes[dateKey] || '';

      let heatClass = 'heat-0';
      if (stats.completionPct > 105 || stats.isHarmony) {
        heatClass = 'heat-4';
      } else if (stats.completionPct >= 75) {
        heatClass = 'heat-3';
      } else if (stats.completionPct >= 40) {
        heatClass = 'heat-2';
      } else if (stats.completionPct > 0 || stats.hasAnyActivity) {
        heatClass = 'heat-1';
      }

      const cell = document.createElement('div');
      cell.className = `heatmap-cell ${heatClass} ${note ? 'ring-1 ring-amber-400/70' : ''}`;
      cell.dataset.dateKey = dateKey;

      cell.addEventListener('mouseenter', (e) => this.showHeatmapTooltip(e, dateKey, stats, note));
      cell.addEventListener('mousemove', (e) => this.moveHeatmapTooltip(e));
      cell.addEventListener('mouseleave', () => this.hideHeatmapTooltip());
      cell.addEventListener('click', () => this.openNoteModal(dateKey));

      container.appendChild(cell);
    }
  }

  showHeatmapTooltip(event, dateKey, stats, note) {
    const tooltip = document.getElementById('heatmap-tooltip');
    if (!tooltip) return;

    tooltip.innerHTML = `
      <div class="font-hud font-bold text-sky-400 border-b border-slate-800 pb-1 mb-1">
        ${this.formatFullVNDate(dateKey)}
      </div>
      <div class="text-slate-200">
        Điểm nỗ lực: <strong class="text-emerald-400">${stats.totalScore} đ</strong> (${stats.completionPct}%)
      </div>
      ${stats.isHarmony ? '<div class="text-fuchsia-400 font-semibold mt-0.5">🌌 Ngũ Hành Hợp Nhất (+25%)</div>' : ''}
      ${
        note
          ? `<div class="mt-1.5 p-1.5 rounded bg-slate-900/90 border border-amber-500/30 text-amber-200 italic">📝 "${note}"</div>`
          : '<div class="text-[10px] text-slate-500 mt-1">Bấm vào ô để thêm ghi chú ngày (Micro-log)</div>'
      }
    `;
    tooltip.classList.remove('hidden');
    this.moveHeatmapTooltip(event);
  }

  moveHeatmapTooltip(event) {
    const tooltip = document.getElementById('heatmap-tooltip');
    if (!tooltip) return;
    const offset = 14;
    let left = event.clientX + offset;
    let top = event.clientY + offset;

    if (left + 260 > window.innerWidth) {
      left = event.clientX - 270;
    }
    if (top + 120 > window.innerHeight) {
      top = event.clientY - 120;
    }

    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
  }

  hideHeatmapTooltip() {
    const tooltip = document.getElementById('heatmap-tooltip');
    if (tooltip) tooltip.classList.add('hidden');
  }

  /* ==========================================================================
     10. BẢNG MA TRẬN NHIỆM VỤ TUẦN (WEEKLY QUEST MATRIX)
     ========================================================================== */

  changeWeek(delta) {
    this.currentWeekOffset += delta;
    this.renderWeeklyMatrix();
  }

  resetToCurrentWeek() {
    this.currentWeekOffset = 0;
    this.renderWeeklyMatrix();
  }

  setElementFilter(filterKey) {
    this.elementFilter = filterKey;
    const buttons = document.querySelectorAll('#element-filter-tabs button');
    buttons.forEach(btn => {
      if (btn.dataset.filter === filterKey) {
        btn.classList.add('ring-2', 'ring-sky-400', 'bg-sky-500/25', 'text-white');
      } else {
        btn.classList.remove('ring-2', 'ring-sky-400', 'bg-sky-500/25', 'text-white');
      }
    });
    this.renderWeeklyMatrix();
  }

  renderWeeklyMatrix() {
    const weekKeys = this.getWeekDateKeys(this.currentWeekOffset);
    const todayKey = this.getTodayKey();

    // Hiển thị nhãn khoảng thời gian tuần
    const rangeLabel = document.getElementById('week-range-label');
    if (rangeLabel) {
      const startStr = this.formatShortVNDate(weekKeys[0]);
      const endStr = this.formatShortVNDate(weekKeys[6]);
      const weekTag =
        this.currentWeekOffset === 0
          ? 'TUẦN NÀY'
          : this.currentWeekOffset < 0
          ? `${Math.abs(this.currentWeekOffset)} TUẦN TRƯỚC`
          : `${this.currentWeekOffset} TUẦN SAU`;
      rangeLabel.textContent = `${weekTag} (${startStr} ➔ ${endStr})`;
    }

    // Hiển thị Thanh Chu Trình Ngũ Hành Tương Sinh Hôm Nay
    const chainEl = document.getElementById('tuong-sinh-chain');
    if (chainEl) {
      chainEl.innerHTML = ELEMENT_ORDER.map((elKey, idx) => {
        const el = ELEMENTS[elKey];
        const done = this.isElementCompletedOnDate(elKey, todayKey);
        const arrow = idx < ELEMENT_ORDER.length - 1 ? '<span class="text-slate-500 mx-0.5">➔</span>' : '<span class="text-slate-500 mx-0.5">➔ 🌿</span>';
        return `
          <span class="px-2 py-0.5 rounded text-[11px] font-semibold border ${
            done
              ? `${el.badgeClass} font-bold`
              : 'bg-slate-900/80 border-slate-800 text-slate-500'
          }">
            ${el.icon} ${el.name} ${done ? '✓' : ''}
          </span>
          ${arrow}
        `;
      }).join('');
    }

    // Render Table Header (Thứ 2 ➔ Chủ Nhật)
    const theadRow = document.getElementById('matrix-thead-row');
    const dayLabels = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

    theadRow.innerHTML = `
      <th class="py-3 px-3 min-w-[270px]">Nhiệm Vụ & Ngũ Hành Linh Căn</th>
      <th class="py-3 px-2 text-center">Focus</th>
      ${weekKeys
        .map((dKey, i) => {
          const isToday = dKey === todayKey;
          const hasNote = Boolean(this.state.notes[dKey]);
          return `
            <th class="py-2.5 px-1.5 text-center ${
              isToday ? 'bg-sky-500/15 border-b-2 border-sky-400 text-sky-300' : ''
            }">
              <div class="flex flex-col items-center">
                <span class="text-[11px] font-bold">${dayLabels[i]}</span>
                <span class="text-[10px] font-normal text-slate-400">${this.formatShortVNDate(dKey)}</span>
                <button
                  onclick="app.openNoteModal('${dKey}')"
                  class="mt-1 text-[11px] ${hasNote ? 'text-amber-400' : 'text-slate-600 hover:text-slate-300'}"
                  title="${hasNote ? 'Xem/Sửa ghi chú: ' + this.state.notes[dKey] : 'Thêm ghi chú ngày ' + this.formatShortVNDate(dKey)}"
                >
                  📝
                </button>
              </div>
            </th>
          `;
        })
        .join('')}
      <th class="py-3 px-2 text-center">Streak</th>
      <th class="py-3 px-2 text-right">Thao tác</th>
    `;

    // Lọc danh sách thói quen
    const filteredHabits = this.state.habits.filter(h =>
      this.elementFilter === 'ALL' ? true : h.element === this.elementFilter
    );

    const tbody = document.getElementById('matrix-tbody');
    if (filteredHabits.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="11" class="py-8 text-center text-slate-400">
            Chưa có thói quen nào thuộc nhóm này. Hãy bấm <strong>+ Thêm Thói Quen</strong> để khởi tạo!
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = filteredHabits
      .map(habit => {
        const el = ELEMENTS[habit.element];
        const parentEl = ELEMENTS[el.GeneratedBy];
        const hasTodayTuongSinh = this.hasTuongSinhBonus(habit.element, todayKey);
        const streak = this.calculateHabitStreak(habit.id);

        return `
          <tr class="hover:bg-slate-900/50 transition group">
            <!-- Thông tin Thói quen & Nhãn Tương Sinh -->
            <td class="py-3 px-3">
              <div class="flex items-start gap-2.5">
                <span class="px-2 py-1 rounded-lg text-xs font-bold shrink-0 ${el.badgeClass}" title="${el.name} (${el.stat} - ${el.title})">
                  ${el.icon} ${el.name}
                </span>
                <div class="min-w-0">
                  <div class="font-semibold text-slate-100 leading-snug flex items-center gap-1.5 flex-wrap">
                    <span>${this.escapeHtml(habit.name)}</span>
                    <span class="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-[11px] font-hud font-bold text-sky-300">
                      [+${habit.weight}đ]
                    </span>
                  </div>
                  <div class="flex items-center gap-2 mt-1 flex-wrap">
                    <span class="text-[11px] text-slate-400">${el.stat} • ${el.title}</span>
                    ${
                      hasTodayTuongSinh
                        ? `<span class="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 text-[10px] font-bold animate-pulse">
                            ✨ [Tương Sinh +20% Điểm] (${parentEl.icon} ${parentEl.name} sinh ${el.name})
                          </span>`
                        : `<span class="text-[10px] text-slate-500">Hoàn thành ${parentEl.icon} ${parentEl.name} để nhận +20%</span>`
                    }
                  </div>
                </div>
              </div>
            </td>

            <!-- Nút Focus 25p -->
            <td class="py-3 px-2 text-center">
              <button
                onclick="app.openPomodoroModal('${habit.id}')"
                class="px-2.5 py-1.5 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/30 border border-indigo-400/40 text-indigo-300 text-xs font-hud font-bold transition whitespace-nowrap"
                title="Mở Hầm Ngục Tập Trung 25 phút cho nhiệm vụ này"
              >
                ⏱️ 25p
              </button>
            </td>

            <!-- 7 Ô Ngày (Thứ 2 ➔ Chủ Nhật) -->
            ${weekKeys
              .map(dKey => {
                const status = (this.state.records[dKey] || {})[habit.id] ?? 0;
                const cellUI = this.getCheckinCellUI(status);
                const isToday = dKey === todayKey;
                return `
                  <td class="py-2.5 px-1.5 text-center ${isToday ? 'bg-sky-500/5' : ''}">
                    <button
                      onclick="app.cycleHabitStatus('${habit.id}', '${dKey}')"
                      class="quest-cell ${cellUI.className}"
                      title="${cellUI.tooltip} (Click để đổi trạng thái)"
                    >
                      ${cellUI.symbol}
                    </button>
                  </td>
                `;
              })
              .join('')}

            <!-- Chuỗi Streak riêng -->
            <td class="py-3 px-2 text-center">
              <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-300 font-hud font-bold text-xs">
                🔥 ${streak}
              </span>
            </td>

            <!-- Nút Ghi chú ngày hôm nay + Sửa / Xóa -->
            <td class="py-3 px-2 text-right whitespace-nowrap">
              <button
                onclick="app.openNoteModal('${todayKey}')"
                class="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-amber-300 transition"
                title="Ghi chú nhật ký hôm nay"
              >
                📝
              </button>
              <button
                onclick="app.openHabitModal('${habit.id}')"
                class="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-sky-400 transition"
                title="Sửa thói quen"
              >
                <i class="fa-solid fa-pen-to-square"></i>
              </button>
              <button
                onclick="app.deleteHabit('${habit.id}')"
                class="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-rose-400 transition"
                title="Xóa thói quen"
              >
                <i class="fa-solid fa-trash-can"></i>
              </button>
            </td>
          </tr>
        `;
      })
      .join('');
  }

  getCheckinCellUI(status) {
    if (status === 1) {
      return {
        symbol: '✓',
        className: 'cell-state-1',
        tooltip: 'Hoàn thành chuẩn (100% điểm + Vàng)'
      };
    }
    if (status === 0.5) {
      return {
        symbol: '½',
        className: 'cell-state-half',
        tooltip: 'Cố gắng tối thiểu / Mini-habit (50% điểm - Giữ chuỗi Streak)'
      };
    }
    if (status === 1.5) {
      return {
        symbol: '⚡',
        className: 'cell-state-overdrive',
        tooltip: 'Bứt phá Overdrive (150% điểm + Gấp đôi Vàng)'
      };
    }
    if (status === 'freeze') {
      return {
        symbol: '🛡️',
        className: 'cell-state-freeze',
        tooltip: 'Đóng băng bằng Khiên Định Hồn (Bảo toàn Streak)'
      };
    }
    return {
      symbol: '·',
      className: 'cell-state-0',
      tooltip: 'Chưa hoàn thành (0%)'
    };
  }

  /* ==========================================================================
     11. BIỂU ĐỒ RADAR NGŨ GIÁC (PENTAGON ELEMENT SVG CHART - KHU VỰC 4)
     ========================================================================== */

  renderPentagonRadarSVG() {
    const svg = document.getElementById('pentagon-radar-svg');
    if (!svg) return;

    // Tính tỷ lệ hoàn thành (%) của từng hành trong 7 ngày qua
    const elementScores = {};
    ELEMENT_ORDER.forEach(elKey => {
      let earned = 0;
      let maxPossible = 0;
      const elHabits = this.state.habits.filter(h => h.element === elKey);

      for (let i = 0; i < 7; i++) {
        const dKey = this.getDateKeyDaysAgo(i);
        const rec = this.state.records[dKey] || {};
        elHabits.forEach(h => {
          maxPossible += h.weight;
          const st = rec[h.id];
          if (typeof st === 'number' && st > 0) {
            earned += h.weight * st;
          } else if (st === 'freeze') {
            earned += h.weight * 0.75; // Quy đổi đóng băng trên biểu đồ cân bằng
          }
        });
      }

      const pct = maxPossible > 0 ? Math.min(120, Math.round((earned / maxPossible) * 100)) : 0;
      elementScores[elKey] = pct;
    });

    // Cảnh báo nếu đỉnh Mộc < 40%
    const mocWarning = document.getElementById('moc-warning-alert');
    if (elementScores.MOC < 40) {
      mocWarning.classList.remove('hidden');
    } else {
      mocWarning.classList.add('hidden');
    }

    // Điểm cân bằng trung bình 5 hành
    const avgBalance = Math.round(
      ELEMENT_ORDER.reduce((sum, k) => sum + Math.min(100, elementScores[k]), 0) / 5
    );
    document.getElementById('radar-balance-score').textContent = `Cân bằng: ${avgBalance}%`;

    // Vẽ SVG Ngũ Giác đều tâm (160, 155), bán kính R = 100
    const cx = 160;
    const cy = 155;
    const maxR = 100;

    const getPoint = (index, ratio) => {
      const angle = -Math.PI / 2 + (index * 2 * Math.PI) / 5;
      const r = maxR * ratio;
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      return { x: Number(x.toFixed(1)), y: Number(y.toFixed(1)) };
    };

    // Lưới đồng tâm (20%, 40%, 60%, 80%, 100%)
    const gridLevels = [0.2, 0.4, 0.6, 0.8, 1.0];
    const gridPolygons = gridLevels
      .map(lv => {
        const pts = ELEMENT_ORDER.map((_, idx) => {
          const p = getPoint(idx, lv);
          return `${p.x},${p.y}`;
        }).join(' ');
        return `<polygon points="${pts}" fill="none" stroke="rgba(148, 163, 184, 0.18)" stroke-width="1" />`;
      })
      .join('');

    // Các trục từ tâm ra 5 đỉnh
    const axesLines = ELEMENT_ORDER.map((_, idx) => {
      const p = getPoint(idx, 1.0);
      return `<line x1="${cx}" y1="${cy}" x2="${p.x}" y2="${p.y}" stroke="rgba(148, 163, 184, 0.22)" stroke-width="1" stroke-dasharray="3,3" />`;
    }).join('');

    // Đa giác dữ liệu thực tế của người dùng
    const dataPoints = ELEMENT_ORDER.map((elKey, idx) => {
      const ratio = Math.max(0.08, Math.min(1.15, elementScores[elKey] / 100));
      return getPoint(idx, ratio);
    });
    const dataPolygonPoints = dataPoints.map(p => `${p.x},${p.y}`).join(' ');

    // Nhãn & chấm tròn tại 5 đỉnh
    const vertexLabels = ELEMENT_ORDER.map((elKey, idx) => {
      const el = ELEMENTS[elKey];
      const labelPos = getPoint(idx, 1.28);
      const dotPos = dataPoints[idx];
      const pct = elementScores[elKey];

      return `
        <circle cx="${dotPos.x}" cy="${dotPos.y}" r="5" fill="${el.color}" stroke="#060913" stroke-width="2" />
        <g transform="translate(${labelPos.x}, ${labelPos.y})">
          <text x="0" y="-4" text-anchor="middle" fill="${el.color}" font-family="Rajdhani, sans-serif" font-weight="700" font-size="13">
            ${el.icon} ${el.name.toUpperCase()}
          </text>
          <text x="0" y="11" text-anchor="middle" fill="#e2e8f0" font-family="Orbitron, sans-serif" font-weight="700" font-size="11">
            ${pct}%
          </text>
        </g>
      `;
    }).join('');

    svg.innerHTML = `
      <defs>
        <radialGradient id="radarFillGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="rgba(56, 189, 248, 0.45)" />
          <stop offset="100%" stop-color="rgba(16, 185, 129, 0.20)" />
        </radialGradient>
      </defs>
      ${gridPolygons}
      ${axesLines}
      <polygon
        points="${dataPolygonPoints}"
        fill="url(#radarFillGrad)"
        stroke="#38bdf8"
        stroke-width="2.5"
        class="radar-polygon"
      />
      ${vertexLabels}
    `;

    // Render danh sách chi tiết 5 hành bên dưới Radar
    const listContainer = document.getElementById('radar-stats-list');
    if (listContainer) {
      listContainer.innerHTML = ELEMENT_ORDER.map(elKey => {
        const el = ELEMENTS[elKey];
        const pct = elementScores[elKey];
        return `
          <div class="flex items-center justify-between bg-slate-900/70 px-3 py-1.5 rounded-lg border border-slate-800/80">
            <div class="flex items-center gap-2">
              <span>${el.icon}</span>
              <span class="font-semibold text-slate-200">${el.name} (${el.stat})</span>
              <span class="text-[11px] text-slate-400">— ${el.title}</span>
            </div>
            <span class="font-hud font-bold text-xs" style="color: ${el.color}">${pct}%</span>
          </div>
        `;
      }).join('');
    }
  }

  /* ==========================================================================
     12. RENDER BOSS HẦM NGỤC TUẦN (WEEKLY DUNGEON RAID CARD)
     ========================================================================== */

  renderBossRaidCard() {
    const boss = this.getWeeklyBossData(0);

    document.getElementById('boss-avatar-box').textContent = boss.isDefeated ? '💀' : boss.bossTemplate.avatar;
    document.getElementById('boss-rank-tag').textContent = boss.bossTemplate.rank;
    document.getElementById('boss-name').textContent = boss.bossTemplate.name;
    document.getElementById('boss-lore').textContent = boss.bossTemplate.lore;

    document.getElementById('boss-hp-text').textContent = `${boss.remainingHp} / ${boss.bossMaxHp} HP`;
    document.getElementById('boss-hp-fill').style.width = `${boss.hpPercent}%`;
    document.getElementById('boss-dmg-dealt').textContent = `${boss.damageDealt} đ`;

    const badge = document.getElementById('boss-status-badge');
    if (boss.isDefeated) {
      badge.textContent = 'ĐÃ TIÊU DIỆT (+200 🪙)';
      badge.className = 'px-2.5 py-0.5 rounded text-xs font-hud font-bold uppercase bg-emerald-500/20 border border-emerald-400/50 text-emerald-300';
    } else {
      badge.textContent = 'ĐANG GIAO CHIẾN';
      badge.className = 'px-2.5 py-0.5 rounded text-xs font-hud font-bold uppercase bg-rose-500/20 border border-rose-500/50 text-rose-300';
    }
  }

  /* ==========================================================================
     13. QUẢN LÝ THÓI QUEN (THÊM / SỬA / XÓA)
     ========================================================================== */

  openHabitModal(habitId = null) {
    const modal = document.getElementById('habit-modal');
    const titleEl = document.getElementById('habit-modal-title');
    const idInput = document.getElementById('habit-id-input');
    const nameInput = document.getElementById('habit-name-input');
    const elInput = document.getElementById('habit-element-input');
    const weightInput = document.getElementById('habit-weight-input');
    const weightDisplay = document.getElementById('habit-weight-display');

    if (habitId) {
      const habit = this.state.habits.find(h => h.id === habitId);
      if (!habit) return;
      titleEl.innerHTML = `<i class="fa-solid fa-pen-to-square text-sky-400"></i><span>CHỈNH SỬA NHIỆM VỤ LINH CĂN</span>`;
      idInput.value = habit.id;
      nameInput.value = habit.name;
      elInput.value = habit.element;
      weightInput.value = habit.weight;
      weightDisplay.textContent = `+${habit.weight} điểm (+${habit.weight * 10} 🪙)`;
    } else {
      titleEl.innerHTML = `<i class="fa-solid fa-scroll text-sky-400"></i><span>KHỞI TẠO NHIỆM VỤ LINH CĂN</span>`;
      idInput.value = '';
      nameInput.value = '';
      elInput.value = 'KIM';
      weightInput.value = 5;
      weightDisplay.textContent = '+5 điểm (+50 🪙)';
    }

    modal.classList.remove('hidden');
    nameInput.focus();
  }

  closeHabitModal() {
    document.getElementById('habit-modal').classList.add('hidden');
  }

  saveHabitForm(event) {
    event.preventDefault();
    const id = document.getElementById('habit-id-input').value.trim();
    const name = document.getElementById('habit-name-input').value.trim();
    const element = document.getElementById('habit-element-input').value;
    const weight = Number(document.getElementById('habit-weight-input').value) || 5;

    if (!name) return;

    if (id) {
      const existing = this.state.habits.find(h => h.id === id);
      if (existing) {
        existing.name = name;
        existing.element = element;
        existing.weight = weight;
      }
      this.showToast('✨ Đã Cập Nhật Thói Quen', `Nhiệm vụ [${name}] đã được lưu.`, 'cyan');
    } else {
      this.state.habits.push({
        id: 'h_' + Date.now(),
        name,
        element,
        weight,
        createdAt: this.getTodayKey()
      });
      this.showToast('⚔️ Đã Khởi Tạo Nhiệm Vụ Mới', `Đã thêm [${name}] vào Ma Trận Ngũ Hành!`, 'emerald');
    }

    playSlash();
    this.saveState();
    this.closeHabitModal();
    this.renderAll();
  }

  deleteHabit(habitId) {
    const habit = this.state.habits.find(h => h.id === habitId);
    if (!habit) return;
    if (!confirm(`Bạn có chắc muốn xóa nhiệm vụ "${habit.name}" khỏi hệ thống?`)) return;

    this.state.habits = this.state.habits.filter(h => h.id !== habitId);
    this.saveState();
    this.renderAll();
    this.showToast('🗑️ Đã Xóa Nhiệm Vụ', `Đã xóa [${habit.name}].`, 'amber');
  }

  /* ==========================================================================
     14. HẦM NGỤC TẬP TRUNG (POMODORO FOCUS DUNGEON TIMER)
     ========================================================================== */

  openPomodoroModal(selectedHabitId = null) {
    const modal = document.getElementById('pomodoro-modal');
    const select = document.getElementById('pomo-habit-select');

    select.innerHTML = this.state.habits
      .map(h => {
        const el = ELEMENTS[h.element];
        return `<option value="${h.id}">${el.icon} [${el.name}] ${this.escapeHtml(h.name)} (+${h.weight}đ)</option>`;
      })
      .join('');

    if (selectedHabitId) {
      select.value = selectedHabitId;
    }

    modal.classList.remove('hidden');
    this.updatePomodoroUI();
  }

  closePomodoroModal() {
    document.getElementById('pomodoro-modal').classList.add('hidden');
  }

  setPomodoroDuration(minutes) {
    this.pausePomodoro();
    this.pomoTotalSeconds = Math.max(5, Math.round(minutes * 60));
    this.pomoRemainingSeconds = this.pomoTotalSeconds;

    const btn25 = document.getElementById('pomo-mode-25');
    const btn45 = document.getElementById('pomo-mode-45');
    btn25.className =
      minutes === 25
        ? 'px-3.5 py-1.5 rounded-lg text-xs font-hud font-bold bg-indigo-500 text-white'
        : 'px-3.5 py-1.5 rounded-lg text-xs font-hud font-bold bg-slate-900 text-slate-300 border border-slate-700';
    btn45.className =
      minutes === 45
        ? 'px-3.5 py-1.5 rounded-lg text-xs font-hud font-bold bg-indigo-500 text-white'
        : 'px-3.5 py-1.5 rounded-lg text-xs font-hud font-bold bg-slate-900 text-slate-300 border border-slate-700';

    document.getElementById('pomo-status-sub').textContent = 'Sẵn sàng tiến vào hầm ngục';
    this.updatePomodoroUI();
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
    playSlash();

    const startBtn = document.getElementById('pomo-start-btn');
    startBtn.innerHTML = `<i class="fa-solid fa-pause"></i><span>TẠM DỪNG</span>`;
    document.getElementById('pomo-status-sub').textContent = '🔥 Đang tập trung tu luyện trong Hầm Ngục...';

    this.pomoTimer = setInterval(() => {
      this.pomoRemainingSeconds -= 1;
      this.updatePomodoroUI();

      if (this.pomoRemainingSeconds <= 0) {
        this.completePomodoroSession();
      }
    }, 1000);
  }

  pausePomodoro() {
    this.pomoRunning = false;
    if (this.pomoTimer) {
      clearInterval(this.pomoTimer);
      this.pomoTimer = null;
    }
    const startBtn = document.getElementById('pomo-start-btn');
    if (startBtn) {
      startBtn.innerHTML = `<i class="fa-solid fa-play"></i><span>TIẾP TỤC</span>`;
    }
  }

  resetPomodoro() {
    this.pausePomodoro();
    this.pomoRemainingSeconds = this.pomoTotalSeconds;
    const startBtn = document.getElementById('pomo-start-btn');
    if (startBtn) {
      startBtn.innerHTML = `<i class="fa-solid fa-play"></i><span>BẮT ĐẦU</span>`;
    }
    document.getElementById('pomo-status-sub').textContent = 'Đã đặt lại đồng hồ';
    this.updatePomodoroUI();
  }

  updatePomodoroUI() {
    const mins = Math.floor(this.pomoRemainingSeconds / 60);
    const secs = this.pomoRemainingSeconds % 60;
    const display = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    const timeEl = document.getElementById('pomo-time-display');
    if (timeEl) timeEl.textContent = display;

    const circle = document.getElementById('pomo-progress-circle');
    if (circle) {
      const circumference = 326.72;
      const progress = this.pomoTotalSeconds > 0 ? this.pomoRemainingSeconds / this.pomoTotalSeconds : 0;
      circle.style.strokeDashoffset = String(circumference * (1 - progress));
    }
  }

  completePomodoroSession() {
    this.pausePomodoro();
    this.pomoRemainingSeconds = this.pomoTotalSeconds;
    this.updatePomodoroUI();

    const habitId = document.getElementById('pomo-habit-select').value;
    const habit = this.state.habits.find(h => h.id === habitId);
    const todayKey = this.getTodayKey();

    if (!this.state.records[todayKey]) {
      this.state.records[todayKey] = {};
    }

    const currentStatus = this.state.records[todayKey][habitId] ?? 0;
    let newStatus = 1;
    if (typeof currentStatus === 'number' && currentStatus >= 1) {
      newStatus = 1.5; // Nếu đã hoàn thành ➔ Nâng lên 1.5 Overdrive!
    }

    const oldGold = this.getGoldForStatus(habit ? habit.weight : 5, currentStatus);
    const newGold = this.getGoldForStatus(habit ? habit.weight : 5, newStatus);
    const bonusFocusGold = 25;

    this.state.records[todayKey][habitId] = newStatus;
    this.state.gold += Math.max(0, newGold - oldGold) + bonusFocusGold;

    this.state.shopHistory.unshift({
      id: 'pomo_' + Date.now(),
      time: 'Vừa xong',
      text: `Hoàn tất Hầm Ngục Tập Trung [${habit ? habit.name : ''}]: +25 🪙 thưởng chuyên cần`,
      type: 'loot'
    });

    playLevelUp();
    this.fireConfetti();
    this.checkWeeklyBossDefeat();
    this.saveState();
    this.renderAll();

    document.getElementById('pomo-status-sub').textContent = '🎉 Đã vượt Hầm Ngục thành công!';
    this.showToast(
      '⚔️ HOÀN TẤT HẦM NGỤC TẬP TRUNG!',
      `Đã đánh dấu [${habit ? habit.name : 'Nhiệm vụ'}] ở mức ${
        newStatus === 1.5 ? '⚡ 150% OVERDRIVE' : '✓ 100% Hoàn thành'
      } và cộng +25 🪙 Vàng thưởng chuyên cần!`,
      'gold',
      true
    );
  }

  /* ==========================================================================
     15. CỬA HÀNG PHẦN THƯỞNG & TÚI ĐỒ (REWARD SHOP & INVENTORY)
     ========================================================================== */

  openShopModal() {
    document.getElementById('shop-modal').classList.remove('hidden');
    this.renderShopModal();
  }

  closeShopModal() {
    document.getElementById('shop-modal').classList.add('hidden');
  }

  renderShopModal() {
    document.getElementById('shop-gold-balance').textContent = this.state.gold.toLocaleString('vi-VN');
    document.getElementById('shop-shield-count').textContent = this.state.shields;
    document.getElementById('shop-potion-count').textContent = this.state.potions;

    const lockNotice = document.getElementById('shop-penalty-lock-notice');
    const isLocked = this.state.penaltyActive || this.state.hp <= 0;
    if (isLocked) {
      lockNotice.classList.remove('hidden');
    } else {
      lockNotice.classList.add('hidden');
    }

    // Danh sách Phần thưởng Đời thực
    const rewardsContainer = document.getElementById('custom-rewards-list');
    rewardsContainer.innerHTML = this.state.customRewards
      .map(rw => {
        return `
          <div class="bg-slate-900/85 border border-slate-800 rounded-xl p-3 flex items-center justify-between gap-2">
            <div class="flex items-center gap-2.5 min-w-0">
              <div class="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-lg shrink-0">
                ${rw.icon || '🎁'}
              </div>
              <div class="min-w-0">
                <div class="font-semibold text-xs sm:text-sm text-white truncate">${this.escapeHtml(rw.title)}</div>
                <div class="text-xs font-hud font-bold text-amber-400">${rw.cost} 🪙 Vàng</div>
              </div>
            </div>
            <div class="flex items-center gap-1 shrink-0">
              <button
                onclick="app.buyCustomReward('${rw.id}')"
                ${isLocked ? 'disabled' : ''}
                class="px-3 py-1.5 rounded-lg font-hud font-bold text-xs transition ${
                  isLocked
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-red-500/30'
                    : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow'
                }"
              >
                ${isLocked ? '🔒 Khóa Phạt' : 'Đổi Thưởng'}
              </button>
              <button
                onclick="app.editCustomReward('${rw.id}')"
                class="p-1.5 text-slate-400 hover:text-sky-400 text-xs"
                title="Sửa giá / tên"
              >
                <i class="fa-solid fa-pen"></i>
              </button>
              <button
                onclick="app.deleteCustomReward('${rw.id}')"
                class="p-1.5 text-slate-400 hover:text-rose-400 text-xs"
                title="Xóa phần thưởng"
              >
                <i class="fa-solid fa-trash"></i>
              </button>
            </div>
          </div>
        `;
      })
      .join('');

    // Lịch sử chi tiêu
    const historyEl = document.getElementById('shop-history-list');
    if (!this.state.shopHistory || this.state.shopHistory.length === 0) {
      historyEl.innerHTML = `<div class="text-slate-500 text-center py-3">Chưa có giao dịch nào.</div>`;
    } else {
      historyEl.innerHTML = this.state.shopHistory
        .slice(0, 25)
        .map(item => {
          const color = item.type === 'loot' ? 'text-emerald-300' : 'text-amber-300';
          return `
            <div class="flex items-center justify-between border-b border-slate-900 pb-1">
              <span class="${color}">${this.escapeHtml(item.text)}</span>
              <span class="text-[10px] text-slate-500 shrink-0 ml-2">${this.escapeHtml(item.time)}</span>
            </div>
          `;
        })
        .join('');
    }
  }

  buySystemItem(itemType) {
    if (itemType === 'shield') {
      const cost = 100;
      if (this.state.gold < cost) {
        this.showToast('🪙 Không Đủ Vàng', 'Bạn cần 100 Vàng để mua Khiên Định Hồn!', 'amber');
        return;
      }
      this.state.gold -= cost;
      this.state.shields += 1;
      this.state.shopHistory.unshift({
        id: 'buy_' + Date.now(),
        time: 'Vừa xong',
        text: 'Mua [🛡️ Khiên Định Hồn] (-100 🪙)',
        type: 'spend'
      });
      playChestOpen();
      this.showToast('🛡️ Mua Thành Công', 'Đã thêm +1 Khiên Định Hồn vào Túi Đồ!', 'cyan');
    } else if (itemType === 'potion') {
      const cost = 80;
      if (this.state.gold < cost) {
        this.showToast('🪙 Không Đủ Vàng', 'Bạn cần 80 Vàng để mua Bình Hồi Phục HP!', 'amber');
        return;
      }
      this.state.gold -= cost;
      this.state.potions += 1;
      this.state.shopHistory.unshift({
        id: 'buy_' + Date.now(),
        time: 'Vừa xong',
        text: 'Mua [🧪 Bình Hồi Phục +30 HP] (-80 🪙)',
        type: 'spend'
      });
      playChestOpen();
      this.showToast('🧪 Mua Thành Công', 'Đã thêm +1 Bình Hồi Phục HP vào Túi Đồ!', 'emerald');
    }

    this.saveState();
    this.renderTopHUD();
    this.renderShopModal();
  }

  buyCustomReward(rewardId) {
    if (this.state.penaltyActive || this.state.hp <= 0) {
      playPenaltyAlarm();
      this.showToast(
        '🔒 ĐANG Ở KHU VỰC PHẠT',
        'HP = 0! Bạn phải hoàn thành Nhiệm vụ Phạt trước khi mua Phần thưởng Đời thực.',
        'crimson'
      );
      return;
    }

    const reward = this.state.customRewards.find(r => r.id === rewardId);
    if (!reward) return;

    if (this.state.gold < reward.cost) {
      this.showToast('🪙 Chưa Đủ Vàng', `Bạn cần ${reward.cost} Vàng để đổi [${reward.title}]!`, 'amber');
      return;
    }

    this.state.gold -= reward.cost;
    const nowStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    this.state.shopHistory.unshift({
      id: 'rw_' + Date.now(),
      time: `Hôm nay, ${nowStr}`,
      text: `Đổi thưởng [${reward.title}] (-${reward.cost} 🪙)`,
      type: 'spend'
    });

    playChestOpen();
    this.fireConfetti();
    this.saveState();
    this.renderTopHUD();
    this.renderShopModal();
    this.showToast('🎁 ĐỔI PHẦN THƯỞNG THÀNH CÔNG!', `Hãy tận hưởng: "${reward.title}"!`, 'gold', true);
  }

  saveCustomReward(event) {
    event.preventDefault();
    const editId = document.getElementById('reward-edit-id').value.trim();
    const titleInput = document.getElementById('reward-title-input');
    const costInput = document.getElementById('reward-cost-input');
    const submitBtn = document.getElementById('reward-submit-btn');

    const title = titleInput.value.trim();
    const cost = Math.max(10, Number(costInput.value) || 100);
    if (!title) return;

    if (editId) {
      const item = this.state.customRewards.find(r => r.id === editId);
      if (item) {
        item.title = title;
        item.cost = cost;
      }
      document.getElementById('reward-edit-id').value = '';
      submitBtn.textContent = '+ Thêm Giải Thưởng';
    } else {
      this.state.customRewards.push({
        id: 'rw_' + Date.now(),
        title,
        cost,
        icon: '🎁'
      });
    }

    titleInput.value = '';
    costInput.value = '150';
    this.saveState();
    this.renderShopModal();
  }

  editCustomReward(rewardId) {
    const item = this.state.customRewards.find(r => r.id === rewardId);
    if (!item) return;
    document.getElementById('reward-edit-id').value = item.id;
    document.getElementById('reward-title-input').value = item.title;
    document.getElementById('reward-cost-input').value = item.cost;
    document.getElementById('reward-submit-btn').textContent = '💾 Lưu Sửa';
    document.getElementById('reward-title-input').focus();
  }

  deleteCustomReward(rewardId) {
    this.state.customRewards = this.state.customRewards.filter(r => r.id !== rewardId);
    this.saveState();
    this.renderShopModal();
  }

  clearShopHistory() {
    this.state.shopHistory = [];
    this.saveState();
    this.renderShopModal();
  }

  /* ==========================================================================
     16. GHI CHÚ NGÀY (DAILY MICRO-LOG MODAL)
     ========================================================================== */

  openNoteModal(dateKey) {
    const modal = document.getElementById('note-modal');
    document.getElementById('note-modal-date-key').value = dateKey;
    document.getElementById('note-modal-date-label').textContent = this.formatFullVNDate(dateKey);
    document.getElementById('note-modal-textarea').value = this.state.notes[dateKey] || '';
    modal.classList.remove('hidden');
    document.getElementById('note-modal-textarea').focus();
  }

  closeNoteModal() {
    document.getElementById('note-modal').classList.add('hidden');
  }

  saveNoteModal(event) {
    event.preventDefault();
    const dateKey = document.getElementById('note-modal-date-key').value;
    const text = document.getElementById('note-modal-textarea').value.trim();

    if (text) {
      this.state.notes[dateKey] = text;
    } else {
      delete this.state.notes[dateKey];
    }

    this.saveState();
    this.closeNoteModal();
    this.renderHeatmap90Days();
    this.renderWeeklyMatrix();
    this.showToast('📝 Đã Lưu Nhật Ký Ngày', `Ghi chú ngày ${this.formatShortVNDate(dateKey)} đã được cập nhật.`, 'emerald');
  }

  /* ==========================================================================
     17. BACKUP / RESTORE JSON & ÂM THANH & CONFETTI
     ========================================================================== */

  exportBackupJSON() {
    const dataStr = JSON.stringify(this.state, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ngu-hanh-leveling-backup-${this.getTodayKey()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    this.showToast('⬇ Đã Xuất File Backup', 'Dữ liệu Hệ thống đã được tải xuống dưới dạng JSON.', 'cyan');
  }

  importRestoreJSON(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target.result);
        if (!imported || !Array.isArray(imported.habits) || typeof imported.records !== 'object') {
          throw new Error('Cấu trúc file JSON không hợp lệ.');
        }
        this.state = imported;
        this.saveState();
        playLevelUp();
        this.renderAll();
        this.showToast('⬆ Khôi Phục Thành Công!', 'Toàn bộ dữ liệu Thợ Săn đã được nạp lại.', 'emerald');
      } catch (err) {
        alert('Không thể đọc file Backup JSON: ' + err.message);
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  }

  toggleSound() {
    soundEngine.toggleSound();
    this.syncSoundButtonUI();
  }

  syncSoundButtonUI() {
    const label = document.getElementById('sound-label');
    const icon = document.getElementById('sound-icon');
    if (!label || !icon) return;
    if (soundEngine.enabled) {
      label.textContent = '🔊 Âm Thanh: BẬT';
      icon.className = 'fa-solid fa-volume-high text-sky-400';
    } else {
      label.textContent = '🔇 Âm Thanh: TẮT';
      icon.className = 'fa-solid fa-volume-xmark text-slate-500';
    }
  }

  fireConfetti() {
    if (typeof confetti === 'function') {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#10b981', '#f97316', '#f59e0b', '#38bdf8', '#818cf8']
      });
    }
  }

  showToast(title, message, theme = 'cyan', isChest = false) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const themeMap = {
      cyan: 'border-sky-400 bg-slate-950/95 text-sky-300',
      emerald: 'border-emerald-400 bg-slate-950/95 text-emerald-300',
      amber: 'border-amber-400 bg-slate-950/95 text-amber-300',
      gold: 'border-amber-400 bg-gradient-to-r from-slate-950 via-amber-950/90 to-slate-950 text-amber-300',
      purple: 'border-fuchsia-400 bg-gradient-to-r from-slate-950 via-fuchsia-950/90 to-slate-950 text-fuchsia-300',
      crimson: 'border-red-500 bg-red-950/95 text-red-300'
    };

    const toast = document.createElement('div');
    toast.className = `pointer-events-auto border-l-4 rounded-xl p-3.5 shadow-2xl backdrop-blur-md transition-all duration-300 ${
      themeMap[theme] || themeMap.cyan
    } ${isChest ? 'chest-pop-anim' : ''}`;

    toast.innerHTML = `
      <div class="flex items-start justify-between gap-2">
        <div>
          <div class="font-hud font-bold text-xs sm:text-sm uppercase tracking-wide">${title}</div>
          <div class="text-xs text-slate-200 mt-0.5 leading-relaxed">${message}</div>
        </div>
        <button class="text-slate-400 hover:text-white text-xs" onclick="this.parentElement.parentElement.remove()">✕</button>
      </div>
    `;

    container.appendChild(toast);
    setTimeout(() => {
      if (toast.parentElement) {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(20px)';
        setTimeout(() => toast.remove(), 300);
      }
    }, 4800);
  }

  escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  registerServiceWorker() {
    if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(() => {});
      });
    }
  }
}

// Khởi chạy Hệ thống khi DOM sẵn sàng
let app;
window.addEventListener('DOMContentLoaded', () => {
  app = new NguHanhLevelingApp();
});
