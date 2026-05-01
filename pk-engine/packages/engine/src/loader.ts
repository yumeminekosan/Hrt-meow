import { readFileSync } from 'fs';
import * as toml from 'toml';
import { TOMLModel } from './types/pk-module.interface';

/**
 * 从TOML文件加载PK模块参数
 */
export function loadModuleFromTOML(filePath: string): TOMLModel {
  const raw = readFileSync(filePath, 'utf-8');
  return toml.parse(raw) as TOMLModel;
}
