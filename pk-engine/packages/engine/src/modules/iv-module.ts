import { IPKModule, TOMLModel } from '../types/pk-module.interface';

/**
 * 一房室IV模块（单次静脉注射，一房室模型）
 *
 * 固件逻辑：
 * - 1个房室：central
 * - 浓度 C = amount / Vd
 * - dC/dt = -(CL/Vd) * C
 */
export class IVModule implements IPKModule {
  readonly moduleId: string;
  readonly assumptionTags: string[];

  private CL: number;
  private Vd: number;
  private C0: number;

  constructor(model: TOMLModel) {
    this.moduleId = model.metadata.id;
    this.assumptionTags = model.metadata.assumptions;
    this.CL = model.parameters.CL.value;
    this.Vd = model.parameters.Vd.value;
    this.C0 = model.compartments.central.initial_amount / this.Vd;
  }

  computeDerivatives(_t: number, state: Float64Array): Float64Array {
    const C = state[0];
    // dC/dt = -(CL/Vd) * C
    const dCdt = -(this.CL / this.Vd) * C;
    return new Float64Array([dCdt]);
  }

  getInitialState(): Float64Array {
    return new Float64Array([this.C0]);
  }

  selfTest(): { passed: boolean; errors: string[] } {
    const state = this.getInitialState();
    if (state[0] <= 0) {
      return { passed: false, errors: ['初始浓度必须大于0'] };
    }
    if (this.CL <= 0 || this.Vd <= 0) {
      return { passed: false, errors: ['CL和Vd必须大于0'] };
    }
    return { passed: true, errors: [] };
  }
}
