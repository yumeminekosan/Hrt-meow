/** 一个PK固件模块必须暴露的契约 */
export interface IPKModule {
  readonly moduleId: string;
  readonly assumptionTags: string[];

  /** 给定时间 t 和状态向量，返回变化率向量 */
  computeDerivatives(t: number, state: Float64Array): Float64Array;

  /** 返回初始状态向量 */
  getInitialState(): Float64Array;

  /** 自检：标准用例通过则 passed=true */
  selfTest(): { passed: boolean; errors: string[] };
}

/** 模块单步输出的标准化结构 */
export interface ModuleOutput {
  moduleId: string;
  timestamp: number;
  predictedConcentration: number;
  uncertaintyBand: [number, number];
  assumptionTags: string[];
  sensitivityVector: Record<string, number>;
  exceptionFlag: 'normal' | 'warning' | 'error';
}

/** 模拟配置 */
export interface SimulationConfig {
  tEnd: number;
  stepSize: number;
}

/** 单步结果 */
export interface StepResult {
  t: number;
  state: Float64Array;
}

/** TOML 解析后的 PK 模型形状（loader 用） */
export interface PKModel {
  metadata: {
    id: string;
    description: string;
    assumptions: string[];
  };
  compartments: Record<string, { initial_amount: number }>;
  parameters: Record<string, { value: number; unit: string }>;
}
