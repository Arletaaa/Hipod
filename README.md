# iPod Player

复古 iPod Classic 风格的安卓本地音乐播放器：金属机身 + 蓝白背光 LCD + 实体点击轮驱动全部交互。

- 设计文档：[docs/design.md](docs/design.md)（信息架构、配色、手势映射、里程碑）
- 技术栈：Expo SDK 57 · React Native 0.86 · expo-router · expo-audio · expo-media-library · @missingcore/react-native-metadata-retriever · zustand · react-native-svg

## 环境要求

| 依赖 | 版本 / 说明 |
| --- | --- |
| Node.js | 20+ |
| JDK | **21**（Gradle daemon 必须跑在 21，见下文「原生工程注意事项」） |
| Android SDK | 已装 platform-tools / platform 36 / build-tools 36 / cmake / ndk |
| 环境变量 | `ANDROID_HOME`（如 `H:\Android\Sdk`），建议把 `%ANDROID_HOME%\platform-tools` 加入 PATH 以便直接用 `adb` |

> 本项目含自定义原生模块（`@missingcore/react-native-metadata-retriever` 等），**不能用 Expo Go**，必须使用 development build。

## 快速开始

```bash
npm install

# 构建并安装到已连接的模拟器 / 真机（首次约 5~15 分钟）
npx expo run:android

# 日常开发：起 Metro 后改代码热更新
npx expo start
```

真机调试：手机开启「开发者选项 → USB 调试」，`adb devices` 能列出设备后执行 `npx expo run:android`。

### 无需设备的校验

```bash
npx tsc --noEmit                 # 全量类型检查
npm run verify                   # 纯逻辑断言（专辑/歌手分组、时长格式化、洗牌）
```

`npm run verify` 把纯函数编译到 `.verify/` 后用 Node 直接跑断言，不需要模拟器或真机，
适合在改完分组 / 排序 / 格式化逻辑后快速回归。渲染与原生行为仍需在设备上验证。

## 目录结构

```
src/
├── app/                    # expo-router 路由
│   ├── _layout.tsx         # 根布局：字体 / 播放引擎 / 持久化
│   ├── index.tsx           # 主菜单
│   ├── music.tsx           # 音乐子菜单
│   ├── songs.tsx           # 歌曲列表
│   ├── artists.tsx         # 歌手列表
│   ├── artist.tsx          # 歌手 → 专辑
│   ├── albums.tsx          # 专辑列表
│   ├── album.tsx           # 专辑 → 曲目
│   ├── player.tsx          # 正在播放（中键切换「进度 / 音量」）
│   └── settings.tsx        # 设置
├── components/
│   ├── ipod/               # ClickWheel / LcdScreen / MenuList / IpodShell / LibraryList / Gradients
│   └── player/             # AudioPlayerProvider（native 播放器桥接）
├── hooks/                  # useWheelNav / useMediaLibrary / usePersistence
├── services/               # scanner / filesystemScan / metadata / artwork / libraryIndex / persistence
├── store/                  # zustand：player / library / settings
├── theme/                  # colors / fonts
├── types/                  # Track / RepeatMode / ScanStatus
└── utils/                  # format / array
```

## 界面风格（双主题）

设置 → **界面风格** 可切换两种风格，选择会持久化：

| 风格 | 说明 |
| --- | --- |
| **经典银色**（默认） | 仿 iPod Classic：银色机身 + 纯白点击轮 + 白底列表（选中为蓝底白字） |
| 深色背光 | 初版风格：黑色金属机身 + 蓝色背光 LCD + 白色扫描线纹理 |

实现要点：

- 调色板集中在 [src/theme/palettes.ts](src/theme/palettes.ts)，组件样式用 `makeThemedStyles`
  预生成两套（[src/theme/themedStyles.ts](src/theme/themedStyles.ts)），切主题只换样式表、不重建组件树

## 材质系统（工业复刻方向）

设计方向：**阳极氧化铝机身 + 哑光硅胶操作件 + 纯黑电子框屏幕 + 早期 TN 屏观感**。

| 部位 | 做法 |
| --- | --- |
| 屏幕边框 | 外层**黑电子框**（外框圆角 18、宽度 5px、内唇高光），屏面**内框近直角**（radius 3） |
| 复古屏 | TN 冷绿偏色 → 像素栅格 → 暗角 → 玻璃反射 → 细微噪点，字体用 VT323 |
| 机身 | 阳极氧化铝竖向渐变 + 拉丝贴图 + 上下倒角高光/阴影 + 噪点；机身内凹槽让电子框嵌进金属 |
| 点击轮 | 哑光硅胶：环面颗粒贴图**随手指转动同步旋转**；中键为凸起硅胶按键；图标微凹刻印 |

