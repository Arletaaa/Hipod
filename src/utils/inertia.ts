/**
 * 点击轮惯性滚动的纯数学部分。
 * 从组件里抽出来是为了能在没有设备的情况下用 `npm run verify` 做数值验证
 * （见 scripts/verify-logic.ts）：惯性此前有过「刚过阈值却一档都不出」的死区问题。
 */

export interface InertiaConfig {
  /** tick 间隔（毫秒）。 */
  tickMs: number;
  /** 每 tick 的速度衰减系数（0–1）。 */
  decay: number;
}

export interface InertiaState {
  /** 当前速度（档/秒，带符号）。 */
  velocity: number;
  /** 尚未攒够一档的残余位移。 */
  carry: number;
}

/**
 * 用真实时间跨度把「最近窗口内的净档数」归一化成速度（档/秒）。
 * 跨度设下限，避免采样过密时算出虚高速度。
 */
export function normalizeVelocity(
  signedSteps: number,
  spanMs: number,
  minSpanMs: number,
): number {
  const span = Math.max(minSpanMs, spanMs);
  return signedSteps / (span / 1000);
}

/**
 * 剩余可位移档数 = 未结算的 carry + 按衰减级数累积的后续位移。
 * 用于收尾判断：不足一档就没必要继续 tick。
 */
export function remainingSteps(state: InertiaState, config: InertiaConfig): number {
  if (config.decay >= 1) return Number.POSITIVE_INFINITY;
  const tail = (Math.abs(state.velocity) * (config.tickMs / 1000)) / (1 - config.decay);
  return Math.abs(state.carry) + tail;
}

/**
 * 推进一个 tick：**先**按当前速度累积位移并结算整档，**后**衰减速度。
 * 顺序不可颠倒——先衰减会让刚过阈值的速度被判定为「低于阈值」，一档都发不出。
 * @returns 本 tick 的净档数（带符号，正为顺时针）与推进后的状态
 */
export function advanceInertia(
  state: InertiaState,
  config: InertiaConfig,
): { state: InertiaState; emit: number } {
  let carry = state.carry + state.velocity * (config.tickMs / 1000);
  let emit = 0;
  while (carry >= 1) {
    carry -= 1;
    emit += 1;
  }
  while (carry <= -1) {
    carry += 1;
    emit -= 1;
  }
  return { state: { carry, velocity: state.velocity * config.decay }, emit };
}

/** 惯性是否应该结束（剩余位移不足一档）。 */
export function isInertiaFinished(state: InertiaState, config: InertiaConfig): boolean {
  return remainingSteps(state, config) < 1;
}

/** 供测试与复用：把一整段惯性跑完，返回总档数与消耗的 tick 数。 */
export function simulateInertia(
  velocity: number,
  config: InertiaConfig,
  maxTicks = 500,
): { steps: number; ticks: number } {
  let state: InertiaState = { velocity, carry: 0 };
  let steps = 0;
  let ticks = 0;
  while (ticks < maxTicks) {
    const result = advanceInertia(state, config);
    state = result.state;
    steps += result.emit;
    ticks += 1;
    if (isInertiaFinished(state, config)) break;
  }
  return { steps, ticks };
}
