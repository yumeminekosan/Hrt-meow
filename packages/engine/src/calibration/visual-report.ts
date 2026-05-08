/**
 * 可视化校准报告生成器
 * 
 * 为不懂医学/统计学的人设计的友好可视化:
 * - 进度条显示拟合好坏
 * - 红绿灯颜色系统
 * - 自然语言解释
 * - 对比图表 (目标 vs 预测)
 */

import { writeFileSync } from 'fs';

/** 可视化校准报告参数 */
export interface VisualCalibrationReportParams {
  /** 目标数据 */
  targetData: Array<{
    metric: string;      // 指标名称
    target: number;    // 目标值
    unit?: string;      // 单位
  }>;
  /** 初始参数 */
  initialParams: Record<string, number>;
  /** 最优参数 */
  optimalParams: Record<string, number>;
  /** 模拟结果 */
  simulationResults: Record<string, number>;
  /** 误差历史 */
  errorHistory: Array<{
    iteration: number;
    params: Record<string, number>;
    error: number;
  }>;
  /** 输出文件路径 */
  outputPath: string;
  /** 可选: 药物名称 */
  drugName?: string;
}

/**
 * 生成可视化校准报告 (HTML)
 * 
 * 特点:
 * - 🚦 红绿灯评分系统: 绿色=好, 黄色=一般, 红色=差
 * - 📊 进度条直观显示误差大小
 * - 📝 自然语言解释结果
 * - 📈 对比图表展示目标vs预测
 */
export function generateVisualCalibrationReport(
  params: VisualCalibrationReportParams
): string {
  const {
    targetData,
    initialParams,
    optimalParams,
    simulationResults,
    errorHistory,
    outputPath,
    drugName = 'Drug',
  } = params;

  const now = new Date().toLocaleString('zh-CN');
  
  // 计算拟合质量
  const fitQuality = calculateFitQuality(targetData, simulationResults);
  
  // 生成HTML
  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>🔬 ${drugName} 校准报告 - 可视化版</title>
<style>
:root {
  --good: #22c55e;
  --warning: #eab308;
  --bad: #ef4444;
  --bg: #0f172a;
  --surface: #1e293b;
  --text: #f1f5f9;
  --text-dim: #94a3b8;
  --border: #334155;
}
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  background: var(--bg);
  color: var(--text);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  line-height: 1.6;
  padding: 20px;
}
.container { max-width: 900px; margin: 0 auto; }

/* 头部 */
.header {
  text-align: center;
  padding: 30px 20px;
  background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
  border-radius: 16px;
  margin-bottom: 24px;
  border: 1px solid var(--border);
}
.header h1 { font-size: 1.8rem; margin-bottom: 8px; }
.header .subtitle { color: var(--text-dim); font-size: 0.9rem; }
.header .time { color: var(--text-dim); font-size: 0.8rem; margin-top: 8px; }

/* 评分卡片 */
.score-card {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}
.score-item {
  background: var(--surface);
  border-radius: 12px;
  padding: 20px;
  text-align: center;
  border: 1px solid var(--border);
}
.score-item .emoji { font-size: 2rem; margin-bottom: 8px; }
.score-item .value { font-size: 1.5rem; font-weight: bold; margin-bottom: 4px; }
.score-item .label { color: var(--text-dim); font-size: 0.85rem; }

