import { useCallback, useEffect, useState } from 'react';

export interface WheelNavOptions {
  count: number;
  onEnter?: (index: number) => void;
}

/**
 * 点击轮驱动的列表选中状态：
 * - move(±1) 由滚轮转动或 ⏮/⏭ 触发，在 [0, count-1] 间循环（越界回绕）
 * - enter() 由中键触发，回调当前选中项
 */
export function useWheelNav({ count, onEnter }: WheelNavOptions) {
  const [selected, setSelected] = useState(0);

  // count 缩小（如重扫后曲目变少）时夹取选中项，避免越界
  useEffect(() => {
    setSelected((prev) => {
      if (count <= 0) return 0;
      return prev >= count ? count - 1 : prev;
    });
  }, [count]);

  const move = useCallback(
    (delta: number) => {
      setSelected((prev) => {
        if (count <= 0) return 0;
        const next = prev + delta;
        if (next < 0) return count - 1;
        if (next >= count) return 0;
        return next;
      });
    },
    [count],
  );

  const next = useCallback(() => move(1), [move]);
  const prev = useCallback(() => move(-1), [move]);

  const enter = useCallback(() => {
    if (count > 0 && selected >= 0 && selected < count) {
      onEnter?.(selected);
    }
  }, [count, selected, onEnter]);

  return { selected, move, next, prev, enter };
}
