/**
 * CYP 酶诱导对底物清除率的影响。
 *
 * Emax 模型:
 *   induction_fraction = Emax * C_inducer / (C_inducer + EC50)
 *   CL_eff = CL_baseline * (1 + induction_fraction)
 */

/**
 * 计算诱导后的有效清除率。
 *
 * @param clBaseline — 底物基线清除率 (L/h)
 * @param inducerConc — 诱导剂当前浓度 (unit 与 EC50 一致)
 * @param Emax — 最大诱导倍数 (无量纲, 如 3.0 表示最大增至 4 倍基线)
 * @param EC50 — 达到一半 Em ax 时的诱导剂浓度
 * @returns 有效清除率 CL_eff
 */
export function computeInducedCL(
  clBaseline: number,
  inducerConc: number,
  Emax: number,
  EC50: number
): number {
  if (inducerConc <= 0) return clBaseline;
  const fraction = (Emax * inducerConc) / (inducerConc + EC50);
  return clBaseline * (1 + fraction);
}
