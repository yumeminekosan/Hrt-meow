// ============================================================
// 引擎层 — 确定性欧拉积分器
// 与固件完全解耦：引擎只推进状态向量，不关心状态的含义
// ============================================================

import { IPKModule, SimulationConfig, StepResult } from './types/pk-module.interface';

/**
 * 通用求解引擎。
 * 接收一个实现了 IPKModule 的固件模块，用欧拉法推进状态。
 */
export class Engine {
  constructor(private readonly module: IPKModule) {}

  /**
   * 执行确定性欧拉法模拟。
   * 每一步: state_{n+1} = state_n + dt * f(t_n, state_n)
   */
  simulate(config: SimulationConfig): StepResult[] {
    const { tEnd, stepSize } = config;
    const steps = Math.ceil(tEnd / stepSize);

    const results: StepResult[] = [];
    let state = this.module.getInitialState();

    for (let i = 0; i <= steps; i++) {
      const t = i * stepSize;
      results.push({ t, state: new Float64Array(state) });

      const derivatives = this.module.computeDerivatives(t, state);
      const nextState = new Float64Array(state.length);
      for (let j = 0; j < state.length; j++) {
        nextState[j] = state[j] + derivatives[j] * stepSize;
      }
      state = nextState;
    }

    return results;
  }
}
