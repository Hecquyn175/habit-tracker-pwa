/**
 * SYSTEM: NGŨ HÀNH LEVELING v4.0 ULTIMATE
 * Module: js/charts.js — Chart.js 3-Layer Effort Analytics, 90-Day Heatmap & Pentagon Radar SVG
 */

import {
  ELEMENT_KEYS,
  ELEMENTS,
  addDays,
  parseDateKey,
  computeDay,
  computeRadarAndBuffs
} from './engine.js';

let effortChartInstance = null;

export function formatShortVN(dateKey) {
  const [, m, d] = dateKey.split('-');
  return `${d}/${m}`;
}

export function formatFullVN(dateKey) {
  const dt = parseDateKey(dateKey);
  const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  const [y, m, d] = dateKey.split('-');
  return `${days[dt.getDay()]}, ${d}/${m}/${y}`;
}

/* ============================================================================
   1. ĐỒ THỊ SỰ CỐ GẮNG ĐA TẦNG (CHART.JS 3 LỚP + KPI)
   ============================================================================ */

export function renderEffortAnalyticsChart(state, todayKey, rangeDays = 14) {
  const N = Number(rangeDays) || 14;
  const labels = [];
  const currentSeries = [];
  const ghostSeries = [];
  const ma7Series = [];

  // Để tính MA7 trên TOÀN BỘ lịch sử (kể cả các ngày trước cửa sổ hiển thị),
  // ta tính trước điểm của N + 14 ngày gần nhất
  const totalLookback = N * 2 + 10;
  const dayMap = {};

  for (let i = totalLookback; i >= 0; i--) {
    const dk = addDays(todayKey, -i);
    const hasLog = Boolean(state.days?.[dk]);
    const comp = computeDay(state, dk, { radarRefDateKey: todayKey });
    dayMap[dk] = {
      hasLog,
      comp
    };
  }

  let currentPeriodSum = 0;
  let ghostPeriodSum = 0;

  for (let i = N - 1; i >= 0; i--) {
    const dk = addDays(todayKey, -i);
    const ghostDk = addDays(todayKey, -(i + N));
    labels.push(formatShortVN(dk));

    const curItem = dayMap[dk];
    const ghostItem = dayMap[ghostDk];

    // Ngày Off-day hoặc Rest hiển thị là điểm ngắt (null), không kéo đường về 0
    if (curItem.comp.isRestDay || (curItem.comp.isOffDay && curItem.comp.totalPoints === 0 && dk !== todayKey)) {
      currentSeries.push(null);
    } else if (!curItem.hasLog && dk < (state.createdAt || todayKey)) {
      currentSeries.push(null);
    } else {
      currentSeries.push(curItem.comp.totalPoints);
      currentPeriodSum += curItem.comp.totalPoints;
    }

    if (
      !ghostItem ||
      ghostItem.comp.isRestDay ||
      (ghostItem.comp.isOffDay && ghostItem.comp.totalPoints === 0) ||
      (!ghostItem.hasLog && ghostDk < (state.createdAt || todayKey))
    ) {
      ghostSeries.push(null);
    } else {
      ghostSeries.push(ghostItem.comp.totalPoints);
      ghostPeriodSum += ghostItem.comp.totalPoints;
    }

    // Tính MA7 tại ngày dk trên toàn bộ lịch sử (lấy các ngày hợp lệ trong 7 ngày kết thúc tại dk)
    const maVals = [];
    for (let m = 0; m < 7; m++) {
      const mKey = addDays(dk, -m);
      const mItem = dayMap[mKey];
      if (!mItem) continue;
      if (mItem.comp.isRestDay || (mItem.comp.isOffDay && mItem.comp.totalPoints === 0)) continue;
      if (!mItem.hasLog && mKey < (state.createdAt || todayKey)) continue;
      maVals.push(mItem.comp.totalPoints);
    }
    if (maVals.length > 0) {
      const avg = maVals.reduce((a, b) => a + b, 0) / maVals.length;
      ma7Series.push(Number(avg.toFixed(2)));
    } else {
      ma7Series.push(null);
    }
  }

  // Cập nhật 4 thẻ KPI trên đồ thị
  const todayComp = dayMap[todayKey]?.comp || computeDay(state, todayKey, { radarRefDateKey: todayKey });
  const kpiTodayEl = document.getElementById('kpi-today-score');
  const kpiTodaySubEl = document.getElementById('kpi-today-sub');
  if (kpiTodayEl) {
    kpiTodayEl.textContent = `${todayComp.totalPoints} đ`;
  }
  if (kpiTodaySubEl) {
    kpiTodaySubEl.textContent = `Mục tiêu: ${todayComp.target} đ (${todayComp.ratioPct}%)`;
  }

  const kpiGhostEl = document.getElementById('kpi-vs-ghost');
  const kpiGhostSubEl = document.getElementById('kpi-vs-ghost-sub');
  if (kpiGhostEl && kpiGhostSubEl) {
    if (ghostPeriodSum > 0) {
      const diffPct = Math.round(((currentPeriodSum - ghostPeriodSum) / ghostPeriodSum) * 100);
      const sign = diffPct >= 0 ? '+' : '';
      kpiGhostEl.textContent = `${sign}${diffPct}%`;
      kpiGhostEl.className =
        diffPct >= 0
          ? 'text-xl font-hud font-bold text-emerald-400'
          : 'text-xl font-hud font-bold text-rose-400';
      kpiGhostSubEl.textContent = `Kỳ này: ${currentPeriodSum.toFixed(1)}đ vs Kỳ trước: ${ghostPeriodSum.toFixed(1)}đ`;
    } else {
      kpiGhostEl.textContent = `${currentPeriodSum.toFixed(1)} đ`;
      kpiGhostEl.className = 'text-xl font-hud font-bold text-sky-400';
      kpiGhostSubEl.textContent = `Tổng điểm ${N} ngày qua`;
    }
  }

  const latestMa7 = ma7Series.filter(v => v !== null).pop() ?? 0;
  const kpiMa7El = document.getElementById('kpi-ma7-val');
  if (kpiMa7El) {
    kpiMa7El.textContent = `${latestMa7} đ`;
  }

  const kpiElCount = document.getElementById('kpi-active-elements');
  const kpiElSub = document.getElementById('kpi-active-elements-sub');
  if (kpiElCount) {
    kpiElCount.textContent = `${todayComp.activeElementCount} / 5 Hành`;
  }
  if (kpiElSub) {
    if (!todayComp.hasAllFiveElements) {
      kpiElSub.textContent = 'Cần có thói quen ở cả 5 hành để đạt Hợp Nhất';
    } else if (todayComp.isHarmony) {
      kpiElSub.textContent = 'Đã đạt Ngũ Hành Hợp Nhất (+25% Điểm)!';
    } else {
      kpiElSub.textContent = 'Đủ 5 hành ≥ 100% ➔ +25% Điểm & +15 HP';
    }
  }

  // Vẽ Chart.js
  const canvas = document.getElementById('effort-chart-canvas');
  if (!canvas || typeof window.Chart === 'undefined') return;
  const ctx = canvas.getContext('2d');

  if (effortChartInstance) {
    effortChartInstance.destroy();
  }

  const grad = ctx.createLinearGradient(0, 0, 0, 290);
  grad.addColorStop(0, 'rgba(56, 189, 248, 0.42)');
  grad.addColorStop(0.65, 'rgba(16, 185, 129, 0.12)');
  grad.addColorStop(1, 'rgba(6, 9, 19, 0.0)');

  effortChartInstance = new window.Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Đường Nỗ Lực Thực Tế',
          data: currentSeries,
          borderColor: '#38bdf8',
          backgroundColor: grad,
          borderWidth: 3,
          pointBackgroundColor: '#060913',
          pointBorderColor: '#38bdf8',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          tension: 0.32,
          spanGaps: false,
          fill: true,
          order: 1
        },
        {
          label: 'Xu Hướng Trung Bình Động (MA7)',
          data: ma7Series,
          borderColor: '#f59e0b',
          backgroundColor: 'transparent',
          borderWidth: 2.5,
          pointRadius: 2,
          pointHoverRadius: 5,
          tension: 0.38,
          spanGaps: true,
          fill: false,
          order: 2
        },
        {
          label: `Đường Bóng Ma (${N} ngày liền trước)`,
          data: ghostSeries,
          borderColor: 'rgba(148, 163, 184, 0.6)',
          backgroundColor: 'transparent',
          borderDash: [6, 5],
          borderWidth: 2,
          pointRadius: 2,
          pointHoverRadius: 4,
          tension: 0.32,
          spanGaps: true,
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
              family: "'Be Vietnam Pro', system-ui, sans-serif",
              size: 11,
              weight: '600'
            },
            usePointStyle: true,
            boxWidth: 8
          }
        },
        tooltip: {
          backgroundColor: 'rgba(6, 9, 19, 0.96)',
          titleColor: '#38bdf8',
          bodyColor: '#f1f5f9',
          borderColor: 'rgba(56, 189, 248, 0.45)',
          borderWidth: 1,
          padding: 10,
          callbacks: {
            afterBody: items => {
              const idx = items[0].dataIndex;
              const dk = addDays(todayKey, -(N - 1 - idx));
              const dInfo = dayMap[dk]?.comp;
              if (!dInfo) return [];
              const extra = [`Mục tiêu: ${dInfo.target}đ (${dInfo.ratioPct}%)`];
              if (dInfo.isRestDay) extra.push('Trạng thái: Đang Nghỉ Trọ (Rest)');
              else if (dInfo.isOffDay) extra.push('Trạng thái: Ngày nghỉ lịch trình (Off-day)');
              if (dInfo.isHarmony) extra.push('Đạt Ngũ Hành Hợp Nhất (+25%)');
              const note = state.days?.[dk]?.note;
              if (note) extra.push(`Nhật ký: "${note}"`);
              return extra;
            }
          }
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(30, 41, 59, 0.5)' },
          ticks: { color: '#94a3b8', font: { size: 11 } }
        },
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(30, 41, 59, 0.5)' },
          ticks: {
            color: '#94a3b8',
            font: { size: 11 },
            callback: v => `${v}đ`
          }
        }
      }
    }
  });
}

