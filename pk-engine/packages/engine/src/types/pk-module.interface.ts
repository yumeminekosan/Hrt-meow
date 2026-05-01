// 一个PK模块必须暴露这些东西
export interface IPKModule {
  readonly moduleId: string;
  readonly assumptionTags: string[]; // 假设标签，如 ["一房室模型", "一级吸收"]

  // 给定时间和状态，返回变化率
  computeDerivatives(t: number, state: Float64Array): Float64Array;

  // 返回初始状态向量
  getInitialState(): Float64Array;

  // 自检：输入标准测试用例，返回是否通过
  selfTest(): { passed: boolean; errors: string[] };
}

// 一个模块的标准化输出
export interface ModuleOutput {
  moduleId: string;
  timestamp: number;
  predictedValue: number;
  uncertaintyBand: [number, number];
  assumptionTags: string[];
  sensitivityVector: Record<string, number>;
  exceptionFlag: 'normal' | 'warning' | 'error';
}

// TOML固件文件的元数据结构
export interface ModuleMetadata {
  id: string;
  description: string;
  assumptions: string[];
}

// 房室定义
export interface CompartmentDef {
  initial_amount: number;
}

// 参数定义（带单位）
export interface ParamDef {
  value: number;
  unit: string;
}

// 完整的TOML模型结构
export interface TOMLModel {
  metadata: ModuleMetadata;
  compartments: Record<string, CompartmentDef>;
  parameters: Record<string, ParamDef>;
}

// 模拟配置
export interface SimulationConfig {
  tEnd: number;       // 模拟总时长
  stepSize: number;   // 步长
  logInterval?: number; // 记录间隔（默认每一步）
}

// 单帧模拟结果
export interface SimulationFrame {
  t: number;
  state: Float64Array;
}

// 模拟结果
export interface SimulationResult {
  moduleId: string;
  config: SimulationConfig;
  frames: SimulationFrame[];
}
