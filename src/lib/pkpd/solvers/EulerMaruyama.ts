import { ODEState, ODESolver } from './types';

/**
 * Euler-Maruyama SDE 求解器。
 *
 * 状态向量: [A_depot, A_central] (单位: µg)
 * 确定性部分: y_{n+1} = y_n + deriv * dt
 * 随机部分:    + sigma * dW   (若 sigma > 0)
 *
 * 非负截断: Math.max(0, ...) 防止数值噪声导致负药量。
 */
export class EulerMaruyamaSolver implements ODESolver {
  constructor(private readonly sigma: number = 0) {}

  step(state: ODEState, deriv: ODEState, dt: number, dW: ODEState): ODEState {
    const dim = state.y.length;
    const ny = new Float64Array(dim);

    for (let i = 0; i < dim; i++) {
      let increment = deriv.y[i] * dt;
      if (this.sigma > 0) {
        increment += this.sigma * dW.y[i];
      }
      ny[i] = Math.max(0, state.y[i] + increment);
    }

    return {
      t: state.t + dt,
      y: ny,
    };
  }
}
