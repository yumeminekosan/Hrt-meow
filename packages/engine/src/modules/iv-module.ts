// ============================================================
// 固件: 一房室单次静脉注射 (IV bolus)
// 动力学: dC/dt = -(CL/Vd) * C = -ke * C
// ============================================================

import { IPKModule, PKModel } from '../types/pk-module.interface';

export class IVModule implements IPKModule {
  readonly moduleId: string;
  readonly assumptionTags: string[];

  private ke: number;
  private readonly Vd: number;
  private readonly initialConcentration: number;

  constructor(model: PKModel) {
    this.moduleId = model.metadata.id;
    this.assumptionTags = [...model.metadata.assumptions];

    const CL = model.parameters.CL.value;
    this.Vd = model.parameters.Vd.value;
    this.ke = CL / this.Vd;
    this.initialConcentration = model.compartments.central.initial_amount / this.Vd;
  }

  /** 扩散系数: 当前浓度的 15%，只对中央室 */
  computeDiffusion(_t: number, state: Float64Array): Float64Array {
    return new Float64Array([state[0] * 0.15]);
  }

  /** 状态向量: [浓度] */
  computeDerivatives(_t: number, state: Float64Array): Float64Array {
    // dC/dt = -ke * C
    return new Float64Array([-this.ke * state[0]]);
  }

  getInitialState(): Float64Array {
    return new Float64Array([this.initialConcentration]);
  }

  setClearance(newCL: number): void {
    this.ke = newCL / this.Vd;
  }

  selfTest(): { passed: boolean; errors: string[] } {
    const errors: string[] = [];

    // 基本校验: ke 为有限正数
    if (!isFinite(this.ke) || this.ke <= 0) {
      errors.push(`ke 异常: ${this.ke}`);
    }

    // 初始浓度有限非负
    if (!isFinite(this.initialConcentration) || this.initialConcentration < 0) {
      errors.push(`初始浓度异常: ${this.initialConcentration}`);
    }

    return { passed: errors.length === 0, errors };
  }
}
