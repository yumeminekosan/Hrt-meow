// ============================================================
// 口服 vs 肌注 对比模拟
// 共享患者参数，不同给药途径
// ============================================================

import { readFileSync } from 'fs';
import * as toml from 'toml';
import { parseDosingProtocol } from './packages/engine/src/dosing-parser';

// 加载共享患者参数
const vpRaw = readFileSync('./models/virtual_patient.toml', 'utf-8');
const vp = toml.parse(vpRaw) as any;
const sharedCL = vp.shared_params.CL;
const sharedVd = vp.shared_params.Vd;

// 加载口服模型（取 ka 和 F）
const oralRaw = readFileSync('./models/one_comp_oral.toml', 'utf-8');
const oralToml = toml.parse(oralRaw) as any;
const oralKa = oralToml.parameters.ka.value;
const oralF = oralToml.parameters.F?.value ?? 1.0;
const oralDosing = parseDosingProtocol(oralToml);

// 加载 IM 模型（取 ka）
const imRaw = readFileSync('./models/one_comp_IM.toml', 'utf-8');
const imToml = toml.parse(imRaw) as any;
const imKa = imToml.parameters.ka.value;
const imDosing = parseDosingProtocol(imToml);

// 构造 OralModule（参数单位：小时）
class OralModule {
  readonly moduleId = 'oral';
  readonly assumptionTags = ['一房室', '一级吸收', '一级消除'];
  private readonly ka: number;
  private readonly ke: number;
  private readonly Vd: number;
  private readonly doseUg: number;
  constructor(ka: number, CL: number, Vd: number, F: number) {
    this.ka = ka;
    this.Vd = Vd;
    this.ke = CL / Vd;
    this.doseUg = 0; // 初始无药
  }
  computeDerivatives(_t: number, state: Float64Array): Float64Array {
    const gut = state[0];
    const central = state[1];
    const dGut = -this.ka * gut;
    const dCentral = (this.ka * gut / this.Vd) - this.ke * central;
    return new Float64Array([dGut, dCentral]);
  }
  getInitialState() { return new Float64Array([0, 0]); }
  getConcentration(state: Float64Array) { return state[1]; }
  selfTest() { return { passed: true, errors: [] }; }
}

// 构造 IMDepotModule（参数单位：天）
class IMDepotModule {
  readonly moduleId = 'im';
  readonly assumptionTags = ['一房室', '一级吸收', '一级消除', '储库释放'];
  private readonly ka: number;
  private readonly ke: number;
  private readonly Vd: number;
  constructor(ka: number, CL: number, Vd: number) {
    this.ka = ka;
    this.Vd = Vd;
    this.ke = CL / Vd;
  }
  computeDerivatives(_t: number, state: Float64Array): Float64Array {
    const depot = state[0];
    const central = state[1];
    const dDepot = -this.ka * depot;
    const dCentral = (this.ka * depot / this.Vd) - this.ke * central;
    return new Float64Array([dDepot, dCentral]);
  }
  getInitialState() { return new Float64Array([0, 0]); }
  getConcentration(state: Float64Array) { return state[1]; }
  selfTest() { return { passed: true, errors: [] }; }
}

// 口服模拟（单位：小时）
const oralModule = new OralModule(oralKa, sharedCL, sharedVd, oralF);
const oralTEndHours = 30 * 24;
const oralStepHours = 0.05 * 24; // 0.05天 = 1.2小时
const oralSteps = Math.ceil(oralTEndHours / oralStepHours);
const oralResults: { t: number; c: number }[] = [];
let oralState = oralModule.getInitialState();

for (let i = 0; i <= oralSteps; i++) {
  const t = i * oralStepHours;
  for (const event of oralDosing) {
    if (Math.abs(t - event.time) <= oralStepHours / 2) {
      oralState[0] += event.dose * oralF;
    }
  }
  const c = oralModule.getConcentration(oralState);
  oralResults.push({ t, c });
  const deriv = oralModule.computeDerivatives(t, oralState);
  const next = new Float64Array(oralState.length);
  for (let j = 0; j < oralState.length; j++) {
    next[j] = oralState[j] + deriv[j] * oralStepHours;
  }
  oralState = next;
}

// IM 模拟（单位：天）
const imModule = new IMDepotModule(imKa, sharedCL, sharedVd);
const imTEnd = 30;
const imStep = 0.05;
const imSteps = Math.ceil(imTEnd / imStep);
const imResults: { t: number; c: number }[] = [];
let imState = imModule.getInitialState();

for (let i = 0; i <= imSteps; i++) {
  const t = i * imStep;
  for (const event of imDosing) {
    if (Math.abs(t - event.time) <= imStep / 2) {
      imState[0] += event.dose;
    }
  }
  const c = imModule.getConcentration(imState);
  imResults.push({ t, c });
  const deriv = imModule.computeDerivatives(t, imState);
  const next = new Float64Array(imState.length);
  for (let j = 0; j < imState.length; j++) {
    next[j] = imState[j] + deriv[j] * imStep;
  }
  imState = next;
}

// 对齐输出：口服结果以小时为单位，IM 以天为单位，统一转小时
// 每隔 4 步输出
console.log('time(h),oral_conc,im_conc');
for (let i = 0; i <= Math.max(oralResults.length, imResults.length); i += 4) {
  const oralIdx = i;
  const imIdx = i;
  if (oralIdx < oralResults.length && imIdx < imResults.length) {
    const tH = oralResults[oralIdx].t;
    const oralC = oralResults[oralIdx].c;
    const imC = imResults[imIdx].c;
    console.log(`${tH.toFixed(1)},${oralC.toFixed(4)},${imC.toFixed(4)}`);
  }
}
