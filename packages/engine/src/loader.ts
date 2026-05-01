import * as fs from 'fs';
import * as toml from 'toml';

/**
 * 从TOML文件加载PK模块配置。
 * @param filePath TOML文件路径
 * @returns 解析后的配置对象
 */
export function loadModuleFromTOML(filePath: string): Record<string, unknown> {
  const raw = fs.readFileSync(filePath, 'utf-8');
  return toml.parse(raw);
}
