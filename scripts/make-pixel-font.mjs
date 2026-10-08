/**
 * 生成中文像素字体，供 RN 使用（可重复运行）。
 *
 * 背景：LCD 文本需要**中文也有像素感**。VT323 只覆盖拉丁，中文会回退到系统字体，
 * 立刻破坏像素风；而 `react-native-svg`/RN 都无法使用 woff2，Google Fonts 上也没有
 * 简体中文像素字体（实测 CSS API 返回 400）。因此选用 **GNU Unifont**：
 *   - 像素点阵字形（CJK 16×16），有完整中日韩覆盖（cmap 5.7 万码位）
 *   - SIL OFL-1.1 授权，可随应用分发（许可证见 assets/fonts/LICENSE-Unifont.txt）
 *
 * 用法（依赖两个包，故意不写入 package.json，避免只为了换字体就长期留着依赖）：
 *   npm i --no-save --cache .npm-cache @fontsource/unifont wawoff2
 *   node scripts/make-pixel-font.mjs
 *
 * 产物：assets/fonts/unifont-pixel.ttf（约 12MB —— Unifont 把点阵存成轮廓，
 * 体积偏大；如需瘦身可用 pyftsubset 之类的子集工具，但本机 pip 无网络未采用）。
 */
import fs from 'node:fs';
import path from 'node:path';

const { decompress } = await import('wawoff2');

const SRC = path.join('node_modules', '@fontsource', 'unifont', 'files', 'unifont-latin-400-normal.woff2');
const OUT = path.join('assets', 'fonts', 'unifont-pixel.ttf');

if (!fs.existsSync(SRC)) {
  console.error(`找不到源文件：${SRC}\n请先运行：npm i --no-save --cache .npm-cache @fontsource/unifont wawoff2`);
  process.exit(1);
}

const woff2 = fs.readFileSync(SRC);
const ttf = Buffer.from(await decompress(woff2));
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, ttf);
console.log(`woff2 ${Math.round(woff2.length / 1024)}KB -> ttf ${Math.round(ttf.length / 1024)}KB  ${OUT}`);

/** 极简 sfnt 解析：收集 cmap 中的全部码位（format 4 / 12），用于校验覆盖。 */
function readCodepoints(buf) {
  const numTables = buf.readUInt16BE(4);
  let cmapOffset = 0;
  for (let i = 0; i < numTables; i++) {
    const rec = 12 + i * 16;
    if (buf.toString('ascii', rec, rec + 4) === 'cmap') cmapOffset = buf.readUInt32BE(rec + 8);
  }
  const codepoints = new Set();
  if (!cmapOffset) return codepoints;
  const n = buf.readUInt16BE(cmapOffset + 2);
  for (let i = 0; i < n; i++) {
    const off = cmapOffset + buf.readUInt32BE(cmapOffset + 4 + i * 8 + 4);
    const format = buf.readUInt16BE(off);
    if (format === 4) {
      const segX2 = buf.readUInt16BE(off + 6);
      const endBase = off + 14;
      const startBase = endBase + segX2 + 2;
      for (let s = 0; s < segX2 / 2; s++) {
        const end = buf.readUInt16BE(endBase + s * 2);
        const start = buf.readUInt16BE(startBase + s * 2);
        if (end === 0xffff) continue;
        for (let c = start; c <= end; c++) codepoints.add(c);
      }
    } else if (format === 12) {
      const groups = buf.readUInt32BE(off + 12);
      for (let g = 0; g < groups; g++) {
        const b = off + 16 + g * 12;
        const start = buf.readUInt32BE(b);
        const end = buf.readUInt32BE(b + 4);
        for (let c = start; c <= end; c++) codepoints.add(c);
      }
    }
  }
  return codepoints;
}

const cps = readCodepoints(ttf);
const probe = ['音', '乐', '设', '置', '播', '放', '扫', '描', '诊', '断', '风', '格', 'A', '1'];
console.log(`cmap 码位 ${cps.size} 个；抽样 ${probe.map((c) => `${c}${cps.has(c.codePointAt(0)) ? '✔' : '✘'}`).join(' ')}`);
