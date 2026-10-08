// §6 数据模型 —— 与 design.md 保持一致
// 注：albumArtist 为 design.md 之外的扩展字段，用于「专辑 / 歌手」分组的正确性
// （合辑、合作曲目按专辑艺术家归并），缺失时回退到 artist。
export interface Track {
  id: string;
  uri: string; // file:// 路径
  title: string;
  artist: string;
  albumArtist?: string;
  album: string;
  albumId: string;
  duration: number; // ms（media-library 返回秒，需 ×1000）
  trackNumber: number;
  year?: number;
  artwork?: string; // 封面 file:// 路径（扫描时落盘，不存 base64）
}

export interface Album {
  id: string;
  name: string;
  artist: string;
  trackIds: string[];
}

export interface Artist {
  id: string;
  name: string;
  albumIds: string[];
}

export interface Playlist {
  id: string;
  name: string;
  trackIds: string[];
}

export type RepeatMode = 'off' | 'one' | 'all';

export type ScanStatus = 'idle' | 'requesting' | 'scanning' | 'done' | 'error';
