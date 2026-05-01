import * as fs from 'fs';
import * as toml from 'toml';
import { PKModel } from './types/pk-module.interface';

/**
 * 从TOML文件加载PK模块配置，并进行基本校验。
 *
 * 校验项：
 * - 文件存在且为合法TOML
 * - metadata.id 非空
 * - compartments 至少有一个
 * - parameters 中每个字段的 value 为有限正数
 *
 * @param filePath TOML文件路径
 * @returns 校验后的 PKModel 对象
 * @throws 文件不存在、TOML格式错误、或校验不通过
 */
export function loadModuleFromTOML(filePath: string): PKModel {
  let raw: string;
  try {
    raw = fs.readFileSync(filePath, 'utf-8');
  } catch (e: any) {
    throw new Error(`无法读取TOML文件: ${filePath}\n${e.message}`);
  }

  let parsed: unknown;
  try {
    parsed = toml.parse(raw);
  } catch (e: any) {
    throw new Error(`TOML解析失败: ${filePath}\n${e.message}`);
  }

  const model = parsed as Record<string, any>;

  // --- 基本结构校验 ---
  if (!model.metadata || typeof model.metadata.id !== 'string' || !model.metadata.id) {
    throw new Error(`TOML校验失败: metadata.id 缺失或为空`);
  }
  if (!model.compartments || typeof model.compartments !== 'object' || Object.keys(model.compartments).length === 0) {
    throw new Error(`TOML校验失败: compartments 缺失或为空`);
  }
  if (!model.parameters || typeof model.parameters !== 'object') {
    throw new Error(`TOML校验失败: parameters 缺失`);
  }

  // --- 参数值校验 ---
  for (const [key, def] of Object.entries(model.parameters)) {
    const p = def as any;
    if (typeof p.value !== 'number' || !isFinite(p.value) || p.value <= 0) {
      throw new Error(`TOML校验失败: parameters.${key}.value 必须为有限正数, 实际: ${p.value}`);
    }
    if (p.unit !== undefined && typeof p.unit !== 'string') {
      throw new Error(`TOML校验失败: parameters.${key}.unit 必须为字符串`);
    }
  }

  // --- 房室初始量校验 ---
  for (const [key, comp] of Object.entries(model.compartments)) {
    const c = comp as any;
    if (typeof c.initial_amount !== 'number' || !isFinite(c.initial_amount) || c.initial_amount < 0) {
      throw new Error(`TOML校验失败: compartments.${key}.initial_amount 必须为非负有限数, 实际: ${c.initial_amount}`);
    }
  }

  return model as PKModel;
}
