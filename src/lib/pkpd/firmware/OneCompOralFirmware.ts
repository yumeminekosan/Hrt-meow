import { IFirmware } from '../engine';
import { ODEState } from '../solvers/types';

/**
 * 一房室口服 (Oral) 固件。
 *
 * 状态向量: [A_depot, A_central] (单位: µg)
 * 动力学:
 *   dA_depot/dt  = -ka * A_depot
 *   dA_central/dt =  ka * A_depot - ke * A_central
 *   ke = CL / Vd
 */
export class OneCompOralFirmware implements IFirmware {
  readonly moduleId = 'OneCompOral';

  private readonly ka: number;
  private readonly ke: number;
  private readonly doseAbsorbedUg: number;

  constructor(params: { ka: number; CL: number; Vd: number; F: number; dose_mg: number }) {
    this.ka = params.ka;
    this.ke = params.CL / params.Vd;
    this.doseAbsorbedUg = params.dose_mg * 1000 * params.F;
  }

  getInitialState(): ODEState {
    return {
      t: 0,
      y: new Float64Array([this.doseAbsorbedUg, 0])
    };
  }

  computeDerivatives(t: number, state: ODEState): ODEState {
    const A_depot = state.y[0];
    const A_central = state.y[1];

    const absorption = this.ka * A_depot;

    return {
      t,
      y: new Float64Array([
        -absorption,
        absorption - this.ke * A_central
      ])
    };
  }
}
