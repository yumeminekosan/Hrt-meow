/**
 * 从校准数据文件加载目标 PK 指标。
 */

import * as fs from 'fs';
import * as path from 'path';

/** 单项 PK 指标 */
export interface ObservedMetric {
  value: number;
  unit: string;
  cv: number;
}

/** 药物校准目标数据 */
export interface TargetData {
  source: string;
  dosage: string;
  n: number;
  observed: Record<string, ObservedMetric>;
}

/**
 * 读取 tfs_data.json 并返回指定 drugId 的目标数据。
 *
 * @param drugId — JSON 中的键名，如 "estradiol_valerate_IM"
 * @throws drugId 不存在时抛出错误
 */
export function loadTargetValues(drugId: string): TargetData {
  const jsonPath = path.resolve(
    __dirname,
    '../../../../models/calibration/tfs_data.json'
  );
  const raw = fs.readFileSync(jsonPath, 'utf-8');
  const data = JSON.parse(raw);

  if (!(drugId in data)) {
    const available = Object.keys(data).join(', ');
    throw new Error(
      `drugId "${drugId}" not found in tfs_data.json. Available: [${available}]`
    );
  }

  return data[drugId] as TargetData;
}
