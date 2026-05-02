// packages/engine/src/engine.ts
var Engine = class {
  constructor(module) {
    this.module = module;
  }
  module;
  /**
   * 执行确定性欧拉法模拟。
   * 每一步: state_{n+1} = state_n + dt * f(t_n, state_n)
   * 返回 ModuleOutput 数组，包含完整的预测与元数据。
   */
  simulate(config) {
    const { tEnd, stepSize } = config;
    const steps = Math.ceil(tEnd / stepSize);
    const results = [];
    let state = this.module.getInitialState();
    for (let i = 0; i <= steps; i++) {
      const t = i * stepSize;
      const predictedConcentration = state[0];
      const uncertaintyBand = [
        predictedConcentration * 0.95,
        predictedConcentration * 1.05
      ];
      results.push({
        moduleId: this.module.moduleId,
        timestamp: t,
        predictedConcentration,
        uncertaintyBand,
        assumptionTags: [...this.module.assumptionTags],
        sensitivityVector: {},
        exceptionFlag: "normal"
      });
      const derivatives = this.module.computeDerivatives(t, state);
      const nextState = new Float64Array(state.length);
      for (let j = 0; j < state.length; j++) {
        nextState[j] = state[j] + derivatives[j] * stepSize;
      }
      state = nextState;
    }
    return results;
  }
};

// packages/engine/src/modules/iv-module.ts
var IVModule = class {
  moduleId;
  assumptionTags;
  ke;
  initialConcentration;
  constructor(model) {
    this.moduleId = model.metadata.id;
    this.assumptionTags = [...model.metadata.assumptions];
    const CL = model.parameters.CL.value;
    const Vd = model.parameters.Vd.value;
    this.ke = CL / Vd;
    this.initialConcentration = model.compartments.central.initial_amount / Vd;
  }
  /** 扩散系数: 当前浓度的 15%，只对中央室 */
  computeDiffusion(_t, state) {
    return new Float64Array([state[0] * 0.15]);
  }
  /** 状态向量: [浓度] */
  computeDerivatives(_t, state) {
    return new Float64Array([-this.ke * state[0]]);
  }
  getInitialState() {
    return new Float64Array([this.initialConcentration]);
  }
  selfTest() {
    const errors = [];
    if (!isFinite(this.ke) || this.ke <= 0) {
      errors.push(`ke \u5F02\u5E38: ${this.ke}`);
    }
    if (!isFinite(this.initialConcentration) || this.initialConcentration < 0) {
      errors.push(`\u521D\u59CB\u6D53\u5EA6\u5F02\u5E38: ${this.initialConcentration}`);
    }
    return { passed: errors.length === 0, errors };
  }
};

// packages/engine/src/modules/oral-module.ts
var OralModule = class {
  moduleId = "one_comp_oral_basic";
  assumptionTags = ["\u4E00\u623F\u5BA4", "\u4E00\u7EA7\u5438\u6536", "\u4E00\u7EA7\u6D88\u9664"];
  ka;
  ke;
  Vd;
  initialGutAmount;
  constructor(model) {
    this.ka = model.parameters.ka.value;
    this.Vd = model.parameters.Vd.value;
    this.ke = model.parameters.CL.value / this.Vd;
    this.initialGutAmount = model.compartments.gut.initial_amount;
  }
  computeDerivatives(_t, state) {
    const gut = state[0];
    const central = state[1];
    const dGut = -this.ka * gut;
    const dCentral = this.ka * gut / this.Vd - this.ke * central;
    return new Float64Array([dGut, dCentral]);
  }
  getInitialState() {
    return new Float64Array([this.initialGutAmount, 0]);
  }
  selfTest() {
    const errors = [];
    if (!Number.isFinite(this.ka) || this.ka <= 0) {
      errors.push(`ka must be finite positive, got ${this.ka}`);
    }
    if (!Number.isFinite(this.ke) || this.ke <= 0) {
      errors.push(`ke must be finite positive, got ${this.ke}`);
    }
    if (!Number.isFinite(this.Vd) || this.Vd <= 0) {
      errors.push(`Vd must be finite positive, got ${this.Vd}`);
    }
    return { passed: errors.length === 0, errors };
  }
};

// packages/engine/src/browser-entry.ts
function runSimulation(moduleType, params) {
  if (moduleType === "iv") {
    const model = buildIVModel(params);
    const module = new IVModule(model);
    const engine = new Engine(module);
    return engine.simulate({ tEnd: params.tEnd ?? 24, stepSize: params.dt ?? 0.5 });
  }
  if (moduleType === "oral") {
    const model = buildOralModel(params);
    const module = new OralModule(model);
    const engine = new Engine(module);
    return engine.simulate({ tEnd: params.tEnd ?? 24, stepSize: params.dt ?? 0.5 });
  }
  throw new Error(`Unknown moduleType: ${moduleType}`);
}
function buildIVModel(params) {
  return {
    metadata: {
      id: "one_comp_iv_browser",
      description: "Browser IV simulation",
      assumptions: ["\u4E00\u623F\u5BA4", "\u4E00\u7EA7\u6D88\u9664"]
    },
    compartments: {
      central: { initial_amount: (params.dose_mg ?? 10) * 1e3 }
    },
    parameters: {
      CL: { value: params.CL ?? 2, unit: "L/h" },
      Vd: { value: params.Vd ?? 50, unit: "L" }
    }
  };
}
function buildOralModel(params) {
  return {
    metadata: {
      id: "one_comp_oral_browser",
      description: "Browser Oral simulation",
      assumptions: ["\u4E00\u623F\u5BA4", "\u4E00\u7EA7\u5438\u6536", "\u4E00\u7EA7\u6D88\u9664"]
    },
    compartments: {
      gut: { initial_amount: (params.dose_mg ?? 10) * 1e3 * (params.F ?? 1) },
      central: { initial_amount: 0 }
    },
    parameters: {
      ka: { value: params.ka ?? 1, unit: "1/h" },
      CL: { value: params.CL ?? 2, unit: "L/h" },
      Vd: { value: params.Vd ?? 50, unit: "L" },
      F: { value: params.F ?? 1, unit: "" }
    }
  };
}
export {
  runSimulation
};
