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

export interface SimulationConfig {
  tEnd: number;
  stepSize: number;
}

export interface StepResult {
  t: number;
  state: Float64Array;
}
