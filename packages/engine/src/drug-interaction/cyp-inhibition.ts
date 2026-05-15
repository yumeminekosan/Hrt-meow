/**
 * CYP 酶抑制对 CL 的影响（基础 Emax 模型，无 Emax 参数即 Emax=1）。
 *
 * @param clBaseline    底物 CL 基线
 * @param inhibitorConc 抑制剂浓度
 * @param Ki            抑制解离常数
 * @param enzymeBaseline 酶基线活性（默认 1.0）
 * @returns CL_eff = clBaseline * (1 - inhibition_fraction)
 */
export function computeInhibitedCL(
  clBaseline: number,
  inhibitorConc: number,
  Ki: number,
  enzymeBaseline: number = 1.0
): number {
  if (inhibitorConc <= 0) {
    return clBaseline;
  }

  const inhibitionFraction = inhibitorConc / (inhibitorConc + Ki);
  const remainingActivity = 1 - inhibitionFraction;

  return clBaseline * remainingActivity;
}
