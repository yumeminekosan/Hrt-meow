import { IPKModule, SimulationConfig, SimulationResult, SimulationFrame } from './types/pk-module.interface';

/**
 * PK模拟引擎核心
 *
 * 职责：
 * 1. 接收一个 IPKModule 实例（固件）
 * 2. 初始化状态
 * 3. 循环调用 computeDerivatives() 进行数值积分
 * 4. 返回带时间戳的状态向量
 */
export class Engine {
  private module: IPKModule;

  constructor(module: IPKModule) {
    this.module = module;
  }

  simulate(config: SimulationConfig): SimulationResult {
    const { tEnd, stepSize } = config;
    const steps = Math.ceil(tEnd / stepSize);
    const frames: SimulationFrame[] = [];

    let state = this.module.getInitialState();
    frames.push({ t: 0, state: new Float64Array(state) });

    for (let i = 1; i <= steps; i++) {
      const t = i * stepSize;
      const derivatives = this.module.computeDerivatives(t, state);

      // 欧拉积分：state += derivatives * dt
      for (let j = 0; j < state.length; j++) {
        state[j] += derivatives[j] * stepSize;
      }

      frames.push({ t, state: new Float64Array(state) });
    }

    return {
      moduleId: this.module.moduleId,
      config,
      frames,
    };
  }
}
