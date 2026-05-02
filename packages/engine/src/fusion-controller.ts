// ============================================================
// 多模型融合控制器
// 接收多个固件模块，等权融合输出
// ============================================================

import { IPKModule, ModuleOutput } from './types/pk-module.interface';

export class FusionController {
  constructor(private readonly modules: IPKModule[]) {
    if (modules.length === 0) {
      throw new Error('FusionController requires at least one module');
    }
  }

  /**
   * 第一步：数据校验
   * 检查浓度非负且模拟收敛（无 NaN/Infinity）
   */
  validateData(outputs: ModuleOutput[]): boolean {
    for (const out of outputs) {
      if (!Number.isFinite(out.predictedConcentration)) return false;
      if (out.predictedConcentration < 0) return false;
    }
    return true;
  }

  /**
   * 第二步：异常检查
   * 返回每个模块的权重乘数（正常=1，警告=0.5，错误=0）
   */
  checkException(outputs: ModuleOutput[]): number[] {
    return outputs.map((out) => {
      switch (out.exceptionFlag) {
        case 'normal': return 1.0;
        case 'warning': return 0.5;
        case 'error': return 0.0;
        default: return 1.0;
      }
    });
  }

  /**
   * 第三步：风险量化
   * 利用 sensitivityVector 计算风险衰减因子
   * 当前实现：若 sensitivityVector 非空则取均值，否则为 1
   */
  quantifyRisk(outputs: ModuleOutput[]): number[] {
    return outputs.map((out) => {
      const keys = Object.keys(out.sensitivityVector);
      if (keys.length === 0) return 1.0;
      const sum = keys.reduce((acc, k) => acc + out.sensitivityVector[k], 0);
      const mean = sum / keys.length;
      // 高敏感度降低信任度
      return Math.max(0, 1 - Math.abs(mean));
    });
  }

  /**
   * 第四步：融合
   * 等权加权平均，考虑异常和风险衰减
   */
  fuse(outputs: ModuleOutput[]): { fusedConcentration: number; weights: number[] } {
    const n = outputs.length;
    const exceptionWeights = this.checkException(outputs);
    const riskFactors = this.quantifyRisk(outputs);

    // 初始等权 + 异常惩罚 + 风险衰减
    const rawWeights = outputs.map((_, i) => {
      return (1 / n) * exceptionWeights[i] * riskFactors[i];
    });

    // 归一化
    const totalWeight = rawWeights.reduce((a, b) => a + b, 0);
    const weights = totalWeight > 0
      ? rawWeights.map((w) => w / totalWeight)
      : outputs.map(() => 1 / n); // 回退到纯等权

    const fusedConcentration = outputs.reduce(
      (acc, out, i) => acc + out.predictedConcentration * weights[i],
      0
    );

    return { fusedConcentration, weights };
  }
}
