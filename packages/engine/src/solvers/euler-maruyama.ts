/**
 * Euler-Maruyama 单步推进。
 *
 * @param drift     漂移项 (确定性导数)
 * @param diffusion 扩散项 (每个维度的噪声系数)
 * @param dt        时间步长
 * @param state     当前状态
 * @returns 新状态
 */
export function eulerMaruyamaStep(
  drift: Float64Array,
  diffusion: Float64Array,
  dt: number,
  state: Float64Array
): Float64Array {
  const dim = state.length;
  const next = new Float64Array(dim);
  const sqrtDt = Math.sqrt(dt);

  for (let i = 0; i < dim; i++) {
    const dW = sqrtDt * boxMuller();
    next[i] = state[i] + drift[i] * dt + diffusion[i] * dW;
  }

  return next;
}

/** Box-Muller 算法生成标准正态随机数 */
function boxMuller(): number {
  let u1 = 0;
  let u2 = 0;
  while (u1 === 0) u1 = Math.random();
  while (u2 === 0) u2 = Math.random();

  const r = Math.sqrt(-2 * Math.log(u1));
  const theta = 2 * Math.PI * u2;
  return r * Math.cos(theta);
}
