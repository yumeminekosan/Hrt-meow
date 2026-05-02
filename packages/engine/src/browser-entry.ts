// ============================================================
// 浏览器入口 — 纯运行时，不依赖文件系统
// ============================================================

import { Engine } from './engine';
import { IVModule } from './modules/iv-module';
import { OralModule } from './modules/oral-module';
import { ModuleOutput } from './types/pk-module.interface';

/**
 * 在浏览器环境中运行 PK 模拟。
 *
 * @param moduleType  "iv" | "oral"
 * @param params      固件参数对象
 * @returns ModuleOutput 数组
 */
export function runSimulation(
  moduleType: string,
  params: Record<string, number>
): ModuleOutput[] {
  if (moduleType === 'iv') {
    const model = buildIVModel(params);
    const module = new IVModule(model);
    const engine = new Engine(module);
    return engine.simulate({ tEnd: params.tEnd ?? 24, stepSize: params.dt ?? 0.5 });
  }

  if (moduleType === 'oral') {
    const model = buildOralModel(params);
    const module = new OralModule(model);
    const engine = new Engine(module);
    return engine.simulate({ tEnd: params.tEnd ?? 24, stepSize: params.dt ?? 0.5 });
  }

  throw new Error(`Unknown moduleType: ${moduleType}`);
}

/** 从参数构造 IV 模型结构 */
function buildIVModel(params: Record<string, number>): any {
  return {
    metadata: {
      id: 'one_comp_iv_browser',
      description: 'Browser IV simulation',
      assumptions: ['一房室', '一级消除']
    },
    compartments: {
      central: { initial_amount: (params.dose_mg ?? 10) * 1000 }
    },
    parameters: {
      CL: { value: params.CL ?? 2.0, unit: 'L/h' },
      Vd: { value: params.Vd ?? 50.0, unit: 'L' }
    }
  };
}

/** 从参数构造 Oral 模型结构 */
function buildOralModel(params: Record<string, number>): any {
  return {
    metadata: {
      id: 'one_comp_oral_browser',
      description: 'Browser Oral simulation',
      assumptions: ['一房室', '一级吸收', '一级消除']
    },
    compartments: {
      gut: { initial_amount: (params.dose_mg ?? 10) * 1000 * (params.F ?? 1.0) },
      central: { initial_amount: 0 }
    },
    parameters: {
      ka: { value: params.ka ?? 1.0, unit: '1/h' },
      CL: { value: params.CL ?? 2.0, unit: 'L/h' },
      Vd: { value: params.Vd ?? 50.0, unit: 'L' },
      F: { value: params.F ?? 1.0, unit: '' }
    }
  };
}
