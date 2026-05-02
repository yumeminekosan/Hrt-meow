// ============================================================
// 给药协议解析器
// 从 TOML 的 dosing_protocol 段提取给药事件
// 支持 phases 数组（负荷剂量 + 维持剂量等多阶段方案）
// ============================================================

export interface DosingEvent {
  time: number;   // 小时
  dose: number;   // 剂量（ug，已转换）
}

/**
 * 解析 TOML 中的给药协议。
 * 支持两种格式：
 *   1. 单阶段：dose_amount, n_doses, interval 在顶层
 *   2. 多阶段：[[dosing_protocol.phases]] 数组
 *
 * @param parsed  TOML 解析后的对象
 * @returns 给药事件数组
 */
export function parseDosingProtocol(parsed: any): DosingEvent[] {
  const protocol = parsed.dosing_protocol;
  if (!protocol) {
    return []; // 无给药协议，返回空数组
  }

  const doseUnit = protocol.dose_unit ?? 'mg';
  const intervalUnit = protocol.interval_unit ?? 'hours';

  // 统一转换单位
  const toUg = (amount: number) => {
    switch (doseUnit.toLowerCase()) {
      case 'mg': return amount * 1000;
      case 'ug':
      case 'mcg': return amount;
      case 'g': return amount * 1000 * 1000;
      default: return amount;
    }
  };

  const toHours = (interval: number) => {
    switch (intervalUnit.toLowerCase()) {
      case 'hours':
      case 'hour':
      case 'h': return interval;
      case 'days':
      case 'day':
      case 'd': return interval * 24;
      case 'minutes':
      case 'minute':
      case 'min': return interval / 60;
      default: return interval;
    }
  };

  const events: DosingEvent[] = [];

  // 多阶段格式
  if (protocol.phases && Array.isArray(protocol.phases)) {
    let cumulativeTime = 0; // 累积时间偏移（小时）

    for (const phase of protocol.phases) {
      const nDoses = phase.n_doses ?? 1;
      const doseAmount = phase.dose_amount ?? 0;
      const interval = phase.interval ?? 24;
      const doseUg = toUg(doseAmount);
      const intervalHours = toHours(interval);

      for (let i = 0; i < nDoses; i++) {
        events.push({
          time: cumulativeTime + i * intervalHours,
          dose: doseUg
        });
      }

      // 下一阶段从当前阶段最后一次给药的下一个间隔开始
      cumulativeTime += nDoses * intervalHours;
    }
  }
  // 单阶段格式（向后兼容）
  else {
    const doseAmount = protocol.dose_amount ?? 0;
    const interval = protocol.interval ?? 24;
    const nDoses = protocol.n_doses ?? 1;
    const doseUg = toUg(doseAmount);
    const intervalHours = toHours(interval);

    for (let i = 0; i < nDoses; i++) {
      events.push({
        time: i * intervalHours,
        dose: doseUg
      });
    }
  }

  return events;
}