/* ============================================================================
   2. LƯỚI NHIỆT ĐỘ 90 NGÀY (CONSISTENCY HEATMAP)
   ============================================================================ */

export function renderHeatmap90Days(state, todayKey, onCellClick) {
  const container = document.getElementById('heatmap-grid-container');
  if (!container) return;
  container.innerHTML = '';

  const totalDays = 90;
  for (let i = totalDays - 1; i >= 0; i--) {
    const dk = addDays(todayKey, -i);
    const hasLog = Boolean(state.days?.[dk]);
    const comp = computeDay(state, dk, { radarRefDateKey: todayKey });
    const note = state.days?.[dk]?.note || '';

    let levelClass = 'heat-lv-0';
    let statusDesc = `${comp.ratioPct}% hoàn thành`;

    if (comp.isRestDay) {
      levelClass = 'heat-lv-off';
      statusDesc = 'Nghỉ Trọ (Rest Mode)';
    } else if (!hasLog && dk < (state.createdAt || todayKey)) {
      levelClass = 'heat-lv-0';
      statusDesc = 'Chưa có dữ liệu';
    } else if (comp.isOffDay && comp.totalPoints === 0) {
      levelClass = 'heat-lv-off';
      statusDesc = 'Ngày nghỉ lịch trình (Off-day)';
    } else if (comp.ratioPct >= 100 || comp.isHarmony) {
      levelClass = 'heat-lv-4';
    } else if (comp.ratioPct >= 70) {
      levelClass = 'heat-lv-3';
    } else if (comp.ratioPct >= 40) {
      levelClass = 'heat-lv-2';
    } else if (comp.totalPoints > 0) {
      levelClass = 'heat-lv-1';
    }

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `heatmap-cell ${levelClass} ${note ? 'ring-1 ring-amber-400' : ''}`;
    btn.setAttribute('aria-label', `Ngày ${dk}: ${comp.totalPoints} điểm, ${statusDesc}`);
    btn.dataset.dateKey = dk;

    btn.addEventListener('mouseenter', e =>
      showHeatmapTooltip(e, dk, comp, statusDesc, note)
    );
    btn.addEventListener('mousemove', e => moveHeatmapTooltip(e));
    btn.addEventListener('mouseleave', () => hideHeatmapTooltip());
    btn.addEventListener('click', () => {
      hideHeatmapTooltip();
      if (typeof onCellClick === 'function') onCellClick(dk);
    });

    container.appendChild(btn);
  }
}

