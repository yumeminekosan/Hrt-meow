// ============================================================
// 确定性欧拉法求解器 — 单次静脉注射 (IV bolus)
// (欧拉-丸山法的退化情形，当前仅实现确定性漂移项)
// ============================================================

import { PKModel, StepOutput } from '../types/pk-module.interface';

/**
 * 对一房室 IV bolus 模型执行确定性欧拉法模拟。
 *
 * 动力学方程: dC/dt = -(CL/Vd) * C = -ke * C
 * 解析解: C(t) = C₀ * e^{-ke * t}
 *
 * 欧拉递推: C_{n+1} = C_n * (1 - ke * dt)
 * 稳定条件: |1 - ke * dt| < 1  ⇔  ke * dt < 2
 * 保守阈值: ke * dt < 1 (确保单调衰减，不会震荡)
 *
 * @param model    校验后的PK模型对象
 * @param tEnd     模拟结束时间 (h), 必须 ≥ 0
 * @param stepSize 步长 (h), 必须 > 0
 * @returns 每个时间步的 {t, concentration} 数组，最后一个点 ≤ tEnd
 * @throws 参数不合法或稳定性条件不满足
 */
export function simulateIV(model: PKModel, tEnd: number, stepSize: number): StepOutput[] {
  // --- 参数校验 ---
  if (tEnd < 0) throw new Error(`tEnd 必须 ≥ 0, 实际: ${tEnd}`);
  if (stepSize <= 0) throw new Error(`stepSize 必须 > 0, 实际: ${stepSize}`);

  const CL = model.parameters.CL.value;
  const Vd = model.parameters.Vd.value;
  const ke = CL / Vd;
  const initialAmount = model.compartments.central.initial_amount;

  // --- 单位提示: 当前假定 CL 单位为 L/h, Vd 单位为 L ---
  const clUnit = model.parameters.CL.unit;
  const vdUnit = model.parameters.Vd.unit;
  if (clUnit !== 'L/h' || vdUnit !== 'L') {
    console.warn(
      `⚠ 单位可能不一致: CL=${clUnit}, Vd=${vdUnit}. ` +
      `Solver假定 CL 为 L/h、Vd 为 L，若实际单位不同，结果将偏离。`
    );
  }

  // --- 稳定性检查 ---
  const product = ke * stepSize;
  if (product >= 2) {
    throw new Error(
      `欧拉法不稳定: ke*dt = ${product.toFixed(4)} ≥ 2. ` +
      `请减小 stepSize(当前 ${stepSize}h) 或检查参数. ke = ${ke.toFixed(4)} h⁻¹`
    );
  }
  if (product >= 1) {
    console.warn(
      `⚠ 欧拉法接近不稳定边界: ke*dt = ${product.toFixed(4)} ≥ 1. ` +
      `结果可能出现数值震荡，建议减小 stepSize.`
    );
  }

  // --- 模拟 ---
  let C = initialAmount / Vd;
  const steps = Math.floor(tEnd / stepSize);
  const results: StepOutput[] = [];

  for (let i = 0; i <= steps; i++) {
    const t = i * stepSize;
    results.push({ t, concentration: C });

    // 欧拉步: C_{n+1} = C_n - ke * C_n * dt
    C = C * (1 - product);
  }

  return results;
}
