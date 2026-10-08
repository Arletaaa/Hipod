/** 秒 → "m:ss"（分钟不带前导零，秒补零）。负值按 0 处理。 */
export function formatTime(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * 毫秒 → "m:ss"；未知时长（0）显示「—」。
 * 仅文件系统兜底发现的曲目（未被媒体索引）会缺时长，播放时由 native 回填。
 */
export function formatTrackDuration(ms: number): string {
  return ms > 0 ? formatTime(ms / 1000) : '—';
}
