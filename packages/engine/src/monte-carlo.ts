// ============================================================
// Monte-Carlo 模拟层
// 多次运行 StochasticEngine，统计每个时间点的均值与置信区间
// ============================================================

import { StochasticEngine } from './stochastic-engine';
import { SimulationConfig } from './types/pk-module.interface';

export interface MonteCarloResult {
  mean: number[];
  lower: number[]; // 第 5 百分位
  upper: number[]; // 第 95 百分位
}

/**
 * 多次运行随机引擎，收集轨迹并计算统计量。
 *
 * @param engine  StochasticEngine 实例
 * @param config  模拟配置 (tEnd, stepSize)
 * @param nRuns   运行次数 (默认 100)
 * @returns 每个时间点的均值、5% 分位、95% 分位
 */
export function monteCarlo(
  engine: StochasticEngine,
  config: SimulationConfig,
  nRuns: number = 100
): MonteCarloResult {
  const { tEnd, stepSize } = config;
  const steps = Math.ceil(tEnd / stepSize);

  // 收集所有轨迹: runs[runIndex][stepIndex] = concentration
  const runs: number[][] = [];

  for (let r = 0; r < nRuns; r++) {
    const trajectory = engine.simulate(config);
    const concentrations = trajectory.map((out) => out.predictedConcentration);
    runs.push(concentrations);
  }

  const mean: number[] = new Array(steps + 1);
  const lower: number[] = new Array(steps + 1);
  const upper: number[] = new Array(steps + 1);

  for (let i = 0; i <= steps; i++) {
    const valuesAtT: number[] = [];
    for (let r = 0; r < nRuns; r++) {
      valuesAtT.push(runs[r][i]);
    }

    valuesAtT.sort((a, b) => a - b);

    mean[i] = valuesAtT.reduce((a, b) => a + b, 0) / nRuns;
    lower[i] = percentile(valuesAtT, 0.05);
    upper[i] = percentile(valuesAtT, 0.95);
  }

  return { mean, lower, upper };
}

/** 线性插值计算百分位 */
function percentile(sorted: number[], p: number): number {
  const n = sorted.length;
  if (n === 0) return NaN;
  if (n === 1) return sorted[0];

  const index = p * (n - 1);
  const lowerIdx = Math.floor(index);
  const upperIdx = Math.ceil(index);
  const weight = index - lowerIdx;

  if (lowerIdx === upperIdx) return sorted[lowerIdx];
  return sorted[lowerIdx] * (1 - weight) + sorted[upperIdx] * weight;
}
