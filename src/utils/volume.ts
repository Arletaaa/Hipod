/**
 * 音量归一化：native 播放器的 volume 只接受 [0,1]，越界会抛错。
 * 抽成纯函数以便 `npm run verify` 覆盖（含 NaN / 越界 / 浮点噪声）。
 */
export function clampVolume(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.round(Math.max(0, Math.min(1, value)) * 100) / 100;
}
