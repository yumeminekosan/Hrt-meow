/**
 * 二分校准器：通过二分搜索找到使模拟 Cmax 接近目标值的参数。
 *
 * 已知单调性:
 *   - Vd ↑ → Cmax ↓ (反比)
 *   - CL ↑ → Cmax ↓ (反比)
 *   - ka ↑ → Cmax ↑ (正比)
 *   - F  ↑ → Cmax ↑ (正比)
 */

/** 迭代历史记录 */
export interface CalibrationStep {
  paramValue: number;
  cmax: number;
  error: number;
}

/** 校准结果 */
export interface CalibrationResult {
  optimalValue: number;
  error: number;
  converged: boolean;
  history: CalibrationStep[];
}

/** 参数对 Cmax 的单调方向: true = 正比 (↑→↑), false = 反比 (↑→↓). */
const DIRECT_PARAMS = new Set(['ka', 'F', 'f', 'ka_depot']);

/**
 * 二分搜索校准。
 *
 * @param targetCmax — 目标 Cmax
 * @param paramName — 参数名 (用于推断单调性)
 * @param paramRange — 搜索区间 { min, max }
 * @param simFactory — 工厂函数: (paramValue) => { Cmax: number }
 * @param tolerance — 相对误差容忍度 (默认 0.01 = 1%)
 * @param maxIter — 最大迭代次数 (默认 20)
 */
export function bisectCalibrate(
  targetCmax: number,
  paramName: string,
  paramRange: { min: number; max: number },
  simFactory: (paramValue: number) => { Cmax: number },
  tolerance: number = 0.01,
  maxIter: number = 20
): CalibrationResult {
  const isDirect = DIRECT_PARAMS.has(paramName);
  let low = paramRange.min;
  let high = paramRange.max;
  const history: CalibrationStep[] = [];

  for (let i = 0; i < maxIter; i++) {
    const mid = (low + high) / 2;
    const result = simFactory(mid);
    const cmaxMid = result.Cmax;
    const error = Math.abs(cmaxMid - targetCmax) / targetCmax;

    history.push({ paramValue: mid, cmax: cmaxMid, error });

    if (error < tolerance) {
      return { optimalValue: mid, error, converged: true, history };
    }

    // 根据单调性调整搜索区间
    if (isDirect) {
      // 正比: Cmax_mid > 目标 → 参数偏大 → 缩小上限
      if (cmaxMid > targetCmax) high = mid;
      else low = mid;
    } else {
      // 反比: Cmax_mid > 目标 → 参数偏小 → 提高下限
      if (cmaxMid > targetCmax) low = mid;
      else high = mid;
    }
  }

  const best = history[history.length - 1];
  return {
    optimalValue: best.paramValue,
    error: best.error,
    converged: false,
    history,
  };
}

/** 多目标校准的单个目标定义 */
export interface CalibrationTarget {
  metric: string;       // 指标名称, 如 'Cmax', 'AUC'
  value: number;        // 目标值
  weight: number;       // 权重
}

/** 参数搜索范围 */
export interface ParamRange {
  min: number;
  max: number;
}

/** 多目标校准结果 */
export interface MultiObjectiveResult {
  optimalParams: Record<string, number>;
  minError: number;
  allErrors: number[];
}

/**
 * 多目标网格搜索校准。
 *
 * 支持 2 个参数,可扩展更多参数。
 *
 * @param targets — 目标列表,每项含 metric 名称、目标 value、权重 weight
 * @param paramNames — 参数名列表
 * @param paramRanges — 每个参数的搜索范围 { min, max }
 * @param simFactory — 模拟工厂函数: (params) => { [metric: string]: number }
 * @param resolution — 每个参数的网格采样点数 (默认 10)
 */
export function multiObjectiveCalibrate(
  targets: CalibrationTarget[],
  paramNames: string[],
  paramRanges: ParamRange[],
  simFactory: (params: Record<string, number>) => Record<string, number>,
  resolution: number = 10
): MultiObjectiveResult {
  if (paramNames.length !== paramRanges.length) {
    throw new Error('paramNames 与 paramRanges 长度必须一致');
  }

  if (paramNames.length === 0) {
    throw new Error('至少需要 1 个参数');
  }

  // 生成每个参数的采样点
  const grids: number[][] = paramRanges.map((range) => {
    const step = (range.max - range.min) / (resolution - 1);
    const points: number[] = [];
    for (let i = 0; i < resolution; i++) {
      points.push(range.min + step * i);
    }
    return points;
  });

  let minError = Infinity;
  let optimalParams: Record<string, number> = {};
  const allErrors: number[] = [];

  // 嵌套循环遍历所有参数组合
  // 目前支持 2 个参数,用嵌套循环;更多参数可改用递归或迭代器
  if (paramNames.length === 1) {
    for (const p0 of grids[0]) {
      const params: Record<string, number> = { [paramNames[0]]: p0 };
      const simResult = simFactory(params);
      const error = computeWeightedError(targets, simResult);
      allErrors.push(error);
      if (error < minError) {
        minError = error;
        optimalParams = { ...params };
      }
    }
  } else if (paramNames.length === 2) {
    for (const p0 of grids[0]) {
      for (const p1 of grids[1]) {
        const params: Record<string, number> = {
          [paramNames[0]]: p0,
          [paramNames[1]]: p1,
        };
        const simResult = simFactory(params);
        const error = computeWeightedError(targets, simResult);
        allErrors.push(error);
        if (error < minError) {
          minError = error;
          optimalParams = { ...params };
        }
      }
    }
  } else {
    // 3+ 参数: 用递归笛卡尔积
    const combinations = cartesianProduct(grids);
    for (const combo of combinations) {
      const params: Record<string, number> = {};
      paramNames.forEach((name, idx) => {
        params[name] = combo[idx];
      });
      const simResult = simFactory(params);
      const error = computeWeightedError(targets, simResult);
      allErrors.push(error);
      if (error < minError) {
        minError = error;
        optimalParams = { ...params };
      }
    }
  }

  return { optimalParams, minError, allErrors };
}

/** 计算复合加权误差 */
function computeWeightedError(
  targets: CalibrationTarget[],
  simResult: Record<string, number>
): number {
  let totalError = 0;
  for (const target of targets) {
    const simValue = simResult[target.metric];
    if (simValue === undefined || simValue === null) {
      throw new Error(`模拟结果缺少指标: ${target.metric}`);
    }
    const relativeError = Math.abs(simValue - target.value) / target.value;
    totalError += target.weight * relativeError;
  }
  return totalError;
}

/** 笛卡尔积: 多维数组的所有组合 */
function cartesianProduct(arrays: number[][]): number[][] {
  if (arrays.length === 0) return [[]];
  const result: number[][] = [];
  const helper = (current: number[], depth: number) => {
    if (depth === arrays.length) {
      result.push([...current]);
      return;
    }
    for (const val of arrays[depth]) {
      current.push(val);
      helper(current, depth + 1);
      current.pop();
    }
  };
  helper([], 0);
  return result;
}
