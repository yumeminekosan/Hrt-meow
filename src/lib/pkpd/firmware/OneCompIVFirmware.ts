import { IFirmware } from '../engine';
import { ODEState } from '../solvers/types';

/**
 * 一房室单次静脉注射 (IV bolus) 固件。
 *
 * 状态向量: [A_depot, A_central] (单位: µg)
 * 动力学: dA_central/dt = -ke * A_central, ke = CL / Vd
 */
export class OneCompIVFirmware implements IFirmware {
  readonly moduleId = 'OneCompIV';

  private readonly ke: number;
  private readonly doseUg: number;

  constructor(params: { CL: number; Vd: number; dose_mg: number }) {
    this.ke = params.CL / params.Vd;
    this.doseUg = params.dose_mg * 1000;
  }

  getInitialState(): ODEState {
    return {
      t: 0,
      y: new Float64Array([0, this.doseUg])
    };
  }

  computeDerivatives(t: number, state: ODEState): ODEState {
    const A_central = state.y[1];
    return {
      t,
      y: new Float64Array([0, -this.ke * A_central])
    };
  }
}
