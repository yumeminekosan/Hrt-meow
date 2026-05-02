// ============================================================
// clear-1 引擎入口
// 加载 TOML → 实例化固件 → 引擎模拟 → 输出 ModuleOutput
// ============================================================

import { loadModuleFromTOML } from './loader';
import { Engine } from './engine';
import { IVModule } from './modules/iv-module';

const model = loadModuleFromTOML('./models/one_comp_iv.toml');
const module = new IVModule(model);

// 自检
const testResult = module.selfTest();
if (!testResult.passed) {
  console.error('固件自检失败:', testResult.errors);
  process.exit(1);
}
console.log('固件自检通过:', module.moduleId);

// 模拟
const engine = new Engine(module);
const results = engine.simulate({ tEnd: 24, stepSize: 0.5 });

console.log(`\n模拟完成，共 ${results.length} 步`);
console.log('前3步的 ModuleOutput:');
for (let i = 0; i < Math.min(3, results.length); i++) {
  console.log(JSON.stringify(results[i], null, 2));
}
if (results.length > 3) {
  console.log(`... (共 ${results.length} 步)`);
  const last = results[results.length - 1];
  console.log('最后一步:');
  console.log(JSON.stringify(last, null, 2));
}
