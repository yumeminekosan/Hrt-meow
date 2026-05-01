import { TOMLModel, SimulationResult, SimulationFrame } from '../types/pk-module.interface';

/**
 * 一房室IV模型：dC/dt = -(CL/Vd) * C
 * 使用最朴素的欧拉法进行数值积分
 *
 * @param model  从TOML加载的模型参数
 * @param tEnd   模拟总时长 (h)
 * @param stepSize 步长 (h)
 * @returns 浓度随时间变化的结果
 */
export function simulateIV(
  model: TOMLModel,
  tEnd: number,
  stepSize: number
): SimulationResult {
  const CL = model.parameters.CL.value;
  const Vd = model.parameters.Vd.value;
  const C0 = model.compartments.central.initial_amount / Vd;

  const steps = Math.ceil(tEnd / stepSize);
  const frames: SimulationFrame[] = [];

  let C = C0;

  for (let i = 0; i <= steps; i++) {
    const t = i * stepSize;
    // 只追踪浓度这一个状态量的简单模型
    frames.push({ t, state: new Float64Array([C]) });

    // 欧拉步：C_{n+1} = C_n + (-CL/Vd) * C_n * dt
    C = C - (CL / Vd) * C * stepSize;
  }

  return {
    moduleId: model.metadata.id,
    config: { tEnd, stepSize },
    frames,
  };
}
