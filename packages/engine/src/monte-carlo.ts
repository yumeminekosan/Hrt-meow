// ============================================================
// Monte-Carlo 模拟层
// 参数采样 + Euler-Maruyama SDE，收集全部轨迹
// ============================================================

import { IPKModule } from './types/pk-module.interface';

/** 给药事件 */
export interface DosingEvent {
  time: number;
  amount: number;
  compartment?: number; // 默认 0
}

/** 参数分布描述 */
export interface ParamDist {
  baseValue: number;
  distType: 'log-normal' | 'normal' | 'fixed';
  cv?: number;   // log-normal 的变异系数
  sd?: number;   // normal 的标准差
}

/** 参数分布集 */
export type ParamDistributions = Record<string, ParamDist>;

/** 模块工厂函数类型 */
export type ModuleFactory = (params: Record<string, number>) => IPKModule;

/** 单条轨迹点 */
export interface TrajectoryPoint {
  t: number;
  concentration: number;
}

/** 单条轨迹 */
export type Trajectory = TrajectoryPoint[];

/**
 * Monte-Carlo 模拟主函数。
 *
 * @param factory       模块工厂函数（接收采样参数，返回 IPKModule 实例）
 * @param dosing        给药事件列表
 * @param tEnd          总模拟时间
 * @param stepSize      步长
 * @param nRuns         运行次数（默认 100）
 * @param paramDists    参数分布对象
 * @returns 所有轨迹的数组
 */
export function monteCarlo(
  factory: ModuleFactory,
  dosing: DosingEvent[],
  tEnd: number,
  stepSize: number,
  nRuns: number,
  paramDists: ParamDistributions
): Trajectory[] {
  if (nRuns === undefined || nRuns <= 0) nRuns = 100;

  const trajectories: Trajectory[] = [];

  for (let r = 0; r < nRuns; r++) {
    // 1. 采样参数
    const params: Record<string, number> = {};
    for (const [name, dist] of Object.entries(paramDists)) {
      params[name] = sampleParam(dist);
    }

    // 2. 创建模块
    const module = factory(params);

    // 3. 运行单次模拟
    const trajectory = runSimulation(module, dosing, tEnd, stepSize);
    trajectories.push(trajectory);
  }

  return trajectories;
}

export function computePredictionInterval(
  trajectories: Trajectory[]
): { time: number[]; P50: number[]; P5: number[]; P95: number[] } {
  if (trajectories.length === 0) {
    return { time: [], P50: [], P5: [], P95: [] };
  }

  const n = trajectories.length;
  const time = trajectories[0].map((p) => p.t);
  const nPoints = time.length;

  const P50: number[] = [];
  const P5: number[] = [];
  const P95: number[] = [];

  for (let i = 0; i < nPoints; i++) {
    const values: number[] = [];
    for (let j = 0; j < n; j++) {
      values.push(trajectories[j][i].concentration);
    }
    values.sort((a, b) => a - b);

    if (n < 100) {
      P5.push(quantileLinear(values, 0.05));
      P50.push(quantileLinear(values, 0.50));
      P95.push(quantileLinear(values, 0.95));
    } else {
      P5.push(quantileNearest(values, 0.05));
      P50.push(quantileNearest(values, 0.50));
      P95.push(quantileNearest(values, 0.95));
    }
  }

  return { time, P50, P5, P95 };
}

function quantileLinear(sorted: number[], q: number): number {
  const n = sorted.length;
  if (n === 1) return sorted[0];
  const pos = q * (n - 1);
  const lower = Math.floor(pos);
  const upper = Math.ceil(pos);
  const weight = pos - lower;
  if (lower === upper) return sorted[lower];
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

function quantileNearest(sorted: number[], q: number): number {
  const n = sorted.length;
  const idx = Math.round(q * (n - 1));
  return sorted[Math.min(idx, n - 1)];
}

// ---- 内部实现 ----

/** Box-Muller 正态随机数 */
function randn(): number {
  const u1 = Math.random();
  const u2 = Math.random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/** 按分布采样单个参数 */
function sampleParam(dist: ParamDist): number {
  switch (dist.distType) {
    case 'fixed':
      return dist.baseValue;
    case 'log-normal':
      return dist.baseValue * Math.exp(randn() * (dist.cv ?? 0));
    case 'normal':
      return dist.baseValue + randn() * (dist.sd ?? 0);
    default:
      return dist.baseValue;
  }
}

/** 单次 Euler-Maruyama 模拟，支持给药事件 */
function runSimulation(
  module: IPKModule,
  dosing: DosingEvent[],
  tEnd: number,
  stepSize: number
): Trajectory {
  const steps = Math.ceil(tEnd / stepSize);
  let state = module.getInitialState();
  const trajectory: Trajectory = [];

  const hasConcentration = typeof (module as any).getConcentration === 'function';

  for (let i = 0; i <= steps; i++) {
    const t = i * stepSize;

    // 记录当前状态
    const concentration = hasConcentration
      ? (module as any).getConcentration(state)
      : state[0];
    trajectory.push({ t, concentration });

    // 应用给药事件（在步进之前）
    for (const dose of dosing) {
      if (Math.abs(dose.time - t) < stepSize / 2) {
        const comp = dose.compartment ?? 0;
        if (comp < state.length) {
          state[comp] += dose.amount;
        }
      }
    }

    // 计算漂移项和扩散项
    const drift = module.computeDerivatives(t, state);
    const diffusion = typeof module.computeDiffusion === 'function'
      ? module.computeDiffusion(t, state)
      : new Float64Array(state.length);

    // Euler-Maruyama 步进
    const dW = Math.sqrt(stepSize) * randn();
    const nextState = new Float64Array(state.length);
    for (let j = 0; j < state.length; j++) {
      nextState[j] = state[j] + drift[j] * stepSize + diffusion[j] * dW;
    }
    state = nextState;
  }

  return trajectory;
}
