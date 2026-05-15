// ============================================================
// DDI 测试: CPA (CYP3A4 抑制) 对雌二醇清除率的影响
//
// 复用 OralModule (一房室口服), 参数从 cpa_cyp3a4.toml 读取
// ============================================================

import { OralModule } from './modules/oral-module';
import { DrugInteractionEngine } from './drug-interaction/drug-interaction-engine';
import { InteractionCoupling } from './drug-interaction/interaction-types';
import { DosingEvent } from './monte-carlo';
import * as fs from 'fs';
import * as toml from 'toml';

// ---- 读取 TOML ----
const tomlPath = __dirname + '/../../../models/cpa_cyp3a4.toml';
const parsed = toml.parse(fs.readFileSync(tomlPath, 'utf-8'));
const inhP = parsed.inhibitor_params;
const subP = parsed.substrate_params;
const Ki_umol = parsed.coupling.Ki;
// 单位转换: μmol/L → mg/L (MW CPA ≈ 374.5 g/mol)
const MW_CPA = 374.5;
const Ki = Ki_umol * MW_CPA / 1000;  // mg/L

// ---- 构建 InteractionCoupling ----
const coupling: InteractionCoupling = {
  targetParameter: 'CL',
  mechanism: 'competitive',
  Ki_or_EC50: Ki,
  unit: 'mg/L',
};

// ---- 构建 OralModule 参数对象 ----
function buildOralModel(CL: number, Vd: number, ka: number, doseMg: number) {
  return {
    parameters: {
      ka: { value: ka },
      Vd: { value: Vd },
      CL: { value: CL },
    },
    compartments: {
      gut: { initial_amount: doseMg },
    },
  };
}

// ---- 模拟参数 ----
const tEnd = 48;       // 48h
const stepSize = 0.1;

// ---- 给药事件 ----
const dosingSub: DosingEvent[] = [{ time: 0, amount: subP.dose_mg }];
const dosingInh: DosingEvent[] = [{ time: 0, amount: inhP.dose_mg }];

// ---- 场景1: 有 DDI (CPA 抑制) ----
const substrateDDI = new OralModule(buildOralModel(subP.CL_baseline, subP.Vd, subP.ka, subP.dose_mg));
const inhibitorDDI = new OralModule(buildOralModel(inhP.CL, inhP.Vd, inhP.ka, inhP.dose_mg));

const engine = new DrugInteractionEngine(
  substrateDDI,
  inhibitorDDI,
  coupling,
  subP.CL_baseline
);

const resultDDI = engine.simulate(tEnd, dosingSub, dosingInh, stepSize);

// ---- 场景2: 无 DDI (对照) ----
const substrateCtrl = new OralModule(buildOralModel(subP.CL_baseline, subP.Vd, subP.ka, subP.dose_mg));
const inhibitorCtrl = new OralModule(buildOralModel(inhP.CL, inhP.Vd, inhP.ka, 0)); // 0 dose = 无抑制剂

const engineCtrl = new DrugInteractionEngine(
  substrateCtrl,
  inhibitorCtrl,
  coupling,
  subP.CL_baseline
);

const resultCtrl = engineCtrl.simulate(tEnd, dosingSub, [], stepSize);

// ---- 输出结果 ----
console.log('=== DDI: CPA CYP3A4 抑制对雌二醇的影响 ===');
console.log(`Ki = ${Ki_umol} μmol/L = ${Ki.toFixed(4)} mg/L`);
console.log(`CPA: ${inhP.dose_mg}mg oral, CL=${inhP.CL} L/h, Vd=${inhP.Vd} L`);
console.log(`E2:  ${subP.dose_mg}mg oral, CL=${subP.CL_baseline} L/h, Vd=${subP.Vd} L`);
console.log();

const findPeak = (traj: {t:number;concentration:number}[]) => {
  let max = traj[0];
  for (const p of traj) if (p.concentration > max.concentration) max = p;
  return max;
};

const findNearest = (traj: {t:number;concentration:number}[], target: number) =>
  traj.reduce((best, p) => Math.abs(p.t - target) < Math.abs(best.t - target) ? p : best);

const peakDDI = findPeak(resultDDI.substrateTrajectory);
const peakCtrl = findPeak(resultCtrl.substrateTrajectory);

const c4h_DDI = findNearest(resultDDI.substrateTrajectory, 4);
const c4h_Ctrl = findNearest(resultCtrl.substrateTrajectory, 4);
const c12h_DDI = findNearest(resultDDI.substrateTrajectory, 12);
const c12h_Ctrl = findNearest(resultCtrl.substrateTrajectory, 12);
const c24h_DDI = findNearest(resultDDI.substrateTrajectory, 24);
const c24h_Ctrl = findNearest(resultCtrl.substrateTrajectory, 24);

const fmt = (p: {t:number;concentration:number}) =>
  `${p.concentration.toFixed(4)} mg/L @ ${p.t.toFixed(1)}h`;

console.log('--- 雌二醇浓度 ---');
console.log(`峰值 (有DDI): ${fmt(peakDDI)}`);
console.log(`峰值 (对照):  ${fmt(peakCtrl)}`);
console.log(`峰值升高:     ${((peakDDI.concentration / peakCtrl.concentration - 1) * 100).toFixed(1)}%`);
console.log();
console.log(`@4h  有DDI: ${c4h_DDI.concentration.toFixed(4)}  对照: ${c4h_Ctrl.concentration.toFixed(4)}  比值: ${(c4h_DDI.concentration / c4h_Ctrl.concentration).toFixed(2)}x`);
console.log(`@12h 有DDI: ${c12h_DDI.concentration.toFixed(4)}  对照: ${c12h_Ctrl.concentration.toFixed(4)}  比值: ${(c12h_DDI.concentration / c12h_Ctrl.concentration).toFixed(2)}x`);
console.log(`@24h 有DDI: ${c24h_DDI.concentration.toFixed(4)}  对照: ${c24h_Ctrl.concentration.toFixed(4)}  比值: ${(c24h_DDI.concentration / c24h_Ctrl.concentration).toFixed(2)}x`);

// ---- CPA 浓度 ----
const peakInh = findPeak(resultDDI.inhibitorTrajectory);
console.log();
console.log('--- CPA 浓度 ---');
console.log(`峰值: ${fmt(peakInh)}`);
console.log(`@4h:  ${findNearest(resultDDI.inhibitorTrajectory, 4).concentration.toFixed(4)} mg/L`);
console.log(`@24h: ${findNearest(resultDDI.inhibitorTrajectory, 24).concentration.toFixed(4)} mg/L`);
console.log(`@48h: ${findNearest(resultDDI.inhibitorTrajectory, 48).concentration.toFixed(4)} mg/L`);

// ---- 抑制分数 ----
const inhPeakConc = peakInh.concentration;
const inhibitionAtPeak = inhPeakConc / (inhPeakConc + Ki);
console.log();
console.log('--- 抑制动力学 ---');
console.log(`CPA 峰值浓度: ${inhPeakConc.toFixed(4)} mg/L = ${(inhPeakConc * 1000).toFixed(1)} μg/L`);
console.log(`Ki: ${Ki_umol} μmol/L = ${Ki.toFixed(4)} mg/L (MW CPA ≈ 374.5)`);
console.log(`峰值抑制分数: ${inhibitionAtPeak.toFixed(3)} (${(inhibitionAtPeak * 100).toFixed(1)}%)`);
console.log(`剩余酶活性:   ${(1 - inhibitionAtPeak).toFixed(3)}`);

console.log();
console.log('完成');
