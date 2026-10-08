import { useEffect } from 'react';

import { useLibraryStore } from '@/store/library';

/** 曲库状态 + 扫描入口（返回整个 library store，组件里解构使用）。 */
export function useMediaLibrary() {
  return useLibraryStore();
}

/** 进入曲库页时，若尚未扫描过（idle），自动触发一次扫描。 */
export function useEnsureScanned() {
  const scanStatus = useLibraryStore((s) => s.scanStatus);
  const scan = useLibraryStore((s) => s.scan);

  useEffect(() => {
    if (scanStatus === 'idle') {
      void scan();
    }
  }, [scanStatus, scan]);
}
