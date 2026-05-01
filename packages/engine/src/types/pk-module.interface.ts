export interface IPKModule {
  moduleId: string;
  assumptionTags: string[];
  computeDerivatives(t: number, state: Float64Array): Float64Array;
  getInitialState(): Float64Array;
  selfTest(): { passed: boolean; errors: string[] };
}

export interface ModuleOutput {
  moduleId: string;
  timestamp: number;
  predictedValue: number;
  uncertaintyBand: [number, number];
  assumptionTags: string[];
  sensitivityVector: Record<string, number>;
  exceptionFlag: 'none' | 'warning' | 'critical' | 'overflow';
}

/** 模型参数定义（带单位） */
export interface ParameterDef {
  value: number;
  unit: string;
}

/** 房室定义 */
export interface CompartmentDef {
  initial_amount: number;
}

/** TOML 解析后的 PK 模型形状 */
export interface PKModel {
  metadata: {
    id: string;
    description: string;
    assumptions: string[];
  };
  compartments: Record<string, CompartmentDef>;
  parameters: Record<string, ParameterDef>;
}

export interface SimulationConfig {
  tEnd: number;
  stepSize: number;
}

export interface StepOutput {
  t: number;
  concentration: number;
}
