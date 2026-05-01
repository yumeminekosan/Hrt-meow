import { loadModuleFromTOML } from './loader';
import { Engine } from './engine';
import { IVModule } from './modules/iv-module';
import { SimulationConfig } from './types/pk-module.interface';

async function main() {
  // 1. 加载固件（TOML参数文件）
  const tomlPath = '../../models/one_comp_iv.toml';
  console.log(`[pk-engine] 加载固件: ${tomlPath}`);
  const model = loadModuleFromTOML(tomlPath);

  // 2. 用固件实例化引擎
  const module = new IVModule(model);

  // 3. 自检
  const testResult = module.selfTest();
  console.log(`[pk-engine] 固件自检: ${testResult.passed ? '✅ 通过' : '❌ 失败'}`);
  if (!testResult.passed) {
    console.error('自检错误:', testResult.errors);
    process.exit(1);
  }

  // 4. 创建引擎并运行模拟
  const engine = new Engine(module);
  const config: SimulationConfig = { tEnd: 24, stepSize: 0.5 };
  console.log(`[pk-engine] 开始模拟: tEnd=${config.tEnd}h, stepSize=${config.stepSize}h`);

  const result = engine.simulate(config);

  // 5. 输出结果
  console.log(`\n模块: ${result.moduleId}`);
  console.log('时间(h)\t浓度(mg/L)');
  console.log('--------\t----------');
  result.frames.forEach((f) => {
    console.log(`${f.t.toFixed(1)}\t\t${f.state[0].toFixed(4)}`);
  });

  console.log(`\n[pk-engine] 模拟完成，共 ${result.frames.length} 帧`);
}

main().catch(console.error);
