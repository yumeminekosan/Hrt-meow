import { readFileSync } from 'fs';
import * as toml from 'toml';
import { IFirmware } from '../engine';
import { OneCompIVFirmware } from './OneCompIVFirmware';
import { OneCompOralFirmware } from './OneCompOralFirmware';

export function loadFirmware(tomlPath: string): IFirmware {
  const raw = readFileSync(tomlPath, 'utf-8');
  const parsed = toml.parse(raw);

  const type = parsed.metadata?.type as string;
  const params = parsed.parameters as any;

  if (type === 'one_comp_iv') {
    return new OneCompIVFirmware(params);
  }

  if (type === 'one_comp_oral') {
    return new OneCompOralFirmware(params);
  }

  throw new Error(`Unknown firmware type: ${type}`);
}
