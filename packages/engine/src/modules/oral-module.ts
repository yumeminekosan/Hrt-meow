import { IPKModule } from '../types/pk-module.interface';

/**
 * 一房室口服 (Oral) PK 模块。
 *
 * 状态向量: [gut_amount, central_concentration]
 *   gut_amount          — 胃肠道剩余药量 (mg)
 *   central_concentration — 中央室浓度 (mg/L)
 *
 * 动力学:
 *   d(gut)/dt         = -ka * gut
 *   d(concentration)/dt = (ka * gut / Vd) - ke * concentration
 *   ke = CL / Vd
 */
export class OralModule implements IPKModule {
  readonly moduleId = 'one_comp_oral_basic';
  readonly assumptionTags = ['一房室', '一级吸收', '一级消除'];

  private readonly ka: number;
  private readonly ke: number;
  private readonly Vd: number;
  private readonly initialGutAmount: number;

  constructor(model: any) {
    this.ka = model.parameters.ka.value;
    this.Vd = model.parameters.Vd.value;
    this.ke = model.parameters.CL.value / this.Vd;
    this.initialGutAmount = model.compartments.gut.initial_amount;
  }

  /** 状态向量: [gut_amount, central_concentration] */
  computeDerivatives(_t: number, state: Float64Array): Float64Array {
    const gut = state[0];
    const central = state[1];

    const dGut = -this.ka * gut;
    const dCentral = (this.ka * gut / this.Vd) - this.ke * central;

    return new Float64Array([dGut, dCentral]);
  }

  getInitialState(): Float64Array {
    return new Float64Array([this.initialGutAmount, 0]);
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
