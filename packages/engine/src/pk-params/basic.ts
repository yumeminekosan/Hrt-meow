// ============================================================
// Cmax / Tmax 提取器
// 从模拟结果中找出峰值浓度及其对应时间
// ============================================================

export interface ConcentrationTimePoint {
  time: number;
  concentration: number;
}

export interface CmaxTmaxResult {
  Cmax: number;
  Tmax: number;
}

/**
 * 从模拟结果数组中提取 Cmax 和 Tmax。
 *
 * @param results  模拟结果数组，每项含 time 和 concentration
 * @returns { Cmax, Tmax }；空数组返回 { NaN, NaN }
 */
export function extractCmaxTmax(results: ConcentrationTimePoint[]): CmaxTmaxResult {
  if (results.length === 0) {
    return { Cmax: NaN, Tmax: NaN };
  }

  let cmax = results[0].concentration;
  let tmax = results[0].time;

  for (let i = 1; i < results.length; i++) {
    if (results[i].concentration > cmax) {
      cmax = results[i].concentration;
      tmax = results[i].time;
    }
  }

  return { Cmax: cmax, Tmax: tmax };
}

export interface AUCResult {
  AUC_0_t: number;
  AUC_0_inf: number;
}

/**
 * 用梯形法则计算 AUC，加上末端外推到 t=∞。
 *
 * @param results  模拟结果数组，按时间排序
 * @param ke       消除速率常数 (1/时间单位)
 * @returns { AUC_0_t, AUC_0_inf }
 */
export function computeAUC(results: ConcentrationTimePoint[], ke: number): AUCResult {
  let auc0t = 0;
  for (let i = 1; i < results.length; i++) {
    const dt = results[i].time - results[i - 1].time;
    const avgC = (results[i].concentration + results[i - 1].concentration) / 2;
    auc0t += avgC * dt;
  }

  const cLast = results.length > 0 ? results[results.length - 1].concentration : 0;
  const aucTail = ke > 0 ? cLast / ke : NaN;
  const auc0inf = ke > 0 ? auc0t + aucTail : NaN;

  return { AUC_0_t: auc0t, AUC_0_inf: auc0inf };
}

export interface HalfLifeResult {
  T1_2: number;
  ke: number;
  R_squared: number;
}

/**
 * 用末端数据估算消除半衰期。
 * 取最后 20% 数据点（至少 3 个），对 log(C) vs t 做最小二乘线性回归。
 *
 * @param results  模拟结果数组，按时间排序
 * @returns { T1_2, ke, R_squared }
 */
export function estimateHalfLife(results: ConcentrationTimePoint[]): HalfLifeResult {
  // 筛选浓度 > 0 的点
  const valid = results.filter(r => r.concentration > 0);
  if (valid.length < 3) {
    return { T1_2: NaN, ke: NaN, R_squared: NaN };
  }

  // 取最后 20%（至少 3 个）
  const nTail = Math.max(3, Math.ceil(valid.length * 0.2));
  const tail = valid.slice(valid.length - nTail);

  const n = tail.length;
  let sumT = 0, sumLogC = 0, sumT2 = 0, sumTLogC = 0;
  for (const pt of tail) {
    const logC = Math.log(pt.concentration);
    sumT += pt.time;
    sumLogC += logC;
    sumT2 += pt.time * pt.time;
    sumTLogC += pt.time * logC;
  }

  const denom = n * sumT2 - sumT * sumT;
  if (denom === 0) {
    return { T1_2: NaN, ke: NaN, R_squared: NaN };
  }

  const slope = (n * sumTLogC - sumT * sumLogC) / denom;
  const ke = -slope;

  if (ke <= 0) {
    return { T1_2: NaN, ke, R_squared: NaN };
  }

  const T1_2 = Math.LN2 / ke;

  // R² 计算
  const intercept = (sumLogC - slope * sumT) / n;
  const meanLogC = sumLogC / n;
  let ssRes = 0, ssTot = 0;
  for (const pt of tail) {
    const logC = Math.log(pt.concentration);
    const predicted = slope * pt.time + intercept;
    ssRes += (logC - predicted) ** 2;
    ssTot += (logC - meanLogC) ** 2;
  }
  const R_squared = ssTot > 0 ? 1 - ssRes / ssTot : 1;

  return { T1_2, ke, R_squared };
}

export interface TimeInWindowResult {
  percentage: number;
  timeInWindow: number;
  totalTime: number;
}

export interface TimeInWindowError {
  error: string;
}

/**
 * 计算药物浓度在治疗窗内的时间占比。
 * 对每对相邻点用线性插值估算穿越比例。
 *
 * @param results  模拟结果数组，按时间排序
 * @param lower    治疗窗下限
 * @param upper    治疗窗上限
 * @returns { percentage, timeInWindow, totalTime } 或 { error }
 */
export function computeTimeInWindow(
  results: ConcentrationTimePoint[],
  lower: number,
  upper: number
): TimeInWindowResult | TimeInWindowError {
  if (lower >= upper) {
    return { error: '无效治疗窗' };
  }
  if (results.length < 2) {
    return { percentage: 0, timeInWindow: 0, totalTime: 0 };
  }

  let timeInWindow = 0;
  const totalTime = results[results.length - 1].time - results[0].time;

  for (let i = 1; i < results.length; i++) {
    const c0 = results[i - 1].concentration;
    const c1 = results[i].concentration;
    const dt = results[i].time - results[i - 1].time;

    const in0 = c0 >= lower && c0 <= upper;
    const in1 = c1 >= lower && c1 <= upper;

    if (in0 && in1) {
      // 两点都在窗内，整个间隔计入
      timeInWindow += dt;
    } else if (in0 || in1) {
      // 一点在窗内，一点在窗外，用线性插值估算穿越比例
      const cIn = in0 ? c0 : c1;
      const cOut = in0 ? c1 : c0;

      // 确定穿越的是哪条边界
      const boundary = cOut > upper ? upper : lower;

      // 线性插值：求穿越点在间隔内的位置 t_cross ∈ [0,1]
      if (cIn !== cOut) {
        const tCross = (boundary - cIn) / (cOut - cIn);
        const clamped = Math.max(0, Math.min(1, tCross));
        // 窗内部分的长度
        const fractionIn = in0 ? clamped : (1 - clamped);
        timeInWindow += fractionIn * dt;
      }
      // cIn === cOut 不可能（一个在内一个在外），跳过
    }
    // 两点都在窗外，不计入
  }

  const percentage = totalTime > 0 ? (timeInWindow / totalTime) * 100 : 0;
  return { percentage, timeInWindow, totalTime };
}
