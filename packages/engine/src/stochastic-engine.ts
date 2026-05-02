// ============================================================
// 随机引擎层 — Euler-Maruyama SDE 求解器
// 与固件完全解耦：引擎只推进状态向量，不关心状态的含义
// ============================================================

import { IPKModule, SimulationConfig, ModuleOutput } from './types/pk-module.interface';
import { eulerMaruyamaStep } from './solvers/euler-maruyama';

/**
 * 随机求解引擎。
 * 接收一个实现了 IPKModule 的固件模块，用 Euler-Maruyama 推进状态。
 */
export class StochasticEngine {
  constructor(private readonly module: IPKModule) {}

  /**
   * 执行 Euler-Maruyama 模拟。
   * drift 来自 computeDerivatives，diffusion 来自 computeDiffusion。
   */
  simulate(config: SimulationConfig): ModuleOutput[] {
    const { tEnd, stepSize } = config;
    const steps = Math.ceil(tEnd / stepSize);

    const results: ModuleOutput[] = [];
    let state = this.module.getInitialState();

    for (let i = 0; i <= steps; i++) {
      const t = i * stepSize;
      const predictedConcentration = state[0];
      const uncertaintyBand: [number, number] = [
        predictedConcentration * 0.95,
        predictedConcentration * 1.05
      ];

      results.push({
        moduleId: this.module.moduleId,
        timestamp: t,
        predictedConcentration,
        uncertaintyBand,
        assumptionTags: [...this.module.assumptionTags],
        sensitivityVector: {},
        exceptionFlag: 'normal'
      });

      const drift = this.module.computeDerivatives(t, state);
      const diffusion = (this.module as any).computeDiffusion(t, state);
      state = eulerMaruyamaStep(drift, diffusion, stepSize, state);
    }

    return results;
  }
}
