/**
 * 纯逻辑断言脚本（无需设备 / 模拟器）：
 *   npm run verify
 * 覆盖专辑·歌手分组（信息架构依赖）、时长格式化、洗牌三块纯函数。
 * 渲染与原生行为仍需在设备上验证，这里只保证逻辑正确。
 */
import { shuffleArray } from '../src/utils/array';
import { formatTime, formatTrackDuration } from '../src/utils/format';
import {
  advanceInertia,
  isInertiaFinished,
  normalizeVelocity,
  remainingSteps,
  simulateInertia,
  type InertiaConfig,
} from '../src/utils/inertia';
import { clampVolume } from '../src/utils/volume';
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

console.log('\n[clampVolume]');
check('NaN → 1', clampVolume(Number.NaN) === 1);
check('越界上钳制 1.5 → 1', clampVolume(1.5) === 1);
check('越界下钳制 -0.2 → 0', clampVolume(-0.2) === 0);
check('保留两位小数', clampVolume(0.1234) === 0.12, String(clampVolume(0.1234)));
check('0.5 原样返回', clampVolume(0.5) === 0.5);

console.log('\n[inertia]');
// 与 ClickWheel 保持一致：tick 60ms、衰减 0.78、触发阈值 4 档/秒
const INERTIA: InertiaConfig = { tickMs: 60, decay: 0.78 };
check(
  '速度按真实跨度归一化',
  normalizeVelocity(2, 200, 80) === 10,
  String(normalizeVelocity(2, 200, 80)),
);
check(
  '跨度低于下限时按下限计算（避免虚高）',
  normalizeVelocity(1, 10, 80) === 12.5,
  String(normalizeVelocity(1, 10, 80)),
);
check('剩余位移随 carry 增加', remainingSteps({ velocity: 0, carry: 0.4 }, INERTIA) === 0.4);

// 死区回归：此前 v∈[4,4.88) 会一档都不出；现在任何达到阈值的速度都必须至少走一档
const deadZone: number[] = [];
for (let v = 4; v <= 12; v += 0.25) {
  const { steps } = simulateInertia(v, INERTIA);
  if (steps < 1) deadZone.push(v);
}
check('阈值以上不存在静默死区（4→12 档/秒逐点扫描）', deadZone.length === 0, deadZone.join(','));

const minimumFlick = simulateInertia(4, INERTIA);
check('最小触发速度至少走一档', minimumFlick.steps >= 1, String(minimumFlick.steps));

const strongFlick = simulateInertia(20, INERTIA);
check('速度越大走得越多', strongFlick.steps > minimumFlick.steps);
check(
  '位移总量接近理论值 v·t/(1-decay)',
  Math.abs(strongFlick.steps - (20 * 0.06) / (1 - 0.78)) <= 1,
  `实际 ${strongFlick.steps}，理论 ${((20 * 0.06) / (1 - 0.78)).toFixed(2)}`,
);
check('惯性一定会收敛（不会无限 tick）', strongFlick.ticks < 200, String(strongFlick.ticks));

// 反向转动（逆时针）应产生负位移
const reverse = simulateInertia(-8, INERTIA);
check('逆时针产生负位移', reverse.steps < 0, String(reverse.steps));

// 单 tick 结算顺序：先结算再衰减，因此首 tick 就必须可能出档
const firstTick = advanceInertia({ velocity: 20, carry: 0 }, INERTIA);
check('单个 tick 可结算多档', firstTick.emit >= 1, String(firstTick.emit));
check('衰减后速度变小', Math.abs(firstTick.state.velocity) < 20);
check(
  'carry 始终小于一档',
  Math.abs(firstTick.state.carry) < 1,
  String(firstTick.state.carry),
);
check('剩余位移不足一档即结束', isInertiaFinished({ velocity: 0.01, carry: 0.2 }, INERTIA));

console.log(`\n结果：${failures === 0 ? '全部通过' : `${failures} 项失败`}\n`);
if (failures > 0) {
  // 抛错让进程以非零码退出（不依赖 @types/node 的 process）
  throw new Error(`${failures} 项断言失败`);
}
