// ============================================================
// clear-1 引擎入口 (IM 稳态版本)
// 多次给药模拟，观察稳态浓度
// ============================================================

import { loadModuleFromTOML } from './loader';
import { Engine } from './engine';
import { IMDepotModule } from './modules/IM-depot-module';

const model = loadModuleFromTOML('./models/one_comp_IM.toml');
const module = new IMDepotModule(model);

// 自检
const testResult = module.selfTest();
if (!testResult.passed) {
  console.error('固件自检失败:', testResult.errors);
  process.exit(1);
}
console.log('固件自检通过:', module.moduleId);

// 给药事件：每7天一次，共12次，每次10mg
// 时间单位统一为天（IM 参数单位为天）
const doseMg = 10;
const doseUg = doseMg * 1000;
const nDoses = 12;
const dosingIntervalDays = 7; // 每周一次
const dosingTimes: number[] = [];
for (let i = 0; i < nDoses; i++) {
  dosingTimes.push(i * dosingIntervalDays); // 单位为天
}

// 模拟参数：84天，步长0.05天
const tEnd = 84;
const stepSize = 0.05;

const engine = new Engine(module);

// 手动运行模拟，在特定时间点加入给药事件
const steps = Math.ceil(tEnd / stepSize);
const results: any[] = [];
let state = module.getInitialState();

for (let i = 0; i <= steps; i++) {
  const t = i * stepSize;

  // 检查是否在给药时间点的半步长范围内
  for (const doseTime of dosingTimes) {
    if (Math.abs(t - doseTime) <= stepSize / 2) {
      // 给药：Depot室（索引0）加上剂量
      state[0] += doseUg;
    }
  }

  const predictedConcentration =
    typeof (module as any).getConcentration === 'function'
      ? (module as any).getConcentration(state)
      : state[0];

  results.push({
    t,
    predictedConcentration,
    state: new Float64Array(state)
  });

  // 欧拉步
  const derivatives = module.computeDerivatives(t, state);
  const nextState = new Float64Array(state.length);
  for (let j = 0; j < state.length; j++) {
    nextState[j] = state[j] + derivatives[j] * stepSize;
  }
  state = nextState;
}

console.log(`\n多次给药浓度曲线 (${results.length} 步):`);

// 输出每周最后一次的稳态浓度
console.log('\n每周给药后浓度 (mg/L):');
for (let week = 0; week <= 12; week++) {
  const tDays = week * 7;
  const idx = Math.round(tDays / stepSize);
  if (idx < results.length) {
    const r = results[idx];
    console.log(`  Week ${week.toString().padStart(2)}: C=${r.predictedConcentration.toFixed(4)} mg/L`);
  }
}

// 输出最后几个时间点
console.log('\n最后5个时间点:');
for (let i = Math.max(0, results.length - 5); i < results.length; i++) {
  const r = results[i];
  console.log(`  t=${r.t.toFixed(2)}d  C=${r.predictedConcentration.toFixed(4)} mg/L`);
}
