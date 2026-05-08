/**
 * 可视化校准报告生成器 - FJÖRÐUR + 明日方舟混合风格
 */

import { writeFileSync } from 'fs';

export interface VisualCalibrationReportParams {
  targetData: Array<{ metric: string; target: number; unit?: string }>;
  initialParams: Record<string, number>;
  optimalParams: Record<string, number>;
  simulationResults: Record<string, number>;
  errorHistory: Array<{ iteration: number; params: Record<string, number>; error: number }>;
  outputPath: string;
  drugName?: string;
}

export function generateVisualCalibrationReport(params: VisualCalibrationReportParams): string {
  const { targetData, initialParams, optimalParams, simulationResults, errorHistory, outputPath, drugName = 'Drug' } = params;
  const now = new Date().toLocaleString('zh-CN');
  const fitQuality = calculateFitQuality(targetData, simulationResults);

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>🔬 ${drugName} 校准报告 - 可视化版</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Space+Mono:wght@400;700&display=swap');

:root {
  --bg: #0a0e17;
  --surface: #111827;
  --surface2: #1a2332;
  --border: #1e293b;
  --text: #c8d6e5;
  --text-dim: #64748b;
  --aurora1: #22d3ee;
  --aurora2: #818cf8;
  --aurora3: #34d399;
  --lava: #f97316;
  --ark-yellow: #eab308;
  --ark-red: #ef4444;
  --ark-grid: rgba(34, 211, 238, 0.05);
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  background: var(--bg);
  color: var(--text);
  font-family: 'Inter', system-ui, sans-serif;
  line-height: 1.6;
  padding: 20px;
  background-image: 
    linear-gradient(var(--ark-grid) 1px, transparent 1px),
    linear-gradient(90deg, var(--ark-grid) 1px, transparent 1px);
  background-size: 50px 50px;
}

.container { max-width: 900px; margin: 0 auto; }

.hex {
  width: 60px; height: 34px;
  background: var(--lava);
  display: inline-flex;
  align-items: center; justify-content: center;
  font-family: 'Space Mono', monospace;
  font-size: 0.75rem; font-weight: bold;
  color: var(--bg);
  clip-path: polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%);
}

