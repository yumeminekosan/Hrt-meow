// ============================================================
// 欧拉-丸山法求解器 (朴素实现)
// ============================================================

import { IPKModule, SimulationConfig, StepResult } from '../types/pk-module.interface';

/**
 * 对单个PK模块执行欧拉-丸山法模拟。
 * 欧拉-丸山法是确定性欧拉法的推广：在确定性漂移项基础上叠加扩散项。
 * 当前版本只实现确定性部分（纯欧拉法），SDE扰动项在后续迭代中加入。
 *
 * @param module 实现了IPKModule的固件模块
 * @param config 模拟配置 (tEnd, stepSize)
 * @returns 每个时间步的状态快照数组
 */
export function simulate(module: IPKModule, config: SimulationConfig): StepResult[] {
  const { tEnd, stepSize } = config;
  const steps = Math.ceil(tEnd / stepSize);

  const results: StepResult[] = [];
  let state = module.getInitialState();

  for (let i = 0; i <= steps; i++) {
    const t = i * stepSize;
    results.push({ t, state: new Float64Array(state) });

    // 欧拉步: state_{n+1} = state_n + dt * f(t_n, state_n)
    const derivatives = module.computeDerivatives(t, state);
    const nextState = new Float64Array(state.length);
    for (let j = 0; j < state.length; j++) {
      nextState[j] = state[j] + derivatives[j] * stepSize;
    }
    state = nextState;
  }

  return results;
}
