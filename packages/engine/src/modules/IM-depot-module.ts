import { IPKModule } from '../types/pk-module.interface';

/**
 * 一房室肌肉注射 (IM) 缓释剂型 PK 模块。
 *
 * 状态向量: [Depot_amount, Central_concentration]
 *   Depot_amount         — 储库室剩余药量 (mg)
 *   Central_concentration — 中央室浓度 (mg/L)
 *
 * 动力学:
 *   d(Depot)/dt      = -ka * Depot
 *   d(Central)/dt    = (ka * Depot / Vd) - ke * Central
 *   ke = CL / Vd
 */
export class IMDepotModule implements IPKModule {
  readonly moduleId = 'one_comp_IM_depot';
  readonly assumptionTags = ['一房室', '一级吸收', '一级消除', '储库释放'];

  private readonly ka: number;
  private readonly ke: number;
  private readonly Vd: number;

  constructor(model: any) {
    this.ka = model.parameters.ka.value;
    this.Vd = model.parameters.Vd.value;
    this.ke = model.parameters.CL.value / this.Vd;
  }

  /** 状态向量: [Depot_amount, Central_concentration] */
  computeDerivatives(_t: number, state: Float64Array): Float64Array {
    const depot = state[0];
    const central = state[1];

    const dDepot = -this.ka * depot;
    const dCentral = (this.ka * depot / this.Vd) - this.ke * central;

    return new Float64Array([dDepot, dCentral]);
  }

  getInitialState(): Float64Array {
    return new Float64Array([0, 0]);
  }

  /** 返回中央室浓度（状态向量第2个元素） */
  getConcentration(state: Float64Array): number {
    return state[1];
  }

  selfTest(): { passed: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!Number.isFinite(this.ka) || this.ka <= 0) {
      errors.push(`ka must be finite positive, got ${this.ka}`);
    }
    if (!Number.isFinite(this.ke) || this.ke <= 0) {
      errors.push(`ke must be finite positive, got ${this.ke}`);
    }
    if (!Number.isFinite(this.Vd) || this.Vd <= 0) {
      errors.push(`Vd must be finite positive, got ${this.Vd}`);
    }

    return { passed: errors.length === 0, errors };
  }
}
