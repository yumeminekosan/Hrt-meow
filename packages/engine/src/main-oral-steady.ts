// ============================================================
// clear-1 引擎入口 (口服稳态版本)
// 多次给药模拟，观察稳态浓度
// ============================================================

import { loadModuleFromTOML } from './loader';
import { Engine } from './engine';
import { OralModule } from './modules/oral-module';
import { parseDosingProtocol } from './dosing-parser';
import { readFileSync } from 'fs';
import * as toml from 'toml';

const raw = readFileSync('./models/one_comp_oral.toml', 'utf-8');
const parsed = toml.parse(raw);
const model = parsed as any;
const module = new OralModule(model);

// 自检
const testResult = module.selfTest();
if (!testResult.passed) {
  console.error('固件自检失败:', testResult.errors);
  process.exit(1);
}
console.log('固件自检通过:', module.moduleId);

// 从 TOML 解析给药协议
const dosingEvents = parseDosingProtocol(model);
const dosingTimes = dosingEvents.map(e => e.time);
const doseUg = dosingEvents[0]?.dose ?? 0;
console.log(`给药协议: ${dosingEvents.length} 次, 间隔 ${(dosingTimes[1] - dosingTimes[0]).toFixed(1)}h, 剂量 ${doseUg}ug`);

// 模拟参数：根据给药协议计算总时长，步长0.25小时
const tEnd = dosingTimes[dosingTimes.length - 1] + 24 * 3; // 最后一次给药后多模拟3天
const stepSize = 0.25; // 0.25 小时

const engine = new Engine(module);

// 手动运行模拟，在特定时间点加入给药事件
const steps = Math.ceil(tEnd / stepSize);
const results: any[] = [];
let state = module.getInitialState();

for (let i = 0; i <= steps; i++) {
  const t = i * stepSize;

  // 检查是否在给药时间点的半步长范围内
  for (const event of dosingEvents) {
    if (Math.abs(t - event.time) <= stepSize / 2) {
      // 给药：肠道室（索引0）加上剂量
      state[0] += event.dose;
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

// 输出前3个给药时间点和对应浓度
console.log('\n前3个给药时间点浓度:');
for (let i = 0; i < Math.min(3, dosingTimes.length); i++) {
  const tDose = dosingTimes[i];
  const idx = Math.round(tDose / stepSize);
  if (idx < results.length) {
    const r = results[idx];
    console.log(`  Dose ${i + 1}: t=${tDose.toFixed(1)}h  C=${r.predictedConcentration.toFixed(4)} mg/L`);
  }
}

// 输出每天最后一次的稳态浓度
console.log('\n每日给药后浓度 (mg/L):');
const maxDay = Math.floor(dosingTimes[dosingTimes.length - 1] / 24);
for (let day = 0; day <= maxDay; day++) {
  const tHours = day * 24;
  const idx = Math.round(tHours / stepSize);
  if (idx < results.length) {
    const r = results[idx];
    console.log(`  Day ${day.toString().padStart(2)}: C=${r.predictedConcentration.toFixed(4)} mg/L`);
  }
}

// 输出最后几个时间点
console.log('\n最后5个时间点:');
for (let i = Math.max(0, results.length - 5); i < results.length; i++) {
  const r = results[i];
  console.log(`  t=${(r.t / 24).toFixed(2)}d  C=${r.predictedConcentration.toFixed(4)} mg/L`);
}