材质贴图由 [scripts/generate-textures.py](scripts/generate-textures.py) **程序化生成**（Pillow，固定随机种子，可复现）：

```bash
python scripts/generate-textures.py    # 输出到 assets/textures/
```

> ⚠️ 为什么不直接写 SVG 噪点：`react-native-svg` 15 在 Android 上**未实现 `feTurbulence`**
> （源码里直接调用 `warnUnimplementedFilter()`），程序化颗粒/拉丝只能用可平铺位图实现。

## 字体（中文像素字体）

LCD 文本统一使用 **GNU Unifont**（`assets/fonts/unifont-pixel.ttf`，OFL-1.1）：

- 它是少数**同时具备像素观感与完整中日韩覆盖**的字体（cmap 5.7 万码位），
  中文不会回退到系统字体 —— 一旦回退，像素风立刻被破坏
- 12MB（Unifont 把点阵存成轮廓，体积偏大）；如需瘦身可用 `pyftsubset` 做子集，
  或直接换成更精致的 Fusion Pixel / Zpix（见下）

重新生成：

```bash
npm i --no-save --cache .npm-cache @fontsource/unifont wawoff2
node scripts/make-pixel-font.mjs      # woff2 → TTF（RN 不支持 woff2）
```

**换成别的手写像素字体**（例如 [Fusion Pixel 缝合像素字体](https://github.com/TakWolf/fusion-pixel-font)、
[Zpix 最像素](https://github.com/SolidZORO/zpix-pixel-font)）：把单个 `.ttf` 放进
`assets/fonts/`，然后改两处 —— `src/app/_layout.tsx` 的 `useFonts` 键名、以及
`src/theme/fonts.ts` 里的 `lcd`（想只让拉丁用 VT323 就把它换回 `lcdLatin`）。

> 为什么不用 VT323 直接显示中文：VT323 只覆盖拉丁，中文会掉到系统字体；
> Google Fonts 也没有简体中文像素字体（实测 CSS API 返回 400），
> 而 Fontsource 的 Fusion Pixel 包只带 latin 子集、泛 CJK 包是按 unicode-range
> 拆分的 woff2（RN 无法按 unicode-range 回退）。

## 图标与开屏

设计：**黑色点击轮 + 中间一个音乐图标**（呼应应用内的 iPod 外观）。全部由
[scripts/make-app-icons.py](scripts/make-app-icons.py) 程序化生成（4 倍超采样绘制后降采样），
产物在 `assets/images/`：

| 文件 | 用途 |
| --- | --- |
| `icon.png` | 应用图标：银色渐变底 + 黑轮盘 + 白色双八分音符 |
| `android-icon-foreground.png` | 自适应图标前景（轮盘缩到安全区内，四周透明） |
| `android-icon-background.png` | 自适应图标背景（与机身一致的银色渐变） |
| `android-icon-monochrome.png` | 单色图标（白色轮盘、音符挖空，由系统着色） |
| `splash-icon.png` | 开屏图标，配合 `app.json` 里 `expo-splash-screen` 的 `backgroundColor` |

重新生成与生效：

```bash
python scripts/make-app-icons.py          # 改设计只改这个脚本
npx expo prebuild -p android              # 图标/开屏是原生资源，必须重新 prebuild + 构建
cd android && ./gradlew :app:assembleDebug
```

> 图标与开屏属于原生资源，改完**必须重新构建 APK**才会在桌面/启动时可见；
> 只改 JS 是看不到效果的。

## 点击轮操作映射

| 操作 | 作用 |
| --- | --- |
| 转动滚轮 | 菜单/列表选中移动；正在播放页调进度或音量。**无惯性**，手指离开即停 |
| 中键 | 确认进入；**正在播放页循环切换「进度 ↔ 音量」显示模式**；**设置页进入音量调节态** |
| MENU | 返回上一级；在「关于」页内先退回设置列表 |
| ⏮ / ⏭ | 上一首 / 下一首 |
| ▶❚❚ | 播放 / 暂停。**任一界面都可用**（有曲目在播时），由 `usePlaybackToggle` 统一处理 |

> 主菜单底部在**有曲目时**会多出一行「正在播放 + 当前曲名」（中键进入正在播放界面）；
> 曲名过长时该行做跑马灯循环滚动（[MarqueeText.tsx](src/components/ipod/MarqueeText.tsx)）。

> 设置页的音量是「两段式」：先按中键进入调节态，此时转动滚轮才改音量；
> **滚轮一松手就自动退出调节态**，要再调需重新按中键——避免浏览列表时误触改音量。

## 布局约定

所有页面共用 `IpodShell`，因此版式完全一致：

- LCD 机身固定占**上半屏**（底边落在屏幕中线附近），尺寸不随内容多少变化，
  长列表在 LCD 内部滚动，不会把机身撑高
- 点击轮在下半屏**垂直居中**，其与 LCD 的间距和与屏幕底边的间距相等（屏幕中下位置）
- 因此换页时点击轮坐标不会漂移

## 里程碑状态

- **M1 骨架** ✅ Expo 工程 + 路由 + 字体/主题 + 点击轮
- **M2 扫描** ✅ 权限 + MediaStore 分页 + 标签读取 + 惰性封面 + **文件系统兜底扫描**
- **M3 播放** ✅ 播放/暂停/切歌/进度/音量 + 后台播放 + 锁屏与通知栏控制（MediaSession 前台服务）
- **M4 界面** ✅ LCD 径向背光 + 扫描线 + 金属机身渐变 + 蓝光晕 + 轮盘渐变 + 进度菱形播放头 + 惯性滚动
- **M5 打磨** ✅ 菜单反色选中 + 随机 + 循环 + 设置页 + 状态持久化 + 播放进度恢复
- **M6（v2）** ⬜ 播放列表编辑、风格 Genres

## 曲库扫描说明

扫描为**双来源合并**（`src/services/scanner.ts`）：

1. **MediaStore**（`expo-media-library`）：正常被系统索引的音频，可直接拿到时长。
2. **文件系统兜底**（`src/services/filesystemScan.ts`）：遍历 `Music` / `Download` / `Documents` 等目录，
   发现**未被媒体索引**的音频文件（典型场景：`adb push` 或文件管理器拖入的文件，不会自动进媒体库）。
   这类曲目拿不到时长，列表显示 `—`，播放时由 native 播放器回填真实时长。

若扫描结果为 0 首，可先确认文件是否已被系统索引：

```bash
adb shell content query --uri content://media/external/audio/media --projection _id,_display_name

# 手动触发媒体扫描
adb shell content call --method scan_volume --uri content://media --arg external_primary
```

或直接把音频文件放进设备 `Music/` 目录。设置页 → 关于 会显示「媒体库 N 首 · 目录 M 首」用于定位问题。

## ⚠️ 原生工程（`android/`）与自动修补

`android/` 是 Expo CNG 生成的目录，**已被 .gitignore 忽略**，`npx expo prebuild --clean` 会整目录重新生成。
本项目依赖的 3 处原生侧改动已由 **[plugins/withAndroidBuildFixes.js](plugins/withAndroidBuildFixes.js)** 在 prebuild 时自动应用，
因此「全新克隆 → `npx expo prebuild` → `npx expo run:android`」可直接构建，无需手工改文件。

| # | 位置 | 插件做的事 | 原因 |
| --- | --- | --- | --- |
| 1 | `android/app/build.gradle` | 注入 `configurations.configureEach { exclude group: "com.github.MissingCore.media" }` 与官方 `media3-inspector` 依赖 | metadata-retriever 带入的 MissingCore fork media3 与 expo-audio 的官方 androidx.media3 类重复（duplicate class） |
| 2 | `android/gradle/gradle-daemon-jvm.properties` | `toolchainVersion` 由 25 改为 **21** | RN 0.86 默认要 daemon 跑 JDK 25，而 JDK 24+/25 限制 `System.load`（[gradle/gradle#31625](https://github.com/gradle/gradle/issues/31625)），会让 worklets/screens 的 `configureCMakeDebug` 失败 |
| 3 | `android/gradle.properties` | 写入 `org.gradle.java.home` 与 `org.gradle.java.installations.paths` | 让 Gradle 用本机 JDK，避免联网下载 JDK 25（国内网络易失败） |

插件读取的环境变量：

- `JAVA_HOME`：作为 `org.gradle.java.home`（requirement 2 要求它是 **JDK 21**）
- `ANDROID_STUDIO_JBR`（可选）：Android Studio 自带 JBR 路径，一并加入 Gradle 的 toolchain 搜索路径

验证方式（不会改动你正在用的 `android/`）：把工程复制一份、`node_modules` 用目录联接指向原目录，在副本里执行
`npx expo prebuild --platform android --no-install`，确认上述 3 处已生成、且 `gradlew --version` 显示
`Daemon JVM: Compatible with Java 21`。

## 数据与持久化

- 设置（重复模式 / 随机）与播放会话（队列 / 上次曲目 / 播放位置 / 音量）通过 AsyncStorage 持久化，
  下次启动恢复并停在上次位置（不自动播放）。
- 封面惰性解析后落盘为 `file://` 路径，**不存 base64**。
