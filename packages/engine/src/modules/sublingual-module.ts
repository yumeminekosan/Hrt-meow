import { IPKModule } from '../types/pk-module.interface';

/**
 * 一房室舌下给药 (Sublingual) PK 模块。
 *
 * 状态向量: [Buccal_amount, Gut_amount, Central_concentration]
 *   Buccal_amount         — 口腔黏膜室药量 (ug)
 *   Gut_amount            — 胃肠道室药量 (ug，吞咽部分)
 *   Central_concentration — 中央室浓度 (ug/L)
 *
 * 吸收途径：
 *   1. 颊黏膜吸收：ka_buccal * Buccal * F_buccal → 直接入血
 *   2. 吞咽后胃肠道吸收：ka_oral * Gut * F_oral → 入血
 *   3. 颊黏膜脱落/吞咽：ka_buccal * Buccal * (1-F_buccal) → 进入 Gut
 *
 * 动力学:
 *   d(Buccal)/dt  = -ka_buccal * Buccal
 *   d(Gut)/dt     = -ka_oral * Gut + ka_buccal * Buccal * (1 - F_buccal)
 *   d(Central)/dt = (ka_buccal * Buccal * F_buccal) / Vd
 *                 + (ka_oral * Gut * F_oral) / Vd
 *                 - ke * Central
 *   ke = CL / Vd
 */
export class SublingualModule implements IPKModule {
  readonly moduleId = 'one_comp_sublingual';
  readonly assumptionTags = ['一房室', '双途径吸收', '一级消除'];

  private readonly ka_buccal: number;
  private readonly ka_oral: number;
  private readonly F_buccal: number;
  private readonly F_oral: number;
  private readonly ke: number;
  private readonly Vd: number;

  constructor(model: any) {
    this.ka_buccal = model.parameters.ka_buccal.value;
    this.ka_oral = model.parameters.ka_oral.value;
    this.F_buccal = model.parameters.F_buccal.value;
    this.F_oral = model.parameters.F_oral.value;
    this.Vd = model.parameters.Vd.value;
    this.ke = model.parameters.CL.value / this.Vd;
  }

  /** 状态向量: [Buccal_amount, Gut_amount, Central_concentration] */
  computeDerivatives(_t: number, state: Float64Array): Float64Array {
    const buccal = state[0];
    const gut = state[1];
    const central = state[2];

    const absorptionBuccal = this.ka_buccal * buccal;
    const absorptionOral = this.ka_oral * gut;

    const dBuccal = -absorptionBuccal;
    const dGut = -absorptionOral + absorptionBuccal * (1 - this.F_buccal);
    const dCentral =
      (absorptionBuccal * this.F_buccal) / this.Vd
      + (absorptionOral * this.F_oral) / this.Vd
      - this.ke * central;

    return new Float64Array([dBuccal, dGut, dCentral]);
  }

  getInitialState(): Float64Array {
    return new Float64Array([0, 0, 0]);
  }

  /** 返回中央室浓度（状态向量第3个元素） */
  getConcentration(state: Float64Array): number {
    return state[2];
  }

  selfTest(): { passed: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!Number.isFinite(this.ka_buccal) || this.ka_buccal <= 0) {
      errors.push(`ka_buccal must be finite positive, got ${this.ka_buccal}`);
    }
    if (!Number.isFinite(this.ka_oral) || this.ka_oral <= 0) {
      errors.push(`ka_oral must be finite positive, got ${this.ka_oral}`);
    }
    if (!Number.isFinite(this.F_buccal) || this.F_buccal < 0 || this.F_buccal > 1) {
      errors.push(`F_buccal must be in [0,1], got ${this.F_buccal}`);
    }
    if (!Number.isFinite(this.F_oral) || this.F_oral < 0 || this.F_oral > 1) {
      errors.push(`F_oral must be in [0,1], got ${this.F_oral}`);
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
