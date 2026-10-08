/**
 * 纯逻辑断言脚本（无需设备 / 模拟器）：
 *   npm run verify
 * 覆盖专辑·歌手分组（信息架构依赖）、时长格式化、洗牌三块纯函数。
 * 渲染与原生行为仍需在设备上验证，这里只保证逻辑正确。
 */
import { shuffleArray } from '../src/utils/array';
import { formatTime, formatTrackDuration } from '../src/utils/format';
import { buildAlbums, buildArtists } from '../src/services/libraryIndex';
import type { Track } from '../src/types/track';

let failures = 0;

function check(label: string, condition: boolean, detail?: string): void {
  if (condition) {
    console.log(`  ok   ${label}`);
    return;
  }
  failures += 1;
  console.error(`  FAIL ${label}${detail ? ` — ${detail}` : ''}`);
}

function track(partial: Partial<Track> & { id: string; title: string }): Track {
  return {
    uri: `file:///storage/emulated/0/Music/${partial.id}.mp3`,
    artist: '未知艺术家',
    album: '未知专辑',
    albumId: '未知专辑',
    duration: 180000,
    trackNumber: 0,
    ...partial,
  };
}

console.log('\n[format]');
check('formatTime(65) = 1:05', formatTime(65) === '1:05', formatTime(65));
check('formatTime(-3) 按 0 处理', formatTime(-3) === '0:00', formatTime(-3));
check('formatTrackDuration(0) = —', formatTrackDuration(0) === '—', formatTrackDuration(0));
check('formatTrackDuration(65000) = 1:05', formatTrackDuration(65000) === '1:05');

console.log('\n[shuffleArray]');
const source = [1, 2, 3, 4, 5, 6, 7, 8];
const shuffled = shuffleArray(source);
check('不修改入参', source.join(',') === '1,2,3,4,5,6,7,8');
check(
  '元素集合不变',
  [...shuffled].sort((a, b) => a - b).join(',') === source.join(','),
);
check('空数组安全', shuffleArray([]).length === 0);

console.log('\n[buildAlbums]');
const tracks: Track[] = [
  track({ id: 'a2', title: '第二首', album: '专辑一', albumArtist: '甲', trackNumber: 2 }),
  track({ id: 'a1', title: '第一首', album: '专辑一', albumArtist: '甲', trackNumber: 1 }),
  track({ id: 'a3', title: '无音轨号', album: '专辑一', albumArtist: '甲' }),
  // 同名专辑、不同专辑艺术家：必须分成两张专辑
  track({ id: 'b1', title: '另一张', album: '专辑一', albumArtist: '乙', trackNumber: 1 }),
  // 缺 albumArtist：回退到 artist
  track({ id: 'c1', title: '单人曲', album: '专辑二', artist: '丙', trackNumber: 1 }),
];

const albums = buildAlbums(tracks);
check('专辑数 = 3', albums.length === 3, `实际 ${albums.length}`);
const albumJia = albums.find((a) => a.artist === '甲' && a.name === '专辑一');
const albumYi = albums.find((a) => a.artist === '乙');
const albumBing = albums.find((a) => a.artist === '丙');
check('同名专辑按专辑艺术家分组', Boolean(albumJia) && Boolean(albumYi));
check('缺 albumArtist 时回退 artist', Boolean(albumBing));
check(
  '专辑内按音轨号排序，缺失音轨号排最后',
  albumJia?.tracks.map((t) => t.id).join(',') === 'a1,a2,a3',
  albumJia?.tracks.map((t) => t.id).join(','),
);
check(
  '专辑按「艺术家 → 专辑名」排序',
  albums.map((a) => `${a.artist}/${a.name}`).join(' | ') === '丙/专辑二 | 甲/专辑一 | 乙/专辑一',
  albums.map((a) => `${a.artist}/${a.name}`).join(' | '),
);

console.log('\n[buildArtists]');
const artists = buildArtists(albums);
check('歌手数 = 3', artists.length === 3, `实际 ${artists.length}`);
const artistJia = artists.find((a) => a.name === '甲');
check('歌手聚合其专辑', artistJia?.albums.length === 1);
check('歌手统计曲目数', artistJia?.trackCount === 3, String(artistJia?.trackCount));
check(
  '歌手按名称排序',
  artists.map((a) => a.name).join(',') === '丙,甲,乙',
  artists.map((a) => a.name).join(','),
);

console.log(`\n结果：${failures === 0 ? '全部通过' : `${failures} 项失败`}\n`);
if (failures > 0) {
  // 抛错让进程以非零码退出（不依赖 @types/node 的 process）
  throw new Error(`${failures} 项断言失败`);
}
