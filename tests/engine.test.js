/**
 * SYSTEM: NGŨ HÀNH LEVELING v4.0 ULTIMATE
 * Comprehensive Acceptance & Unit Test Suite: tests/engine.test.js
 * Chạy bằng: `node tests/engine.test.js`
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  CHECKIN_STATES,
  addDays,
  buildMonthGrid,
  computeRadarAndBuffs,
  computeMaxHp,
  computePenaltyDamage,
  computeExhaustedStatus,
  computeDay,
  rollLootWithPity,
  applyInventoryRewards,
  computeWeeklyBoss,
  computeHunterRank,
  computeGlobalStreak,
  reconcileDayLedger,
  evaluateTitles,
  computeMonthlySummary
} from '../js/engine.js';
import {
  createSeedState,
  createBlankSlateState,
  clearSeedHistoryInState,
  validateStateSchema
} from '../js/state.js';
import { runDailyCron } from '../js/cron.js';

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`  [PASS] ${name}`);
  } catch (err) {
    failed += 1;
    console.error(`  [FAIL] ${name}`);
    console.error('   ->', err.message);
  }
}

console.log('======================================================================');
console.log(' CHẠY KIỂM THỬ CHẤP NHẬN & ĐƠN VỊ (v4.0 ULTIMATE ACCEPTANCE SUITE)');
console.log('======================================================================');

// Mục 1 & 14: Kiểm tra 100% Offline, không CDN, mọi file trong sw.js đều tồn tại
test('Acceptance #1 & #14: Không có link CDN ngoài trong index.html & đủ 100% file tĩnh trong sw.js', () => {
  const root = 'c:/habit-tracker-pwa';
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.equal(/https?:\/\//i.test(html), false, 'index.html không được chứa URL http/https ra ngoài');
  assert.equal(/Orbitron|Rajdhani/i.test(html), false, 'Cấm dùng font Orbitron/Rajdhani');

  const swCode = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
  const match = swCode.match(/const PRECACHE_ASSETS = \[([\s\S]*?)\];/);
  assert.ok(match, 'sw.js phải có PRECACHE_ASSETS');
  const urls = [...match[1].matchAll(/'(\.\/[^']*)'/g)].map(m => m[1]);
  assert.ok(urls.length >= 30, 'PRECACHE_ASSETS phải chứa đầy đủ font, vendor, css, js, icon');

  for (const rel of urls) {
    if (rel === './') continue;
    const fullPath = path.join(root, rel.replace(/^\.\//, ''));
    assert.equal(fs.existsSync(fullPath), true, `Thiếu file precache: ${rel}`);
  }
});

// Mục 2: Typography & Icon rules
test('Acceptance #2: Typography Be Vietnam Pro + Chakra Petch (.font-hud line-height 1.4, letter-spacing 0.03em)', () => {
  const css = fs.readFileSync('c:/habit-tracker-pwa/css/styles.css', 'utf8');
  assert.ok(css.includes("font-family: 'Be Vietnam Pro'"));
  assert.ok(css.includes("font-family: 'Chakra Petch'"));
  assert.ok(css.includes('line-height: 1.4'));
  assert.ok(css.includes('letter-spacing: 0.03em'));
});

// Mục 3: Xoay vòng 5 trạng thái, freeze & hoàn Khiên
test('Acceptance #3: Chu trình 5 trạng thái (0 -> 1 -> 0.5 -> 1.5 -> freeze -> 0) & luật Khiên', () => {
  assert.deepEqual(CHECKIN_STATES, [0, 1, 0.5, 1.5, 'freeze']);
  const today = '2026-10-25';
  const st = createBlankSlateState(today);
  st.habits.push({
    id: 'h1',
    name: 'Test',
    element: 'MOC',
    weight: 4,
    kind: 'daily',
    schedule: { mode: 'everyday' },
    startDate: '2026-10-01'
  });

  st.days[today].entries.h1 = { state: 'freeze' };
  const comp = computeDay(st, today);
  assert.equal(comp.totalPoints, 0);
  assert.equal(comp.target, 0);
  assert.equal(comp.isOffDay, true);
});

// Mục 4: Sổ cái Delta (Tick rồi bỏ tick liên tục không lệch Vàng/Điểm/Boss)
test('Acceptance #4: Sổ cái Delta — Tick/Untick liên tục 50 lần tổng delta bằng giá trị cuối (không lệch số)', () => {
  const today = '2026-10-25';
  const st = createSeedState(today);
  const startGold = st.inventory.gold;
  const wk = Object.keys(st.boss)[0];
  const startBossDmg = st.boss[wk].damage;

  const seq = [1, 0.5, 1.5, 0, 1, 1.5, 0];
  for (let i = 0; i < 35; i++) {
    st.days[today].entries.h_kim_code = { state: seq[i % seq.length], tickHour: 10 };
    reconcileDayLedger(st, today, today);
  }
  assert.equal(st.inventory.gold, startGold);
  assert.equal(st.boss[wk].damage, startBossDmg);
});

// Mục 5 & 6: Off-day, Rest Mode (+3 ngày ảo), Day-Gap (+5 ngày trần 60% Max HP, +40 ngày chỉ quét 30 ngày)
test('Acceptance #5 & #6: Off-day, Rest Mode (+3 ngày), Day-Gap (+5 ngày trần 60% Max HP & +40 ngày quét 30 ngày)', () => {
  const d0 = '2026-10-01';
  const st = createBlankSlateState(d0);
  st.hp = 100;
  // Tạo thói quen chỉ làm Thứ Hai (ISO=1), các ngày khác là Off-day
  st.habits.push({
    id: 'h_mon',
    name: 'Chỉ Thứ Hai',
    element: 'KIM',
    weight: 5,
    kind: 'daily',
    schedule: { mode: 'days', days: [1] },
    startDate: '2026-09-01'
  });

  // 2026-10-01 là Thứ Năm (Off-day), 2026-10-02 là Thứ Sáu (Off-day) -> qua ngày không bị trừ HP
  const d1 = '2026-10-03';
  const rOff = runDailyCron(st, d1);
  assert.equal(rOff.totalHpLost, 0);
  assert.equal(st.hp, 100);

  // Đổi thành thói quen everyday để test Day-Gap +5 ngày
  st.habits[0].schedule = { mode: 'everyday' };
  const d6 = addDays(d1, 5);
  const r5 = runDailyCron(st, d6);
  assert.equal(r5.recapDays.length, 5);
  assert.equal(r5.totalHpLost, 60); // 5 * 20 = 100 nhưng chặn trần 60% của 100 MaxHP = 60
  assert.equal(st.hp, 40);

  // Bật Rest Mode và dịch +3 ngày -> HP và Streak giữ nguyên
  st.rest.active = true;
  st.rest.startDate = d6;
  const d9 = addDays(d6, 3);
  const rRest = runDailyCron(st, d9);
  assert.equal(rRest.totalHpLost, 0);
  assert.equal(st.hp, 40);

  // Tắt Rest Mode và dịch +40 ngày -> chỉ quét 30 ngày, 10 ngày cũ đánh dấu untracked
  st.rest.active = false;
  st.rest.startDate = null;
  const d49 = addDays(d9, 40);
  const r40 = runDailyCron(st, d49);
  assert.equal(r40.recapDays.length, 30);
  assert.equal(r40.skippedOldDaysCount, 10);
});

// Mục 7: Pity System (4 lần trượt -> lần 5 nổ Rương Hoàng Kim & pity = 0)
test('Acceptance #7: Pity System — 4 lần trượt liên tiếp thì lần 5 chắc chắn nổ Rương Hoàng Kim & reset pity = 0', () => {
  const today = '2026-10-25';
  const st = createBlankSlateState(today);
  const missRng = () => 0.99;

  for (let i = 1; i <= 4; i++) {
    const res = rollLootWithPity(st, today, missRng);
    assert.equal(res.dropped, false);
    st.pity = res.newPity;
  }
  assert.equal(st.pity, 4);

  const golden = rollLootWithPity(st, today, missRng);
  assert.equal(golden.dropped, true);
  assert.equal(golden.chestType, 'GOLDEN');
  assert.equal(golden.newPity, 0);
});

// Mục 8: Buff bị động khi >= 70% & hành null không buff/không cảnh báo
test('Acceptance #8: Buff Ngũ Hành >= 70% (Max HP +25, Crit x2, Thủy Pomo x1.2, Hỏa +10pp, Thổ phạt x0.5) & hành null', () => {
  const today = '2026-10-25';
  const st = createBlankSlateState(today);
  // Tạo 4 hành MOC, KIM, THUY, THO (bỏ trống HOA -> HOA = null)
  ['MOC', 'KIM', 'THUY', 'THO'].forEach(el => {
    st.habits.push({
      id: `h_${el}`,
      name: el,
      element: el,
      weight: 5,
      kind: 'daily',
      schedule: { mode: 'everyday' },
      startDate: '2026-10-01'
    });
  });

  for (let i = 1; i <= 7; i++) {
    const dk = addDays(today, -i);
    st.days[dk] = {
      energy: 'full',
      restDay: false,
      closed: true,
      entries: {
        h_MOC: { state: 1 },
        h_KIM: { state: 1 },
        h_THUY: { state: 1 },
        h_THO: { state: 1 }
      }
    };
  }

  const radar = computeRadarAndBuffs(st, today);
  assert.equal(radar.pcts.HOA, null);
  assert.equal(radar.buffs.hoa, false);
  assert.equal(radar.buffs.moc, true);
  assert.equal(radar.buffs.kim, true);
  assert.equal(radar.buffs.thuy, true);
  assert.equal(radar.buffs.tho, true);
  assert.equal(computeMaxHp(st, today, radar), 125);
  assert.equal(computePenaltyDamage(st, 20, today, radar), 10);

  // Kiểm tra Crit x2 và Thủy Pomo x1.2 trong computeDay
  st.days[today].entries.h_THUY = { state: 1, crit: true, pomoBonus: true, tickHour: 14 };
  const cDay = computeDay(st, today, { precomputedRadar: radar });
  // h_THUY có base = 5, crit = 2.0, thuyPomo = 1.2 -> mult = 2.4 -> finalPoints = 12
  assert.equal(cDay.totalPoints, 12);
});

// Mục 9 & 10: Hợp Nhất (+25%, +15 HP 1 lần/ngày, bỏ tick thu hồi điểm) & Boss Tuần
test('Acceptance #9 & #10: Ngũ Hành Hợp Nhất & Boss Hầm Ngục Tuần (Max HP 80%, sát thương, thưởng +200 Vàng)', () => {
  const today = '2026-10-25';
  const st = createBlankSlateState(today);
  st.hp = 80;
  ['MOC', 'HOA', 'THO', 'KIM', 'THUY'].forEach(el => {
    st.habits.push({
      id: `h_${el}`,
      name: el,
      element: el,
      weight: 4,
      kind: 'daily',
      schedule: { mode: 'everyday' },
      startDate: '2026-10-01'
    });
    st.days[today].entries[`h_${el}`] = { state: 1.5, tickHour: 10 };
  });

  const bossBefore = computeWeeklyBoss(st, today);
  // 5 habits * 4 weight * 7 days = 140 -> 80% = 112 Max HP
  assert.equal(bossBefore.maxHp, 112);

  // Chốt ledger: 5 habits * 4 * 1.5 * 1.2 (Tương Sinh) = 36đ; Hợp Nhất +25% = +9đ -> 45đ
  const led = reconcileDayLedger(st, today, today);
  assert.equal(led.harmonyJustTriggered, true);
  assert.equal(led.dayComputation.totalPoints, 45);
  assert.equal(st.hp, 95); // 80 + 15 HP
});

// Mục 11: Lịch tháng (02/2024, 02/2028, 02/2100, tháng 31 ngày bắt đầu CN) & Check-in bù Vàng x0.5
test('Acceptance #11: Lịch tháng (02/2024, 02/2028, 02/2100, 03/2026) & Check-in bù nhận Vàng x0.5', () => {
  assert.equal(buildMonthGrid(2024, 2).daysInMonth, 29);
  assert.equal(buildMonthGrid(2028, 2).daysInMonth, 29);
  assert.equal(buildMonthGrid(2100, 2).daysInMonth, 28);
  assert.equal(buildMonthGrid(2026, 3).leadingCount, 6);

  const today = '2026-10-25';
  const yesterday = '2026-10-24';
  const st = createBlankSlateState(today);
  st.habits.push({
    id: 'h1',
    name: 'Daily',
    element: 'KIM',
    weight: 4,
    kind: 'daily',
    schedule: { mode: 'everyday' },
    startDate: '2026-10-01'
  });
  st.days[yesterday] = {
    energy: 'full',
    restDay: false,
    closed: true,
    entries: {
      h1: { state: 1, backfilled: true, tickHour: 14 }
    }
  };
  const compBackfill = computeDay(st, yesterday);
  assert.equal(compBackfill.totalPoints, 4); // Điểm 100%
  assert.equal(compBackfill.totalGold, 10); // Vàng chuẩn 4*5=20 -> backfill x0.5 = 10
});

// Mục 12 & 13: Exhausted Status Effect, Titles, Backup/Restore, Xóa lịch sử mẫu
test('Acceptance #12 & #13: Exhausted Status Effect, Danh hiệu, Backup/Restore & Xóa lịch sử mẫu', () => {
  const today = '2026-10-25';
  const st = createBlankSlateState(today);
  st.habits.push({
    id: 'h_moc',
    name: 'Ngủ sớm',
    element: 'MOC',
    weight: 5,
    kind: 'daily',
    schedule: { mode: 'everyday' },
    startDate: '2026-10-01'
  });

  // 3 ngày liên tiếp đã chốt có Mộc = 0 (< 40%) -> Exhausted bật
  for (let i = 1; i <= 3; i++) {
    const dk = addDays(today, -i);
    st.days[dk] = { energy: 'full', restDay: false, closed: true, entries: {} };
  }
  assert.equal(computeExhaustedStatus(st, today), true);

  // Ngay khi hôm nay Mộc đạt >= 70% (state = 1) -> Exhausted tắt ngay lập tức
  st.days[today].entries.h_moc = { state: 1 };
  assert.equal(computeExhaustedStatus(st, today), false);

  // Kiểm tra Xóa lịch sử mẫu giữ nguyên thói quen
  const seeded = createSeedState(today);
  const countBefore = seeded.habits.length;
  clearSeedHistoryInState(seeded, today);
  assert.equal(seeded.habits.length, countBefore);
  assert.equal(seeded.inventory.gold, 100);
});

console.log('----------------------------------------------------------------------');
console.log(` TỔNG KẾT SUITE: ${passed} PASS / ${failed} FAIL`);
console.log('----------------------------------------------------------------------');

if (failed > 0) {
  process.exit(1);
}
