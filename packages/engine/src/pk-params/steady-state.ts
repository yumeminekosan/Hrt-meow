// ============================================================
// 稳态参数计算
// 从稳态模拟结果中提取给药周期内的 PK 参数
// ============================================================

import { ConcentrationTimePoint, extractCmaxTmax, computeAUC } from './basic';

export interface SteadyStateParams {
  Cmax_ss: number;
  Cmin_ss: number;
  Cavg_ss: number;
  波动度: number;
  峰谷比: number;
}

/**
 * 从稳态模拟结果中提取最后一个给药周期的 PK 参数。
 *
 * @param results         完整模拟结果数组，按时间排序
 * @param dosingInterval  给药间隔（与 results.time 同单位）
 * @returns { Cmax_ss, Cmin_ss, Cavg_ss, 波动度, 峰谷比 }
 */
export function computeSteadyStateParams(
  results: ConcentrationTimePoint[],
  dosingInterval: number
): SteadyStateParams {
  if (results.length === 0) {
    return { Cmax_ss: NaN, Cmin_ss: NaN, Cavg_ss: NaN, 波动度: NaN, 峰谷比: NaN };
  }

  // 截取最后一个给药周期
  const tEnd = results[results.length - 1].time;
  const cycleStart = tEnd - dosingInterval;
  const cycleData = results.filter(r => r.time >= cycleStart);

  if (cycleData.length < 2) {
    return { Cmax_ss: NaN, Cmin_ss: NaN, Cavg_ss: NaN, 波动度: NaN, 峰谷比: NaN };
  }

  // Cmax_ss
  const { Cmax } = extractCmaxTmax(cycleData);

  // Cmin_ss
  let cmin = cycleData[0].concentration;
  for (let i = 1; i < cycleData.length; i++) {
    if (cycleData[i].concentration < cmin) {
      cmin = cycleData[i].concentration;
    }
  }
  const Cmin_ss = cmin;

  // 周期 AUC（调用 computeAUC，ke=0 时只取 AUC_0_t）
  const { AUC_0_t: auc } = computeAUC(cycleData, 0);

  const Cavg_ss = auc / dosingInterval;
  const 波动度 = Cavg_ss > 0 ? (Cmax - Cmin_ss) / Cavg_ss : NaN;
  const 峰谷比 = Cmin_ss > 0 ? Cmax / Cmin_ss : NaN;

  return { Cmax_ss: Cmax, Cmin_ss, Cavg_ss, 波动度, 峰谷比 };
}
