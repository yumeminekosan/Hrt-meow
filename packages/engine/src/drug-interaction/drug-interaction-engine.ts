/**
 * 药物相互作用引擎：CYP 抑制 / 诱导对底物 CL 的动态影响。
 *
 * 并行模拟底物与抑制剂两个 PK 模块，
 * 每步根据 coupling.mechanism 分支计算有效 CL，再更新底物。
 */

import { IPKModule } from '../types/pk-module.interface';
import { DosingEvent } from '../monte-carlo';
import { computeInhibitedCL } from './cyp-inhibition';
import { computeInducedCL } from './cyp-induction';
import { InteractionCoupling } from './interaction-types';

interface TrajectoryPoint {
  t: number;
  concentration: number;
}

export class DrugInteractionEngine {
  private substrate: IPKModule;
  private inhibitor: IPKModule;
  private coupling: InteractionCoupling;
  private clBaseline: number;

  constructor(
    substrate: IPKModule,
    inhibitor: IPKModule,
    coupling: InteractionCoupling,
    clBaseline: number
  ) {
    this.substrate = substrate;
    this.inhibitor = inhibitor;
    this.coupling = coupling;
    this.clBaseline = clBaseline;
  }

  /** 替换耦合参数（运行时更新）。 */
  updateCoupling(coupling: InteractionCoupling): void {
    this.coupling = coupling;
  }

  simulate(
    tEnd: number,
    dosingSubstrate: DosingEvent[],
    dosingInhibitor: DosingEvent[],
    stepSize: number
  ): {
    substrateTrajectory: TrajectoryPoint[];
    inhibitorTrajectory: TrajectoryPoint[];
  } {
    const steps = Math.ceil(tEnd / stepSize);

    let subState = this.substrate.getInitialState();
    let inhState = this.inhibitor.getInitialState();

    const hasSubConc =
      typeof (this.substrate as any).getConcentration === 'function';
    const hasInhConc =
      typeof (this.inhibitor as any).getConcentration === 'function';
    const hasSetClearance =
      typeof (this.substrate as any).setClearance === 'function';

    const substrateTrajectory: TrajectoryPoint[] = [];
    const inhibitorTrajectory: TrajectoryPoint[] = [];

    for (let i = 0; i <= steps; i++) {
      const t = i * stepSize;

      // 1. 记录当前浓度
      const subConc = hasSubConc
        ? (this.substrate as any).getConcentration(subState)
        : subState[0];
      const inhConc = hasInhConc
        ? (this.inhibitor as any).getConcentration(inhState)
        : inhState[0];

      substrateTrajectory.push({ t, concentration: subConc });
      inhibitorTrajectory.push({ t, concentration: inhConc });

      // 2. 处理给药事件
      for (const dose of dosingSubstrate) {
        if (Math.abs(dose.time - t) < stepSize / 2) {
          const comp = dose.compartment ?? 0;
          if (comp < subState.length) {
            subState[comp] += dose.amount;
          }
        }
      }
      for (const dose of dosingInhibitor) {
        if (Math.abs(dose.time - t) < stepSize / 2) {
          const comp = dose.compartment ?? 0;
          if (comp < inhState.length) {
            inhState[comp] += dose.amount;
          }
        }
      }

      // 3. 根据 mechanism 计算有效 CL
      let clEff: number;
      switch (this.coupling.mechanism) {
        case 'competitive':
          clEff = computeInhibitedCL(
            this.clBaseline,
            inhConc,
            this.coupling.Ki_or_EC50
          );
          break;
        case 'induction':
          clEff = computeInducedCL(
            this.clBaseline,
            inhConc,
            this.coupling.Emax ?? 3.0,
            this.coupling.Ki_or_EC50
          );
          break;
        case 'irreversible':
          // TODO: 时间依赖性不可逆抑制，后续实现
          clEff = computeInhibitedCL(
            this.clBaseline,
            inhConc,
            this.coupling.Ki_or_EC50
          );
          break;
        default:
          clEff = this.clBaseline;
      }

      // 4. 更新底物 CL
      if (hasSetClearance) {
        (this.substrate as any).setClearance(clEff);
      }

      // 5. 计算漂移项
      let subDrift = this.substrate.computeDerivatives(t, subState);
      const inhDrift = this.inhibitor.computeDerivatives(t, inhState);

      // 若无 setClearance，按比例缩放底物漂移项
      if (!hasSetClearance) {
        const ratio = clEff / this.clBaseline;
        const scaled = new Float64Array(subDrift.length);
        for (let j = 0; j < subDrift.length; j++) {
          scaled[j] = subDrift[j] * ratio;
        }
        subDrift = scaled;
      }

      // 6. 扩散项
      const subDiff =
        typeof this.substrate.computeDiffusion === 'function'
          ? this.substrate.computeDiffusion(t, subState)
          : new Float64Array(subState.length);
      const inhDiff =
        typeof this.inhibitor.computeDiffusion === 'function'
          ? this.inhibitor.computeDiffusion(t, inhState)
          : new Float64Array(inhState.length);

      // 7. Euler-Maruyama 步进
      const dW1 = Math.sqrt(stepSize) * randn();
      const dW2 = Math.sqrt(stepSize) * randn();

      const nextSub = new Float64Array(subState.length);
      for (let j = 0; j < subState.length; j++) {
        nextSub[j] =
          subState[j] + subDrift[j] * stepSize + subDiff[j] * dW1;
      }

      const nextInh = new Float64Array(inhState.length);
      for (let j = 0; j < inhState.length; j++) {
        nextInh[j] =
          inhState[j] + inhDrift[j] * stepSize + inhDiff[j] * dW2;
      }

      subState = nextSub;
      inhState = nextInh;
    }

    return { substrateTrajectory, inhibitorTrajectory };
  }
}

/** Box-Muller 正态随机数 */
function randn(): number {
  const u1 = Math.random();
  const u2 = Math.random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}
