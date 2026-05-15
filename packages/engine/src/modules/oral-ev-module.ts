// ============================================================
// 固件: 口服戊酸雌二醇 (Oral Estradiol Valerate)
// 前药模型: EV → 准稳态水解 → E2
//
// 状态向量: [gut_EV, C_E2]  (EV 用准稳态近似, 不显式追踪)
//
// 动力学:
//   d(gut_EV)/dt = -ka * gut_EV
//   C_EV_qss    = (ka * gut_EV * F / Vd_EV) / (kh + ke_EV)  [准稳态]
//   dC_E2/dt    = kh * C_EV_qss * (Vd_EV / Vd_E2) * MW_ratio - ke_E2 * C_E2
//
// 参数来源: Kuhnz 1993; Schindler 2003; Goodman & Gilman
// ============================================================

import { IPKModule } from '../types/pk-module.interface';

const MW_RATIO = 272.4 / 314.4;

export class OralEVModule implements IPKModule {
  readonly moduleId = 'oral_estradiol_valerate';
  readonly assumptionTags = [
    '二房室前药',
    '一级吸收',
    '首过效应',
    'EV准稳态',
    '口服',
  ];

  private readonly ka: number;
  private readonly F: number;
  private readonly Vd_EV: number;
  private readonly kh: number;
  private readonly ke_EV: number;
  private readonly Vd_E2: number;
  private ke_E2: number;
  private readonly MW_ratio: number;

  constructor(model: any) {
    this.ka = model.parameters.ka?.value ?? 1.5;
    this.F = model.parameters.F?.value ?? 0.04;
    this.Vd_EV = model.parameters.Vd_EV?.value ?? 80;
    this.kh = model.parameters.kh?.value ?? 10;
    this.ke_EV = model.parameters.ke_EV?.value ?? 0.5;
    this.Vd_E2 = model.parameters.Vd_E2?.value ?? 300;
    this.ke_E2 = model.parameters.ke_E2?.value ?? 0.05;
    this.MW_ratio = model.parameters.MW_ratio?.value ?? MW_RATIO;
  }

  /** 状态向量: [gut_EV, C_E2] */
  computeDerivatives(_t: number, state: Float64Array): Float64Array {
    const gut_EV = state[0];
    const C_E2 = state[1];

    // EV 吸收速率 (质量/时间)
    const absorptionRate = this.ka * gut_EV * this.F;

    // EV 准稳态浓度: 输入 = (kh + ke_EV) * C_EV
    const C_EV_qss = absorptionRate / (this.Vd_EV * (this.kh + this.ke_EV));

    // EV → E2 转化率 (浓度/时间)
    const e2Production = this.kh * C_EV_qss * (this.Vd_EV / this.Vd_E2) * this.MW_ratio;

    const dGut = -this.ka * gut_EV;
    const dC_E2 = e2Production - this.ke_E2 * C_E2;

    return new Float64Array([dGut, dC_E2]);
  }

  getInitialState(): Float64Array {
    return new Float64Array([0, 0]);
  }

  /** 返回 E2 浓度 */
  getConcentration(state: Float64Array): number {
    return state[1];
  }

  /** 返回 EV 准稳态浓度 (计算值, 非状态) */
  getEVConcentration(state: Float64Array): number {
    const gut_EV = state[0];
    const absorptionRate = this.ka * gut_EV * this.F;
    return absorptionRate / (this.Vd_EV * (this.kh + this.ke_EV));
  }

  setClearance(newCL_E2: number): void {
    this.ke_E2 = newCL_E2 / this.Vd_E2;
  }

  selfTest(): { passed: boolean; errors: string[] } {
    const errors: string[] = [];
    const check = (name: string, val: number, min = 0) => {
      if (!Number.isFinite(val) || val <= min) errors.push(`${name} 异常: ${val}`);
    };
    check('ka', this.ka);
    check('F', this.F);
    if (this.F > 1) errors.push(`F > 1: ${this.F}`);
    check('Vd_EV', this.Vd_EV);
    check('kh', this.kh);
    check('ke_EV', this.ke_EV);
    check('Vd_E2', this.Vd_E2);
    check('ke_E2', this.ke_E2);
    return { passed: errors.length === 0, errors };
  }
}
