import { saveArtwork } from '@missingcore/react-native-metadata-retriever';

// 进程内惰性缓存：音频 uri → 封面 file:// 路径（null 表示无封面 / 失败）
const cache = new Map<string, string | null>();

/**
 * 惰性解析封面：首次调用时把音频内嵌封面落盘为 file:// 路径并缓存。
 * saveArtwork 由原生库直接写盘返回 file:// uri，不经 base64 二次转存（符合 §6「不存 base64」）。
 * 扫描阶段不调用它，只有界面需要显示封面时才调用（惰性封面）。
 */
export async function resolveArtwork(uri: string): Promise<string | null> {
  if (cache.has(uri)) return cache.get(uri) ?? null;
  try {
    const artworkUri = await saveArtwork(uri);
    const result = artworkUri ?? null;
    cache.set(uri, result);
    return result;
  } catch {
    cache.set(uri, null);
    return null;
  }
}

export function clearArtworkCache(): void {
  cache.clear();
}