function showHeatmapTooltip(event, dateKey, comp, statusDesc, note) {
  const tip = document.getElementById('heatmap-tooltip');
  if (!tip) return;

  tip.innerHTML = `
    <div class="font-hud font-bold text-sky-400 border-b border-slate-800 pb-1 mb-1">
      ${formatFullVN(dateKey)}
    </div>
    <div class="text-slate-200">
      Điểm: <strong class="text-emerald-400">${comp.totalPoints} đ</strong> / ${comp.target} đ (${statusDesc})
    </div>
    ${comp.isHarmony ? '<div class="text-fuchsia-400 font-semibold mt-0.5">⚡ Ngũ Hành Hợp Nhất (+25%)</div>' : ''}
    ${
      note
        ? `<div class="mt-1.5 p-1.5 rounded bg-slate-900 border border-amber-500/40 text-amber-200 italic">📝 "${escapeHtml(note)}"</div>`
        : '<div class="text-[10px] text-slate-400 mt-1">Bấm để xem Chi Tiết Ngày / Ghi nhật ký</div>'
    }
  `;
  tip.classList.remove('hidden');
  moveHeatmapTooltip(event);
}

function moveHeatmapTooltip(event) {
  const tip = document.getElementById('heatmap-tooltip');
  if (!tip) return;
  let x = event.clientX + 14;
  let y = event.clientY + 14;
  if (x + 260 > window.innerWidth) x = event.clientX - 270;
  if (y + 130 > window.innerHeight) y = event.clientY - 130;
  tip.style.left = `${x}px`;
  tip.style.top = `${y}px`;
}

