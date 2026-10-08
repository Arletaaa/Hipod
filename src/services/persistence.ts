import AsyncStorage from '@react-native-async-storage/async-storage';

import type { PersistedSession } from '@/store/player';
import { isThemeName, type ThemeName } from '@/theme/palettes';
import type { RepeatMode, Track } from '@/types/track';

const SETTINGS_KEY = 'ipod-player:settings:v1';
const SESSION_KEY = 'ipod-player:session:v1';

export interface PersistedSettings {
  repeatMode: RepeatMode;
  shuffle: boolean;
  theme: ThemeName;
}

const REPEAT_MODES: RepeatMode[] = ['off', 'one', 'all'];

function isRepeatMode(value: unknown): value is RepeatMode {
  return typeof value === 'string' && (REPEAT_MODES as string[]).includes(value);
}

/**
 * 校验持久化的曲目对象：损坏 / 旧版本数据一律丢弃，
 * 只保留字段完整的条目，避免脏数据把启动流程带崩。
 */
function isTrack(value: unknown): value is Track {
  if (typeof value !== 'object' || value === null) return false;
  const t = value as Record<string, unknown>;
  return (
    typeof t.id === 'string' &&
    typeof t.uri === 'string' &&
    typeof t.title === 'string' &&
    typeof t.artist === 'string' &&
    typeof t.album === 'string' &&
    typeof t.duration === 'number'
  );
}

export async function loadSettings(): Promise<PersistedSettings | null> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const data = parsed as Record<string, unknown>;
    return {
      repeatMode: isRepeatMode(data.repeatMode) ? data.repeatMode : 'off',
      shuffle: data.shuffle === true,
      // 旧版本设置里没有 theme 字段：默认给「经典银色」（浅色）风格
      theme: isThemeName(data.theme) ? data.theme : 'light',
    };
  } catch {
    return null;
  }
}

export async function saveSettings(settings: PersistedSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // 持久化失败不应影响播放，静默忽略
  }
}

export async function loadSession(): Promise<PersistedSession | null> {
  try {
    const raw = await AsyncStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const data = parsed as Record<string, unknown>;
    const queue = Array.isArray(data.queue) ? data.queue.filter(isTrack) : [];
    if (queue.length === 0) return null;
    const currentIndex =
      typeof data.currentIndex === 'number' && Number.isFinite(data.currentIndex)
        ? data.currentIndex
        : 0;
    const positionSeconds =
      typeof data.positionSeconds === 'number' && Number.isFinite(data.positionSeconds)
        ? Math.max(0, data.positionSeconds)
        : 0;
    const volume =
      typeof data.volume === 'number' && Number.isFinite(data.volume) ? data.volume : 1;
    return { queue, currentIndex, positionSeconds, volume };
  } catch {
    return null;
  }
}

export async function saveSession(session: PersistedSession): Promise<void> {
  try {
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // 同上：持久化失败静默忽略
  }
}

export async function clearSession(): Promise<void> {
  try {
    await AsyncStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
}
