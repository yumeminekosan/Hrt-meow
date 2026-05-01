import { ODEState, ODESolver } from './solvers/types';

export interface IFirmware {
  moduleId: string;
  getInitialState(): ODEState;
  computeDerivatives(t: number, state: ODEState): ODEState;
}

export class Engine {
  private cachedRandn: number | null = null;

  constructor(
    private readonly firmware: IFirmware,
    private readonly solver: ODESolver
  ) {}

  simulate(tEnd: number, dt: number): ODEState[] {
    const steps = Math.ceil(tEnd / dt);
    const tArr: number[] = [];
    const results: ODEState[] = [];
    let state = this.firmware.getInitialState();

    for (let i = 0; i <= steps; i++) {
      const t = i * dt;
      tArr.push(t);
      results.push({ t, y: new Float64Array(state.y) });

      const deriv = this.firmware.computeDerivatives(t, state);
      const dim = state.y.length;
      const dW: ODEState = {
        t,
        y: new Float64Array(dim)
      };
      const sqrtDt = Math.sqrt(dt);
      for (let j = 0; j < dim; j++) {
        dW.y[j] = this.randn() * sqrtDt;
      }

      state = this.solver.step(state, deriv, dt, dW);
    }

    return results;
  }

  private randn(): number {
    if (this.cachedRandn !== null) {
      const val = this.cachedRandn;
      this.cachedRandn = null;
      return val;
    }

    let u1 = 0;
    let u2 = 0;
    while (u1 === 0) u1 = Math.random();
    while (u2 === 0) u2 = Math.random();

    const r = Math.sqrt(-2 * Math.log(u1));
    const theta = 2 * Math.PI * u2;

    this.cachedRandn = r * Math.sin(theta);
    return r * Math.cos(theta);
  }
}