.header {
  position: relative;
  padding: 40px 30px;
  background: linear-gradient(135deg, var(--surface) 0%, var(--bg) 100%);
  border: 1px solid var(--border);
  border-radius: 12px;
  margin-bottom: 24px;
  overflow: hidden;
  border-top: 3px solid transparent;
  border-image: linear-gradient(90deg, var(--aurora1), var(--aurora2), var(--aurora3)) 1;
  border-image-slice: 1;
}
.header::after {
  content: '';
  position: absolute;
  bottom: 0; left: 0;
  width: 100px; height: 3px;
  background: var(--lava);
}
.header h1 {
  font-family: 'Space Mono', monospace;
  font-size: 1.6rem; font-weight: 700;
  letter-spacing: 0.1em;
  margin-bottom: 12px;
  background: linear-gradient(135deg, var(--aurora1), var(--aurora2));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.corner-accent {
  position: absolute;
  width: 20px; height: 20px;
  border: 2px solid var(--lava);
  opacity: 0.5;
}
.corner-accent-tl { top: 8px; left: 8px; border-right: none; border-bottom: none; }
.corner-accent-tr { top: 8px; right: 8px; border-left: none; border-bottom: none; }
.corner-accent-bl { bottom: 8px; left: 8px; border-right: none; border-top: none; }
.corner-accent-br { bottom: 8px; right: 8px; border-left: none; border-top: none; }

.score-card {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}
.score-item {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 24px 20px;
  text-align: center;
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;
}
.score-item::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 2px;
  background: var(--lava);
  opacity: 0;
  transition: opacity 0.3s;
}
.score-item:hover {
  border-color: var(--aurora1);
  transform: translateY(-2px);
}
.score-item:hover::before { opacity: 1; }
.score-item .emoji { font-size: 1.8rem; margin-bottom: 12px; }
.score-item .value {
  font-family: 'Space Mono', monospace;
  font-size: 1.6rem; font-weight: 700;
  color: var(--aurora1);
}
.score-item .label {
  color: var(--text-dim);
  font-size: 0.75rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.overall-score {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 32px;
  margin-bottom: 24px;
  text-align: center;
  position: relative;
  border-top: 3px solid transparent;
  border-image: linear-gradient(90deg, var(--lava), var(--aurora1)) 1;
  border-image-slice: 1;
}
.overall-score .grade {
  font-family: 'Space Mono', monospace;
  font-size: 4rem; font-weight: 700;
  margin: 16px 0;
  letter-spacing: 0.1em;
}
.overall-score .grade-A { color: var(--aurora3); text-shadow: 0 0 30px rgba(52, 211, 153, 0.3); }
.overall-score .grade-B { color: var(--aurora1); text-shadow: 0 0 30px rgba(34, 211, 238, 0.3); }
.overall-score .grade-C { color: var(--ark-yellow); text-shadow: 0 0 30px rgba(234, 179, 8, 0.3); }
.overall-score .grade-D { color: var(--ark-red); text-shadow: 0 0 30px rgba(239, 68, 68, 0.3); }

.progress-bar {
  width: 100%; height: 8px;
  background: var(--surface2);
  border-radius: 4px;
  overflow: hidden;
  margin: 12px 0;
  position: relative;
}
.progress-bar::after {
  content: '';
  position: absolute;
  top: 0; right: 0; bottom: 0;
  width: 2px;
  background: var(--lava);
}
.progress-bar .fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.5s ease;
  position: relative;
}
.progress-bar .fill::after {
  content: '';
  position: absolute;
  top: 0; right: 0; bottom: 0;
  width: 3px;
  background: rgba(255,255,255,0.3);
}
.progress-bar .fill-good { background: linear-gradient(90deg, var(--aurora3), #22c55e); }
.progress-bar .fill-warning { background: linear-gradient(90deg, var(--ark-yellow), #ca8a04); }
.progress-bar .fill-bad { background: linear-gradient(90deg, var(--ark-red), #dc2626); }

.table-container {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
  position: relative;
}
.table-container::before {
  content: '';
  position: absolute;
  top: 0; left: 0;
  width: 4px; height: 100%;
  background: var(--lava);
  border-radius: 12px 0 0 12px;
}
.table-container h2 {
  font-family: 'Space Mono', monospace;
  font-size: 0.9rem;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  margin-bottom: 20px;
  color: var(--aurora1);
}
table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
th {
  text-align: left; padding: 12px;
  color: var(--text-dim); font-weight: 500;
  border-bottom: 2px solid var(--border);
  font-family: 'Space Mono', monospace;
  font-size: 0.75rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
td { padding: 12px; border-bottom: 1px solid var(--border); }
tr:hover { background: rgba(34, 211, 238, 0.03); }

.traffic-light {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  border-radius: 6px;
  font-size: 0.8rem; font-weight: 600;
  font-family: 'Space Mono', monospace;
  letter-spacing: 0.05em;
}
.traffic-light-green {
  background: rgba(52, 211, 153, 0.1);
  border: 1px solid rgba(52, 211, 153, 0.3);
  color: var(--aurora3);
}
.traffic-light-yellow {
  background: rgba(234, 179, 8, 0.1);
  border: 1px solid rgba(234, 179, 8, 0.3);
  color: var(--ark-yellow);
}
.traffic-light-red {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: var(--ark-red);
}
.dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  display: inline-block;
  box-shadow: 0 0 8px currentColor;
}
.dot-green { background: var(--aurora3); }
.dot-yellow { background: var(--ark-yellow); }
.dot-red { background: var(--ark-red); }

.explanation {
  background: var(--surface2);
  border-left: 3px solid var(--lava);
  padding: 16px 20px 16px 28px;
  border-radius: 0 8px 8px 0;
  margin: 16px 0;
  font-size: 0.85rem;
  position: relative;
}
.explanation::before {
  content: '>';
  position: absolute;
  left: 8px; top: 16px;
  color: var(--lava);
  font-family: 'Space Mono', monospace;
}

.param-change {
  display: flex;
  align-items: center;
  gap: 12px;
}
.param-change .arrow {
  font-size: 1.2rem; font-weight: bold;
}
.param-change .change-value {
  font-family: 'Space Mono', monospace;
  font-size: 0.8rem;
}
.param-change .change-up { color: var(--ark-red); }
.param-change .change-down { color: var(--aurora3); }

.chart-container {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
  position: relative;
  border-top: 3px solid transparent;
  border-image: linear-gradient(90deg, var(--lava), var(--aurora1)) 1;
  border-image-slice: 1;
}
.chart-container h2 {
  font-family: 'Space Mono', monospace;
  font-size: 0.9rem;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  margin-bottom: 16px;
  color: var(--aurora1);
}
.chart-container canvas { width: 100%; height: 300px; }

.details-summary {
  cursor: pointer;
  padding: 16px;
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 8px;
  margin-bottom: 0;
  user-select: none;
  font-family: 'Space Mono', monospace;
  font-size: 0.8rem;
  letter-spacing: 0.05em;
  color: var(--text-dim);
  transition: all 0.2s;
}
.details-summary:hover {
  background: var(--surface);
  color: var(--aurora1);
  border-color: var(--aurora1);
}
.details-content {
  padding: 16px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-top: none;
  border-radius: 0 0 8px 8px;
  margin-bottom: 24px;
}

footer {
  text-align: center;
  padding: 40px 20px;
  color: var(--text-dim);
  font-size: 0.75rem;
  font-family: 'Space Mono', monospace;
  letter-spacing: 0.1em;
}
footer .rhodes {
  color: var(--lava);
  font-weight: bold;
}

.scanline {
  position: fixed;
  top: 0; left: 0;
  width: 100%; height: 2px;
  background: linear-gradient(90deg, transparent, var(--aurora1), transparent);
  opacity: 0.1;
  animation: scan 4s linear infinite;
  pointer-events: none;
}
@keyframes scan {
  0% { transform: translateY(-100vh); }
  100% { transform: translateY(100vh); }
}

@media (max-width: 600px) {
  .score-card { grid-template-columns: 1fr; }
  body { padding: 10px; }
  .header h1 { font-size: 1.2rem; }
  .overall-score .grade { font-size: 3rem; }
}
</style>
</head>
<body>
<div class="scanline"></div>
<div class="container">

<div class="header">
  <div class="corner-accent corner-accent-tl"></div>
  <div class="corner-accent corner-accent-tr"></div>
  <div class="corner-accent corner-accent-bl"></div>
  <div class="corner-accent corner-accent-br"></div>
  <h1>🔬 ${drugName} 校准报告</h1>
  <div class="subtitle">参数自动优化结果可视化</div>
  <div class="time">[${now}] 生成完毕</div>
</div>

<div class="overall-score">
  <div class="grade-label">总体拟合评分</div>
  <div class="grade grade-${fitQuality.grade}">${fitQuality.grade}</div>
  <div class="progress-bar">
    <div class="fill ${getProgressClass(fitQuality.score)}" style="width: ${fitQuality.score}%"></div>
  </div>
  <div style="color: var(--text-dim); font-size: 0.85rem; margin-top: 12px; font-family: 'Space Mono', monospace;">
    FIT_SCORE: ${fitQuality.score.toFixed(1)}% — ${fitQuality.description}
  </div>
</div>

<div class="score-card">
  <div class="score-item">
    <div class="emoji">🎯</div>
    <div class="value">${targetData.length}</div>
    <div class="label">校准目标数</div>
  </div>
  <div class="score-item">
    <div class="emoji">🔧</div>
    <div class="value">${Object.keys(optimalParams).length}</div>
    <div class="label">优化参数数</div>
  </div>
  <div class="score-item">
    <div class="emoji">🔄</div>
    <div class="value">${errorHistory.length}</div>
    <div class="label">迭代次数</div>
  </div>
  <div class="score-item">
    <div class="emoji">📉</div>
    <div class="value">${(errorHistory[errorHistory.length - 1]?.error || 0).toExponential(2)}</div>
    <div class="label">最终误差</div>
  </div>
</div>

<div class="table-container">
  <h2>🎯 拟合质量详情</h2>
  <div class="explanation">
    <strong>如何阅读:</strong> 绿色表示预测很接近目标值,黄色表示有一定偏差,红色表示偏差较大需要关注.
    进度条显示预测值相对于目标值的比例.
  </div>
  <table>
    <thead>
      <tr><th>指标</th><th>目标值</th><th>预测值</th><th>匹配度</th><th>状态</th></tr>
    </thead>
    <tbody>
      ${targetData.map(t => {
        const predicted = simulationResults[t.metric] || 0;
        const relError = t.target > 0 ? Math.abs(predicted - t.target) / t.target : 0;
        const status = getStatus(relError);
        const percent = t.target > 0 ? (predicted / t.target * 100) : 0;
        return `<tr>
        <td><strong>${t.metric}</strong></td>
        <td>${t.target.toFixed(4)} ${t.unit || ''}</td>
        <td>${predicted.toFixed(4)} ${t.unit || ''}</td>
        <td>
          <div class="progress-bar" style="height: 12px;">
            <div class="fill ${status.progressClass}" style="width: ${Math.min(percent, 100)}%"></div>
          </div>
          <div class="comparison-labels">
            <span>0</span>
            <span>${percent.toFixed(1)}% of target</span>
            <span>${(t.target * 2).toFixed(1)}</span>
          </div>
        </td>
        <td>
          <span class="traffic-light ${status.lightClass}">
            <span class="dot ${status.dotClass}"></span>
            ${status.label}
          </span>
        </td>
      </tr>`;
      }).join('')}
    </tbody>
  </table>
</div>

<div class="table-container">
  <h2>🔧 参数优化结果</h2>
  <div class="explanation">
    <strong>如何阅读:</strong> 显示每个参数从初始值到最优值的变化.红色向上箭头表示增加,绿色向下箭头表示减少.
    偏差%显示变化幅度.
  </div>
  <table>
    <thead>
      <tr><th>参数</th><th>初始值</th><th>变化</th><th>最优值</th><th>偏差%</th></tr>
    </thead>
    <tbody>
      ${Object.entries(optimalParams).map(([name, optimal]) => {
        const initial = initialParams[name] ?? 0;
        const change = optimal - initial;
        const changePct = initial !== 0 ? (change / initial * 100) : 0;
        const arrow = change > 0 ? '▲' : change < 0 ? '▼' : '—';
        const arrowClass = change > 0 ? 'change-up' : change < 0 ? 'change-down' : '';
        return `<tr>
        <td><strong>${name}</strong></td>
        <td>${initial.toFixed(4)}</td>
        <td class="param-change">
          <span class="arrow ${arrowClass}">${arrow}</span>
          <span class="change-value ${arrowClass}">${Math.abs(change).toFixed(4)}</span>
        </td>
        <td style="color: var(--aurora1); font-weight: bold; font-family: 'Space Mono', monospace;">${optimal.toFixed(4)}</td>
        <td>${changePct > 0 ? '+' : ''}${changePct.toFixed(2)}%</td>
      </tr>`;
      }).join('')}
    </tbody>
  </table>
</div>

<div class="chart-container">
  <h2>📉 误差收敛过程</h2>
  <div class="explanation">
    <strong>如何阅读:</strong> 这张图显示算法如何逐步找到更好的参数.曲线应该向下走,表示误差越来越小.
    如果曲线 plateau (变平),说明已经找到最优解.
  </div>
  <canvas id="convergenceChart"></canvas>
</div>

<div class="chart-container">
  <h2>📊 误差分布</h2>
  <div class="explanation">
    <strong>如何阅读:</strong> 显示所有尝试过的参数组合的误差分布.大部分应该集中在左侧(小误差),
    说明搜索空间设置合理.
  </div>
  <canvas id="errorDistChart"></canvas>
</div>

<details>
  <summary class="details-summary">[+] 查看详细迭代数据 (点击展开)</summary>
  <div class="details-content">
    <table>
      <thead>
        <tr><th>迭代</th><th>参数</th><th>误差</th></tr>
      </thead>
      <tbody>
        ${errorHistory.slice(0, 50).map((step, i) => `<tr>
          <td>${step.iteration || i + 1}</td>
          <td>${Object.entries(step.params).map(([k, v]) => `${k}=${v.toFixed(4)}`).join(', ')}</td>
          <td>${step.error.toExponential(4)}</td>
        </tr>`).join('')}
        ${errorHistory.length > 50 ? `<tr><td colspan="3" style="text-align: center; color: var(--text-dim);">... 还有 ${errorHistory.length - 50} 条记录 ...</td></tr>` : ''}
      </tbody>
    </table>
  </div>
</details>

<footer>
  <p><span class="rhodes">RHODES ISLAND</span> PK ENGINE</p>
  <p style="margin-top: 8px; font-size: 0.7rem;">不懂就问,数据说话</p>
</footer>

</div>

<script>
(function() {
  const canvas = document.getElementById('convergenceChart');
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  canvas.width = canvas.clientWidth * dpr;
  canvas.height = canvas.clientHeight * dpr;
  ctx.scale(dpr, dpr);
  
  const W = canvas.clientWidth, H = canvas.clientHeight;
  const pad = { t: 30, r: 30, b: 50, l: 60 };
  const gw = W - pad.l - pad.r, gh = H - pad.t - pad.b;
  
  const history = ${JSON.stringify(errorHistory.map(h => ({ x: h.iteration || 0, y: h.error })))};
  const maxErr = Math.max(...history.map(h => h.y), 0.001);
  
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, 0, W, H);
  
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 0.5;
  for (let i = 0; i <= 5; i++) {
    const y = pad.t + gh * (i / 5);
    ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y); ctx.stroke();
  }
  for (let i = 0; i <= 6; i++) {
    const x = pad.l + gw * (i / 6);
    ctx.beginPath(); ctx.moveTo(x, pad.t); ctx.lineTo(x, pad.t + gh); ctx.stroke();
  }
  
  ctx.fillStyle = '#94a3b8';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('迭代次数', pad.l + gw / 2, H - 10);
  ctx.save();
  ctx.translate(15, pad.t + gh / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText('误差 (对数)', 0, 0);
  ctx.restore();
  
  for (let i = 0; i <= 5; i++) {
    const y = pad.t + gh * (i / 5);
    const val = maxErr * Math.pow(10, -i);
    ctx.fillStyle = '#64748b';
    ctx.textAlign = 'right';
    ctx.fillText(val.toExponential(1), pad.l - 8, y + 4);
  }
  
  ctx.strokeStyle = '#22d3ee';
  ctx.lineWidth = 2;
  ctx.beginPath();
  history.forEach((pt, i) => {
    const x = pad.l + (pt.x / Math.max(...history.map(h => h.x))) * gw;
    const y = pad.t + gh - (Math.log10(pt.y) / Math.log10(maxErr)) * gh;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
  
  ctx.fillStyle = '#22d3ee';
  history.forEach(pt => {
    const x = pad.l + (pt.x / Math.max(...history.map(h => h.x))) * gw;
    const y = pad.t + gh - (Math.log10(pt.y) / Math.log10(maxErr)) * gh;
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
  });
})();

(function() {
  const canvas = document.getElementById('errorDistChart');
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  canvas.width = canvas.clientWidth * dpr;
  canvas.height = canvas.clientHeight * dpr;
  ctx.scale(dpr, dpr);
  
  const W = canvas.clientWidth, H = canvas.clientHeight;
  const pad = { t: 30, r: 30, b: 50, l: 60 };
  const gw = W - pad.l - pad.r, gh = H - pad.t - pad.b;
  
  const errors = ${JSON.stringify(errorHistory.map(h => h.error))};
  const maxErr = Math.max(...errors, 0.001);
  const bins = 20;
  const hist = new Array(bins).fill(0);
  errors.forEach(e => {
    const idx = Math.min(Math.floor((e / maxErr) * bins), bins - 1);
    hist[idx]++;
  });
  const maxCount = Math.max(...hist, 1);
  
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, 0, W, H);
  
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 0.5;
  for (let i = 0; i <= 5; i++) {
    const y = pad.t + gh * (i / 5);
    ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y); ctx.stroke();
  }
  
  ctx.fillStyle = '#94a3b8';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('误差范围', pad.l + gw / 2, H - 10);
  ctx.save();
  ctx.translate(15, pad.t + gh / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText('频次', 0, 0);
  ctx.restore();
  
  const barW = gw / bins * 0.8;
  const gap = gw / bins * 0.2;
  hist.forEach((count, i) => {
    const h = (count / maxCount) * gh;
    const x = pad.l + (i / bins) * gw + gap / 2;
    const y = pad.t + gh - h;
    const gradient = ctx.createLinearGradient(x, y, x, pad.t + gh);
    gradient.addColorStop(0, '#22d3ee');
    gradient.addColorStop(1, 'rgba(34, 211, 238, 0.2)');
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, barW, h);
  });
})();
</script>

</body>
</html>`;

  writeFileSync(outputPath, html);
  return html;
}

function calculateFitQuality(
  targetData: Array<{ metric: string; target: number; unit?: string }>,
  simulationResults: Record<string, number>
): { grade: string; score: number; description: string } {
  let totalRelError = 0;
  let count = 0;
  
  for (const target of targetData) {
    const predicted = simulationResults[target.metric];
    if (predicted !== undefined && target.target !== 0) {
      const relError = Math.abs(predicted - target.target) / Math.abs(target.target);
      totalRelError += relError;
      count++;
    }
  }
  
  const avgRelError = count > 0 ? totalRelError / count : 1;
  const score = Math.max(0, Math.min(100, (1 - avgRelError) * 100));
  
  let grade: string;
  let description: string;
  
  if (avgRelError < 0.05) {
    grade = 'A';
    description = '优秀拟合 - 预测值非常接近目标值';
  } else if (avgRelError < 0.15) {
    grade = 'B';
    description = '良好拟合 - 预测值与目标值偏差较小';
  } else if (avgRelError < 0.30) {
    grade = 'C';
    description = '一般拟合 - 预测值与目标值有一定偏差,建议检查';
  } else {
    grade = 'D';
    description = '较差拟合 - 预测值与目标值偏差较大,需要重新校准';
  }
  
  return { grade, score, description };
}

function getStatus(relError: number): { lightClass: string; dotClass: string; progressClass: string; label: string } {
  if (relError < 0.05) {
    return { lightClass: 'traffic-light-green', dotClass: 'dot-green', progressClass: 'fill-good', label: '优秀' };
  } else if (relError < 0.15) {
    return { lightClass: 'traffic-light-yellow', dotClass: 'dot-yellow', progressClass: 'fill-warning', label: '良好' };
  } else {
    return { lightClass: 'traffic-light-red', dotClass: 'dot-red', progressClass: 'fill-bad', label: '偏差' };
  }
}

function getProgressClass(score: number): string {
  if (score >= 85) return 'fill-good';
  if (score >= 60) return 'fill-warning';
  return 'fill-bad';
}
