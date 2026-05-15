// ============================================================
// 引擎层 — 确定性欧拉积分器
// 与固件完全解耦：引擎只推进状态向量，不关心状态的含义
// ============================================================

import { IPKModule, SimulationConfig, StepResult, ModuleOutput } from './types/pk-module.interface';

/**
 * 通用求解引擎。
 * 接收一个实现了 IPKModule 的固件模块，用欧拉法推进状态。
 */
export class Engine {
  constructor(
    private readonly module: IPKModule,
    private readonly solverType: 'euler' | 'euler-maruyama' = 'euler'
  ) {}

  /**
   * 执行确定性欧拉法模拟。
   * 每一步: state_{n+1} = state_n + dt * f(t_n, state_n)
   * 返回 ModuleOutput 数组，包含完整的预测与元数据。
   */
  simulate(config: SimulationConfig): ModuleOutput[] {
    const { tEnd, stepSize } = config;
    const steps = Math.ceil(tEnd / stepSize);

    const results: ModuleOutput[] = [];
    let state = this.module.getInitialState();

    for (let i = 0; i <= steps; i++) {
      const t = i * stepSize;
      const predictedConcentration =
        typeof (this.module as any).getConcentration === 'function'
          ? (this.module as any).getConcentration(state)
          : state[0];
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

      const derivatives = this.module.computeDerivatives(t, state);
      const nextState = new Float64Array(state.length);

      if (this.solverType === 'euler-maruyama') {
        // Euler-Maruyama: state += drift*dt + diffusion*dW
        const diffusion = typeof this.module.computeDiffusion === 'function'
          ? this.module.computeDiffusion(t, state)
          : new Float64Array(state.length);
        const dW = Math.sqrt(stepSize) * this.randn();
        for (let j = 0; j < state.length; j++) {
          nextState[j] = state[j] + derivatives[j] * stepSize + diffusion[j] * dW;
        }
      } else {
        // 确定性欧拉: state += drift*dt
        for (let j = 0; j < state.length; j++) {
          nextState[j] = state[j] + derivatives[j] * stepSize;
        }
      }
      state = nextState;
    }

    return results;
  }

  /** Box-Muller 变换：生成标准正态随机数 */
  private randn(): number {
    const u1 = Math.random();
    const u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }
}
