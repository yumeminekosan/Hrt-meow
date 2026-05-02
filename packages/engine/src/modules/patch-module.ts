// ============================================================
// 透皮贴片 (Transdermal Patch) PK 模块
//
// 状态向量: [Central_concentration]
// 贴片行为：贴上后以恒定速率释放药物，持续 duration 时间
// ============================================================

import { IPKModule } from '../types/pk-module.interface';

export class PatchModule implements IPKModule {
  readonly moduleId = 'one_comp_patch';
  readonly assumptionTags = ['一房室', '零级释放', '透皮吸收'];

  private readonly releaseRate: number;   // ug/天
  private readonly duration: number;       // 天
  private readonly ke: number;             // 1/天
  private readonly F_td: number;           // 透皮生物利用度
  private readonly Vd: number;             // L

  private patchTime: number = -1;          // 贴上时间（-1 表示未贴）
  private prevState: Float64Array | null = null;

  constructor(model: any) {
    this.releaseRate = model.parameters.release_rate.value;
    this.duration = model.parameters.duration.value;
    this.Vd = model.parameters.Vd.value;
    this.F_td = model.parameters.F_td?.value ?? 1.0;
    this.ke = model.parameters.CL.value / this.Vd;
  }

  computeDerivatives(t: number, state: Float64Array): Float64Array {
    // 检测给药事件：状态跳变 → 贴上新贴片
    if (this.prevState !== null) {
      const delta = state[0] - this.prevState[0];
      if (delta > 0.001) {
        this.patchTime = t;
      }
    }
    this.prevState = new Float64Array(state);

    // 计算输入速率
    let inputRate = 0;
    if (this.patchTime >= 0 && (t - this.patchTime) < this.duration) {
      inputRate = this.releaseRate * this.F_td; // ug/天
    }

    const central = state[0];
    const dCentral = inputRate / this.Vd - this.ke * central;

    return new Float64Array([dCentral]);
  }

  getInitialState(): Float64Array {
    return new Float64Array([0]);
  }

  getConcentration(state: Float64Array): number {
    return state[0];
  }

  selfTest(): { passed: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!Number.isFinite(this.releaseRate) || this.releaseRate <= 0) {
      errors.push(`release_rate must be finite positive, got ${this.releaseRate}`);
    }
    if (!Number.isFinite(this.duration) || this.duration <= 0) {
      errors.push(`duration must be finite positive, got ${this.duration}`);
    }
    if (!Number.isFinite(this.ke) || this.ke <= 0) {
      errors.push(`ke must be finite positive, got ${this.ke}`);
    }
    if (!Number.isFinite(this.F_td) || this.F_td < 0 || this.F_td > 1) {
      errors.push(`F_td must be in [0,1], got ${this.F_td}`);
    }
    if (!Number.isFinite(this.Vd) || this.Vd <= 0) {
      errors.push(`Vd must be finite positive, got ${this.Vd}`);
    }

    return { passed: errors.length === 0, errors };
  }
}
