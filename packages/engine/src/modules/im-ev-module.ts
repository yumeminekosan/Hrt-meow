// ============================================================
// 固件: 肌注戊酸雌二醇 (IM Estradiol Valerate, 油剂)
// 储库前药模型: Depot EV → 缓慢释放 → 准稳态水解 → E2
//
// 状态向量: [depot_EV, C_E2]  (EV 用准稳态近似, 不显式追踪)
//
// 动力学 (翻转动力学: 吸收慢于消除):
//   d(depot_EV)/dt = -ka_depot * depot_EV
//   C_EV_qss      = (f_conv * ka_depot * depot_EV / Vd_EV) / (kh + ke_EV)
//   dC_E2/dt      = kh * C_EV_qss * (Vd_EV / Vd_E2) * MW_ratio - ke_E2 * C_E2
//
// 参数反算自临床数据:
//   Delestrogen label; Oriowo 1980; Düsterberg 1982
//   IM EV 10mg → E2 Cmax ~300 pg/mL @ day 2-3, trough ~30 pg/mL @ day 14
// ============================================================

import { IPKModule } from '../types/pk-module.interface';

const MW_RATIO = 272.4 / 314.4;

export class IMEVModule implements IPKModule {
  readonly moduleId = 'im_estradiol_valerate';
  readonly assumptionTags = [
    '二房室前药',
    '肌注储库',
    '翻转动力学',
    'EV准稳态',
    '缓释',
  ];

  private readonly ka_depot: number;
  private readonly Vd_EV: number;
  private readonly kh: number;
  private readonly ke_EV: number;
  private readonly Vd_E2: number;
  private ke_E2: number;
  private readonly f_conv: number;
  private readonly MW_ratio: number;

  constructor(model: any) {
    this.ka_depot = model.parameters.ka_depot?.value ?? 0.008;  // /h, 吸收 t1/2 ≈ 87h (3.6天)
    this.Vd_EV = model.parameters.Vd_EV?.value ?? 80;           // L
    this.kh = model.parameters.kh?.value ?? 10;                  // /h, 快速水解
    this.ke_EV = model.parameters.ke_EV?.value ?? 0.5;           // /h
    this.Vd_E2 = model.parameters.Vd_E2?.value ?? 300;           // L, E2 组织分布
    this.ke_E2 = model.parameters.ke_E2?.value ?? 0.05;          // /h, t1/2 ≈ 14h
    this.f_conv = model.parameters.f_conv?.value ?? 0.10;        // 转化效率
    this.MW_ratio = model.parameters.MW_ratio?.value ?? MW_RATIO;
  }

  /** 状态向量: [depot_EV, C_E2] */
  computeDerivatives(_t: number, state: Float64Array): Float64Array {
    const depot_EV = state[0];
    const C_E2 = state[1];

    // EV 从储库释放速率
    const releaseRate = this.ka_depot * depot_EV;

    // EV 准稳态浓度
    const C_EV_qss = (this.f_conv * releaseRate / this.Vd_EV) / (this.kh + this.ke_EV);

    // EV → E2 转化率
    const e2Production = this.kh * C_EV_qss * (this.Vd_EV / this.Vd_E2) * this.MW_ratio;

    const dDepot = -this.ka_depot * depot_EV;
    const dC_E2 = e2Production - this.ke_E2 * C_E2;

    return new Float64Array([dDepot, dC_E2]);
  }

  getInitialState(): Float64Array {
    return new Float64Array([0, 0]);
  }

  /** 返回 E2 浓度 */
  getConcentration(state: Float64Array): number {
    return state[1];
  }

  /** 返回 EV 准稳态浓度 (计算值) */
  getEVConcentration(state: Float64Array): number {
    const depot_EV = state[0];
    const releaseRate = this.ka_depot * depot_EV;
    return (this.f_conv * releaseRate / this.Vd_EV) / (this.kh + this.ke_EV);
  }

  setClearance(newCL_E2: number): void {
    this.ke_E2 = newCL_E2 / this.Vd_E2;
  }

  selfTest(): { passed: boolean; errors: string[] } {
    const errors: string[] = [];
    const check = (name: string, val: number, min = 0) => {
      if (!Number.isFinite(val) || val <= min) errors.push(`${name} 异常: ${val}`);
    };
    check('ka_depot', this.ka_depot);
    check('Vd_EV', this.Vd_EV);
    check('kh', this.kh);
    check('ke_EV', this.ke_EV);
    check('Vd_E2', this.Vd_E2);
    check('ke_E2', this.ke_E2);
    check('f_conv', this.f_conv);
    if (this.f_conv > 1) errors.push(`f_conv > 1: ${this.f_conv}`);
    return { passed: errors.length === 0, errors };
  }
}
