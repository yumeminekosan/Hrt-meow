export interface ODEState {
  t: number;
  y: Float64Array;
}

export interface ODESolver {
  step(state: ODEState, deriv: ODEState, dt: number, dW: ODEState): ODEState;
}