export function hideHeatmapTooltip() {
  const tip = document.getElementById('heatmap-tooltip');
  if (tip) tip.classList.add('hidden');
}

/* ============================================================================
   3. BIỂU ĐỒ RADAR NGŨ GIÁC SVG (CÓ MỐC 70% NÉT ĐỨT & XỬ LÝ HÀNH NULL)
   ============================================================================ */

export function renderPentagonRadarSVG(state, todayKey) {
  const svg = document.getElementById('pentagon-radar-svg');
  if (!svg) return;

  const radar = computeRadarAndBuffs(state, todayKey);

  // Cảnh báo Khí huyết suy giảm nếu Mộc < 40% (và không phải null)
  const warnEl = document.getElementById('moc-warning-banner');
  if (warnEl) {
    if (radar.mocWarning) {
      warnEl.classList.remove('hidden');
    } else {
      warnEl.classList.add('hidden');
    }
  }

  const balEl = document.getElementById('radar-balance-pill');
  if (balEl) {
    balEl.textContent = `Cân bằng: ${radar.balanceScore}%`;
  }

  const cx = 165;
  const cy = 155;
  const maxR = 96;

  const getPoint = (idx, ratio) => {
    const angle = -Math.PI / 2 + (idx * 2 * Math.PI) / 5;
    const r = maxR * ratio;
    return {
      x: Number((cx + r * Math.cos(angle)).toFixed(1)),
      y: Number((cy + r * Math.sin(angle)).toFixed(1))
    };
  };

  // Lưới đồng tâm 20%, 40%, 60%, 80%, 100%
  const levels = [0.2, 0.4, 0.6, 0.8, 1.0];
  const gridPolys = levels
    .map(lv => {
      const pts = ELEMENT_KEYS.map((_, i) => {
        const p = getPoint(i, lv);
        return `${p.x},${p.y}`;
      }).join(' ');
      return `<polygon points="${pts}" fill="none" stroke="rgba(148, 163, 184, 0.18)" stroke-width="1" />`;
    })
    .join('');

  // Vòng mốc Buff 70% bằng nét đứt nổi bật
  const buff70Pts = ELEMENT_KEYS.map((_, i) => {
    const p = getPoint(i, 0.7);
    return `${p.x},${p.y}`;
  }).join(' ');
  const buff70Poly = `<polygon points="${buff70Pts}" fill="none" stroke="rgba(245, 158, 11, 0.65)" stroke-width="1.5" stroke-dasharray="4,3" />`;

  // 5 trục từ tâm
  const axes = ELEMENT_KEYS.map((_, i) => {
    const p = getPoint(i, 1.0);
    return `<line x1="${cx}" y1="${cy}" x2="${p.x}" y2="${p.y}" stroke="rgba(148, 163, 184, 0.22)" stroke-width="1" />`;
  }).join('');

  // Đa giác dữ liệu thực tế
  const dataVertices = ELEMENT_KEYS.map((elKey, i) => {
    const pct = radar.pcts[elKey];
    const ratio = pct === null ? 0.05 : Math.max(0.06, Math.min(1.0, pct / 100));
    return getPoint(i, ratio);
  });
  const dataPolyStr = dataVertices.map(p => `${p.x},${p.y}`).join(' ');

  // Nhãn 5 đỉnh
  const labelsSvg = ELEMENT_KEYS.map((elKey, i) => {
    const el = ELEMENTS[elKey];
    const pct = radar.pcts[elKey];
    const lblPos = getPoint(i, 1.28);
    const dotPos = dataVertices[i];
    const pctText = pct === null ? '—' : `${pct}%`;
    const isBuffed = pct !== null && pct >= 70;

    return `
      <circle cx="${dotPos.x}" cy="${dotPos.y}" r="${isBuffed ? 5.5 : 4.5}" fill="${
        pct === null ? '#475569' : el.color
      }" stroke="#060913" stroke-width="2" />
      <g transform="translate(${lblPos.x}, ${lblPos.y})">
        <text x="0" y="-4" text-anchor="middle" fill="${el.color}" font-family="'Chakra Petch', 'Be Vietnam Pro', sans-serif" font-weight="700" font-size="12.5">
          ${el.emoji} ${el.name.toUpperCase()} (${el.stat})
        </text>
        <text x="0" y="11" text-anchor="middle" fill="${
          isBuffed ? '#fde68a' : '#e2e8f0'
        }" font-family="'Chakra Petch', 'Be Vietnam Pro', sans-serif" font-weight="700" font-size="11.5">
          ${pctText}${isBuffed ? ' ★' : ''}
        </text>
      </g>
    `;
  }).join('');

  svg.innerHTML = `
    <defs>
      <radialGradient id="radarGradV4" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="rgba(56, 189, 248, 0.45)" />
        <stop offset="100%" stop-color="rgba(16, 185, 129, 0.22)" />
      </radialGradient>
    </defs>
    ${gridPolys}
    ${buff70Poly}
    ${axes}
    <polygon points="${dataPolyStr}" fill="url(#radarGradV4)" stroke="#38bdf8" stroke-width="2.5" class="radar-polygon" />
    ${labelsSvg}
  `;

  // Danh sách % từng hành kèm Buff đang kích hoạt
  const listEl = document.getElementById('radar-buffs-list');
  if (listEl) {
    listEl.innerHTML = ELEMENT_KEYS.map(elKey => {
      const el = ELEMENTS[elKey];
      const d = radar.details[elKey];
      const pctStr = d.pct === null ? '— (Không lịch)' : `${d.pct}%`;
      return `
        <div class="flex items-center justify-between gap-2 bg-slate-900/75 border ${
          d.buffActive ? 'border-amber-500/40' : 'border-slate-800/80'
        } rounded-lg px-3 py-2">
          <div class="min-w-0">
            <div class="flex items-center gap-1.5 font-semibold text-xs text-slate-100">
              <span>${el.emoji}</span>
              <span>${el.name} (${el.stat})</span>
              ${
                d.buffActive
                  ? '<span class="px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-400/50 text-amber-300 text-[10px] font-bold">BUFF KÍCH HOẠT</span>'
                  : ''
              }
            </div>
            <div class="text-[11px] text-slate-400 truncate mt-0.5">${el.buffName}</div>
          </div>
          <div class="font-hud font-bold text-xs shrink-0" style="color: ${el.color}">
            ${pctStr}
          </div>
        </div>
      `;
    }).join('');
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
