// ============================================================
// 戊酸雌二醇 (Estradiol Valerate) 参数修正器
// 根据药代动力学文献数据调整不同途径的生物利用度
// ============================================================

/**
 * 雌二醇特殊处理：修正各途径的生物利用度参数。
 *
 * 文献依据：
 * - 口服：极高首过效应，~95% 被肝脏清除，F ≈ 0.04~0.05
 *   (Goodman & Gilman; Rowland & Tozer)
 * - 透皮：绕过首过代谢，经皮吸收 F ≈ 0.10~0.15
 *   (Estraderm TTS label; PTU Pharmacokinetics)
 *
 * @param baseParams  基础参数对象
 * @returns 修正后的参数对象（新对象，不修改原对象）
 */
export function modifyEstradiolParams(baseParams: Record<string, any>): Record<string, any> {
  const modified = { ...baseParams };

  // 透皮途径：F_td 强制设为文献值 (0.10~0.15，取中位 0.12)
  if ('F_td' in modified) {
    modified.F_td = 0.12;
  }

  // 口服途径：F_oral 覆盖为 0.04~0.05（随机）
  if ('F_oral' in modified) {
    modified.F_oral = 0.04 + Math.random() * 0.01; // [0.04, 0.05]
  }

  // 其他参数（CL、Vd、release_rate 等）原样返回
  return modified;
}
