// ============================================================
// Shadow Pipeline — 模型验证流水线
// 读取实测 CSV，与模拟结果对比，计算偏差
// ============================================================

import { readFileSync } from 'fs';
import { IPKModule, ModuleOutput } from './types/pk-module.interface';
import { Engine } from './engine';

export interface ValidationRow {
  time: number;
  observed: number;
  predicted: number;
  deviationPct: number;
}

/**
 * 读取 CSV 文件，解析为 { time, concentration } 数组。
 * 假设第一行为表头，格式: time,concentration
 */
function parseCSV(filePath: string): { time: number; concentration: number }[] {
  const raw = readFileSync(filePath, 'utf-8');
  const lines = raw.trim().split('\n');
  const rows: { time: number; concentration: number }[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const [timeStr, concStr] = line.split(',');
    rows.push({
      time: parseFloat(timeStr),
      concentration: parseFloat(concStr)
    });
  }

  return rows;
}

/**
 * 运行 shadow 验证。
 *
 * @param module    PK 固件模块
 * @param csvPath   实测数据 CSV 路径
 * @returns 每个时间点的验证结果
 */
export function runShadow(module: IPKModule, csvPath: string): ValidationRow[] {
  const observed = parseCSV(csvPath);
  if (observed.length === 0) {
    throw new Error('CSV 文件为空或解析失败');
  }

  // 确定模拟时长：取 CSV 中最大时间点
  const maxTime = Math.max(...observed.map(r => r.time));
  // 用较小步长保证精度，但不超过 0.25h
  const stepSize = 0.25;

  const engine = new Engine(module);
  const simulated = engine.simulate({ tEnd: maxTime, stepSize });

  // 建立时间 -> 预测浓度的映射
  const predictedMap = new Map<number, number>();
  for (const out of simulated) {
    predictedMap.set(out.timestamp, out.predictedConcentration);
  }

  const results: ValidationRow[] = [];

  for (const row of observed) {
    const predicted = predictedMap.get(row.time) ?? NaN;
    const deviationPct = row.concentration > 0
      ? (Math.abs(predicted - row.concentration) / row.concentration) * 100
      : NaN;

    results.push({
      time: row.time,
      observed: row.concentration,
      predicted,
      deviationPct
    });
  }

  return results;
}

/**
 * 格式化输出验证结果。
 */
export function formatShadowReport(rows: ValidationRow[]): string {
  const lines: string[] = [];
  lines.push('Shadow Pipeline 验证报告');
  lines.push('='.repeat(50));
  lines.push(`| 时间(h) | 实测值 | 预测值 | 偏差% |`);
  lines.push('-'.repeat(50));

  for (const row of rows) {
    const t = row.time.toFixed(2).padStart(6);
    const obs = row.observed.toFixed(2).padStart(8);
    const pred = Number.isFinite(row.predicted) ? row.predicted.toFixed(2).padStart(8) : 'N/A'.padStart(8);
    const dev = Number.isFinite(row.deviationPct) ? row.deviationPct.toFixed(2).padStart(6) : 'N/A'.padStart(6);
    lines.push(`| ${t} | ${obs} | ${pred} | ${dev}% |`);
  }

  lines.push('='.repeat(50));

  // 统计平均偏差
  const validDeviations = rows.filter(r => Number.isFinite(r.deviationPct)).map(r => r.deviationPct);
  if (validDeviations.length > 0) {
    const avgDev = validDeviations.reduce((a, b) => a + b, 0) / validDeviations.length;
    lines.push(`平均偏差: ${avgDev.toFixed(2)}%`);
  }

  return lines.join('\n');
}