/* 总体评分 */
.overall-score {
  background: var(--surface);
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 24px;
  border: 1px solid var(--border);
  text-align: center;
}
.overall-score .grade {
  font-size: 3rem;
  font-weight: bold;
  margin: 16px 0;
}
.overall-score .grade-A { color: var(--good); }
.overall-score .grade-B { color: #84cc16; }
.overall-score .grade-C { color: var(--warning); }
.overall-score .grade-D { color: var(--bad); }

/* 进度条 */
.progress-bar {
  width: 100%;
  height: 24px;
  background: #334155;
  border-radius: 12px;
  overflow: hidden;
  margin: 8px 0;
}
.progress-bar .fill {
  height: 100%;
  border-radius: 12px;
  transition: width 0.3s ease;
}
.progress-bar .fill-good { background: linear-gradient(90deg, #22c55e, #16a34a); }
.progress-bar .fill-warning { background: linear-gradient(90deg, #eab308, #ca8a04); }
.progress-bar .fill-bad { background: linear-gradient(90deg, #ef4444, #dc2626); }

/* 表格 */
.table-container {
  background: var(--surface);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 24px;
  border: 1px solid var(--border);
}
.table-container h2 {
  font-size: 1.1rem;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}
table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}
th {
  text-align: left;
  padding: 12px;
  color: var(--text-dim);
  font-weight: 500;
  border-bottom: 2px solid var(--border);
}
td {
  padding: 12px;
  border-bottom: 1px solid var(--border);
}
tr:hover { background: rgba(255,255,255,0.02); }

/* 红绿灯 */
.traffic-light {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 500;
}
.traffic-light-green {
  background: rgba(34, 197, 94, 0.15);
  color: #4ade80;
}
.traffic-light-yellow {
  background: rgba(234, 179, 8, 0.15);
  color: #facc15;
}
.traffic-light-red {
  background: rgba(239, 68, 68, 0.15);
  color: #f87171;
}
.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}
.dot-green { background: #4ade80; }
.dot-yellow { background: #facc15; }
.dot-red { background: #f87171; }

/* 对比图 */
.comparison {
  display: flex;
  align-items: center;
  gap: 16px;
  margin: 8px 0;
}
.comparison-bar {
  flex: 1;
  height: 32px;
  background: #334155;
  border-radius: 8px;
  position: relative;
  overflow: hidden;
}
.comparison-bar .target {
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  background: rgba(148, 163, 184, 0.3);
  border-right: 2px solid #94a3b8;
}
.comparison-bar .predicted {
  position: absolute;
  left: 0;
  top: 4px;
  height: calc(100% - 8px);
  border-radius: 4px;
  min-width: 2px;
}
.comparison-bar .predicted-good { background: #22c55e; }
.comparison-bar .predicted-warning { background: #eab308; }
.comparison-bar .predicted-bad { background: #ef4444; }
.comparison-labels {
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
  color: var(--text-dim);
  margin-top: 4px;
}

/* 解释文字 */
.explanation {
  background: rgba(34, 211, 238, 0.05);
  border-left: 3px solid #22d3ee;
  padding: 16px;
  border-radius: 0 8px 8px 0;
  margin: 16px 0;
  font-size: 0.9rem;
}

/* 参数变化 */
.param-change {
  display: flex;
  align-items: center;
  gap: 12px;
}
.param-change .arrow {
  color: var(--text-dim);
  font-size: 1.2rem;
}
.param-change .change-value {
  font-family: monospace;
  font-size: 0.85rem;
}
.param-change .change-up { color: #f87171; }
.param-change .change-down { color: #4ade80; }

/* 图表容器 */
.chart-container {
  background: var(--surface);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 24px;
  border: 1px solid var(--border);
}
.chart-container canvas {
  width: 100%;
  height: 300px;
}

/* 折叠面板 */
.details-summary {
  cursor: pointer;
  padding: 12px;
  background: rgba(255,255,255,0.02);
  border-radius: 8px;
  margin-bottom: 8px;
  user-select: none;
}
.details-summary:hover { background: rgba(255,255,255,0.04); }
.details-content {
  padding: 0 12px 12px;
}

footer {
  text-align: center;
  padding: 40px 20px;
  color: var(--text-dim);
  font-size: 0.8rem;
}

@media (max-width: 600px) {
  .score-card { grid-template-columns: 1fr; }
  body { padding: 10px; }
}
</style>
</head>
<body>
<div class="container">

<!-- 头部 -->
<div class="header">
  <h1>🔬 ${drugName} 校准报告</h1>
  <div class="subtitle">参数自动优化结果可视化</div>
  <div class="time">生成时间: ${now}</div>
</div>

<!-- 总体评分 -->
<div class="overall-score">
  <div style="color: var(--text-dim); font-size: 0.9rem;">总体拟合评分</div>
  <div class="grade grade-${fitQuality.grade}">${fitQuality.grade}</div>
  <div class="progress-bar">
    <div class="fill ${getProgressClass(fitQuality.score)}" style="width: ${fitQuality.score}%"></div>
  </div>
  <div style="color: var(--text-dim); font-size: 0.85rem; margin-top: 8px;">
    拟合度: ${fitQuality.score.toFixed(1)}% - ${fitQuality.description}
  </div>
</div>

<!-- 关键指标 -->
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

<!-- 拟合质量详解 -->
<div class="table-container">
  <h2>🎯 拟合质量详情</h2>
  <div class="explanation">
    💡 <strong>如何阅读:</strong> 绿色表示预测很接近目标,黄色表示有一定偏差,红色表示偏差较大需要关注.
    进度条显示预测值相对于目标值的比例.
  </div>
  <table>
    <thead>
      <tr>
        <th>指标</th>
        <th>目标值</th>
        <th>预测值</th>
        <th>匹配度</th>
        <th>状态</th>
      </tr>
    </thead>
    <tbody>
      ${targetData.map(t => {
        const predicted = simulationResults[t.metric] || 0;
        const relError = t.target > 0 ? Math.abs(predicted - t.target) / t.target : 0;
        const status = getStatus(relError);
        const percent = t.target > 0 ? (predicted / t.target * 100) : 0;
        return `
      <tr>
        <td><strong>${t.metric}</strong></td>
        <td>${t.target.toFixed(4)} ${t.unit || ''}</td>
        <td>${predicted.toFixed(4)} ${t.unit || ''}</td>
        <td>
          <div class="progress-bar" style="height: 16px;">
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

<!-- 参数变化 -->
<div class="table-container">
  <h2>🔧 参数优化结果</h2>
  <div class="explanation">
    💡 <strong>如何阅读:</strong> 显示每个参数从初始值到最优值的变化.红色向上箭头表示增加,绿色向下箭头表示减少.
    偏差%显示变化幅度.
  </div>
  <table>
    <thead>
      <tr>
        <th>参数</th>
        <th>初始值</th>
        <th>变化</th>
        <th>最优值</th>
        <th>偏差%</th>
      </tr>
    </thead>
    <tbody>
      ${Object.entries(optimalParams).map(([name, optimal]) => {
        const initial = initialParams[name] ?? 0;
        const change = optimal - initial;
        const changePct = initial !== 0 ? (change / initial * 100) : 0;
        const arrow = change > 0 ? '↑' : change < 0 ? '↓' : '→';
        const arrowClass = change > 0 ? 'change-up' : change < 0 ? 'change-down' : '';
        return `
      <tr>
        <td><strong>${name}</strong></td>
        <td>${initial.toFixed(4)}</td>
        <td class="param-change">
          <span class="arrow ${arrowClass}">${arrow}</span>
          <span class="change-value ${arrowClass}">${Math.abs(change).toFixed(4)}</span>
        </td>
        <td style="color: #22d3ee; font-weight: bold;">${optimal.toFixed(4)}</td>
        <td>${changePct > 0 ? '+' : ''}${changePct.toFixed(2)}%</td>
      </tr>`;
      }).join('')}
    </tbody>
  </table>
</div>

<!-- 误差收敛图 -->
<div class="chart-container">
  <h2>📉 误差收敛过程</h2>
  <div class="explanation">
    💡 <strong>如何阅读:</strong> 这张图显示算法如何逐步找到更好的参数.曲线应该向下走,表示误差越来越小.
    如果曲线 plateau (变平),说明已经找到最优解.
  </div>
  <canvas id="convergenceChart"></canvas>
</div>

<!-- 误差分布 -->
<div class="chart-container">
  <h2>📊 误差分布</h2>
  <div class="explanation">
    💡 <strong>如何阅读:</strong> 显示所有尝试过的参数组合的误差分布.大部分应该集中在左侧(小误差),
    说明搜索空间设置合理.
  </div>
  <canvas id="errorDistChart"></canvas>
</div>

<!-- 详细数据 (可折叠) -->
<details>
  <summary class="details-summary">📋 查看详细迭代数据 (点击展开)</summary>
  <div class="details-content">
    <table>
      <thead>
        <tr>
          <th>迭代</th>
          <th>参数</th>
          <th>误差</th>
        </tr>
      </thead>
      <tbody>
        ${errorHistory.slice(0, 50).map((step, i) => `
        <tr>
          <td>${step.iteration || i + 1}</td>
          <td>${Object.entries(step.params).map(([k, v]) => `${k}=${v.toFixed(4)}`).join(', ')}</td>
          <td>${step.error.toExponential(4)}</td>
        </tr>
        `).join('')}
        ${errorHistory.length > 50 ? `
        <tr><td colspan="3" style="text-align: center; color: var(--text-dim);">... 还有 ${errorHistory.length - 50} 条记录 ...</td></tr>
        ` : ''}
      </tbody>
    </table>
  </div>
</details>

<footer>
  <p>🐾 Generated by Mon3tr Calibration Engine</p>
  <p style="margin-top: 8px; font-size: 0.75rem;">不懂就问,数据说话</p>
</footer>

</div>

<script>
// 绘制收敛曲线
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
  
  // 背景
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, 0, W, H);
  
  // 网格
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
  
  // 坐标轴标签
  ctx.fillStyle = '#94a3b8';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('迭代次数', pad.l + gw / 2, H - 10);
  ctx.save();
  ctx.translate(15, pad.t + gh / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText('误差 (对数)', 0, 0);
  ctx.restore();
  
  // Y轴刻度 (对数)
  for (let i = 0; i <= 5; i++) {
    const y = pad.t + gh * (i / 5);
    const val = maxErr * Math.pow(10, -i);
    ctx.fillStyle = '#64748b';
    ctx.textAlign = 'right';
    ctx.fillText(val.toExponential(1), pad.l - 8, y + 4);
  }
  
  // 绘制曲线
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
  
  // 数据点
  history.forEach(pt => {
    const x = pad.l + (pt.x / Math.max(...history.map(h => h.x))) * gw;
    const y = pad.t + gh - (Math.log10(pt.y) / Math.log10(maxErr)) * gh;
    ctx.fillStyle = '#22d3ee';
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
  });
})();

// 绘制误差分布直方图
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
  const bins = 20;
  const maxErr = Math.max(...errors, 0.001);
  const counts = new Array(bins).fill(0);
  errors.forEach(e => {
    const idx = Math.min(Math.floor(e / maxErr * bins), bins - 1);
    counts[idx]++;
  });
  const maxCount = Math.max(...counts, 1);
  
  // 背景
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, 0, W, H);
  
  // 绘制柱状图
  const barW = gw / bins;
  counts.forEach((count, i) => {
    const barH = (count / maxCount) * gh;
    const x = pad.l + i * barW;
    const y = pad.t + gh - barH;
    
    // 颜色根据误差大小渐变
    const ratio = i / bins;
    const r = Math.floor(34 + ratio * (239 - 34));
    const g = Math.floor(211 - ratio * (211 - 68));
    const b = Math.floor(238 - ratio * (238 - 68));
    ctx.fillStyle = \`rgb(\${r}, \${g}, \${b})\`;
    ctx.fillRect(x + 1, y, barW - 2, barH);
  });
  
  // 坐标轴
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad.l, pad.t); ctx.lineTo(pad.l, pad.t + gh);
  ctx.lineTo(W - pad.r, pad.t + gh);
  ctx.stroke();
  
  // 标签
  ctx.fillStyle = '#94a3b8';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('误差大小', pad.l + gw / 2, H - 10);
  ctx.fillText('0', pad.l, pad.t + gh + 20);
  ctx.fillText(maxErr.toExponential(1), W - pad.r, pad.t + gh + 20);
})();
</script>

</body>
</html>`;

  writeFileSync(outputPath, html, 'utf-8');
  return html;
}

/** 计算拟合质量 */
function calculateFitQuality(
  targets: Array<{ metric: string; target: number }>,
  results: Record<string, number>
): { grade: string; score: number; description: string } {
  let totalRelError = 0;
  let count = 0;

  for (const t of targets) {
    const predicted = results[t.metric] || 0;
    if (t.target > 0) {
      const relError = Math.abs(predicted - t.target) / t.target;
      totalRelError += relError;
      count++;
    }
  }

  const avgRelError = count > 0 ? totalRelError / count : 1;
  
  // 转换为百分制分数 (误差越小分数越高)
  const score = Math.max(0, Math.min(100, (1 - avgRelError) * 100));
  
  let grade: string;
  let description: string;
  
  if (score >= 90) {
    grade = 'A';
    description = ' excellent! 预测非常接近目标值.';
  } else if (score >= 75) {
    grade = 'B';
    description = ' good. 预测与目标基本吻合.';
  } else if (score >= 60) {
    grade = 'C';
    description = ' acceptable. 有一定偏差但在可接受范围.';
  } else {
    grade = 'D';
    description = ' needs improvement. 偏差较大,建议检查参数范围或增加迭代.';
  }

  return { grade, score, description };
}

/** 获取状态信息 */
function getStatus(relError: number) {
  if (relError < 0.05) {
    return {
      label: 'Excellent',
      lightClass: 'traffic-light-green',
      dotClass: 'dot-green',
      progressClass: 'fill-good'
    };
  } else if (relError < 0.15) {
    return {
      label: 'Good',
      lightClass: 'traffic-light-yellow',
      dotClass: 'dot-yellow',
      progressClass: 'fill-warning'
    };
  } else {
    return {
      label: 'Poor',
      lightClass: 'traffic-light-red',
      dotClass: 'dot-red',
      progressClass: 'fill-bad'
    };
  }
}

/** 获取进度条样式 */
function getProgressClass(score: number): string {
  if (score >= 75) return 'fill-good';
  if (score >= 50) return 'fill-warning';
  return 'fill-bad';
}
