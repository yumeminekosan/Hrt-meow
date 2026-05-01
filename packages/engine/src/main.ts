// ============================================================
// clear-1 引擎入口
// 加载 TOML → 实例化固件 → 引擎模拟 → 输出浓度曲线
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
console.log(`固件自检通过: ${module.moduleId}`);

// 模拟
const engine = new Engine(module);
const results = engine.simulate({ tEnd: 24, stepSize: 0.5 });

console.log(`\n浓度曲线 (${results.length} 步):`);
for (let i = 0; i < Math.min(20, results.length); i++) {
  const { t, state } = results[i];
  console.log(`  t=${t.toFixed(1)}h  C=${state[0].toFixed(6)} mg/L`);
}
if (results.length > 20) {
  console.log(`  ... (共 ${results.length} 步)`);
  const last = results[results.length - 1];
  console.log(`  t=${last.t.toFixed(1)}h  C=${last.state[0].toFixed(6)} mg/L`);
}
