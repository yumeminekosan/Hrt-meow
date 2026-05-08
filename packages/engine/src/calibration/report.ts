import { writeFileSync } from 'fs';

/** 目标数据点 */
export interface TargetDataPoint {
  source: string;
  observed: number;
}

/** 校准结果报告参数 */
export interface CalibrationReportParams {
  targetData: TargetDataPoint[];
  initialParams: Record<string, number>;
  optimalParams: Record<string, number>;
  simulationResults: Record<string, number>;
  errorHistory: Array<{ paramValue: number; error: number }>;
  outputPath: string;
}

/**
 * 生成校准报告并写入文件。
 *
 * @param params — 报告所需的所有数据
 * @returns 生成的 Markdown 字符串
 */
export function generateCalibrationReport(params: CalibrationReportParams): string {
  const {
    targetData,
    initialParams,
    optimalParams,
    simulationResults,
    errorHistory,
    outputPath,
  } = params;

  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

  const lines: string[] = [];

  // 标题
  lines.push(`# 校准报告`);
  lines.push(``);
  lines.push(`生成时间: ${now}`);
  lines.push(``);

  // 数据来源
  lines.push(`## 数据来源`);
  lines.push(``);
  lines.push(`| 来源 | 观测值 |`);
  lines.push(`|------|--------|`);
  for (const point of targetData) {
    lines.push(`| ${point.source} | ${point.observed} |`);
  }
  lines.push(``);

  // 校准结果
  lines.push(`## 校准结果`);
  lines.push(``);
  lines.push(`| 参数 | 初始值 | 最优值 | 偏差% |`);
  lines.push(`|------|--------|--------|-------|`);
  for (const paramName of Object.keys(optimalParams)) {
    const initial = initialParams[paramName] ?? 0;
    const optimal = optimalParams[paramName];
    const deviation = initial !== 0
      ? (((optimal - initial) / initial) * 100).toFixed(2)
      : 'N/A';
    lines.push(`| ${paramName} | ${initial} | ${optimal} | ${deviation} |`);
  }
  lines.push(``);

  // 拟合优度
  lines.push(`## 拟合优度`);
  lines.push(``);
  lines.push(`| 指标 | 预测值 | 目标值 | 相对误差% |`);
  lines.push(`|------|--------|--------|-----------|`);
  for (const metric of Object.keys(simulationResults)) {
    const predicted = simulationResults[metric];
    // 尝试从 targetData 中找到对应的目标值
    const targetPoint = targetData.find(t => t.source === metric);
    const target = targetPoint?.observed ?? 0;
    const relError = target !== 0
      ? ((Math.abs(predicted - target) / target) * 100).toFixed(2)
      : 'N/A';
    lines.push(`| ${metric} | ${predicted} | ${target} | ${relError} |`);
  }
  lines.push(``);

  // 误差历史
  lines.push(`## 误差历史`);
  lines.push(``);
  lines.push(`| 迭代 | 参数值 | 误差 |`);
  lines.push(`|------|--------|------|`);
  for (let i = 0; i < errorHistory.length; i++) {
    const step = errorHistory[i];
    lines.push(`| ${i + 1} | ${step.paramValue} | ${step.error.toExponential(4)} |`);
  }
  lines.push(``);

  const markdown = lines.join('\n');
  writeFileSync(outputPath, markdown, 'utf-8');
  return markdown;
}
