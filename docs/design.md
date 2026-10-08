# iPod 风格安卓音乐播放器 — 设计文档

> 目标：一款真机可用的安卓本地音乐播放器，还原 iPod 的实体按键交互与蓝白背光 LCD 视觉。
> 开发环境：VS Code + 真机调试，不依赖 Android Studio（仅作为可选 SDK/模拟器工具）。

---

## 1. 项目概述

### 1.1 一句话

一款「复古 iPod Classic」外观的安卓本地音乐播放器，用点击轮（click wheel）驱动整个 App。

### 1.2 目标（v1）

- 扫描手机本地音乐文件（mp3 / flac / m4a），读取标签信息（歌名 / 歌手 / 专辑 / 封面 / 时长）
- 真实播放、暂停、切歌、进度拖动、音量、随机、循环
- 完整还原 iPod 界面：金属机身 + 蓝白背光 LCD + 实体点击轮
- 全 VS Code 开发，真机预览

### 1.3 非目标（v1 不做）

在线流媒体、均衡器、歌词、云同步、播放列表编辑（v2+）。

---

## 2. 技术选型

| 关注点   | 选型                                    | 说明                                            |
| -------- | --------------------------------------- | ----------------------------------------------- |
| 框架     | React Native +**Expo**（SDK 53+） | AI 生态最好、VS Code 友好、文档齐全             |
| 路由     | expo-router                             | 文件式路由，AI 生成友好                         |
| 语言     | TypeScript                              | 全类型                                          |
| 播放     | **expo-audio**（官方）            | 支持后台播放 + 音频焦点                         |
| 本地扫描 | expo-media-library                      | 读 MediaStore 音频文件列表 + 权限               |
| 元数据   | **@missingcore/react-native-metadata-retriever**（原生·Android） | 读 MP3(ID3) / FLAC(Vorbis) / M4A(MP4) 标签 + 封面；时长由 media-library 提供 |
| 动效     | react-native-reanimated                 | 点击轮按压、屏幕转场                            |
| 手势     | react-native-gesture-handler            | 滚轮滑动选择 / 调音量                           |
| 矢量图   | react-native-svg                        | 专辑封面、按键图标                              |
| 状态     | zustand                                 | 播放器 / 曲库 / 设置全局状态                    |
| 持久化   | expo-file-system + AsyncStorage         | 保存播放进度、播放列表、设置、封面落盘          |
| 字体     | expo-font                               | 打包 VT323 + JetBrains Mono 的 ttf              |

> ⚠️ 关键点：元数据用**原生模块** `@missingcore/react-native-metadata-retriever`（**仅 Android**），不在
> Expo Go 里；且 `expo-audio` 后台播放要配前台服务。所以调试方式是「真机 + 自定义 dev build」
> （`expo prebuild` + dev client），而非 Expo Go。
> 跨平台兜底：若未来要上 iOS，改用 `@missingcore/audio-metadata`（纯 TS，iOS/Android 通用）。

---

## 3. 核心设计决策

### 决策 A：导航交互模型

| 方案                      | 描述                                                                                     | 优 / 劣                          |
| ------------------------- | ---------------------------------------------------------------------------------------- | -------------------------------- |
| **A1 全点击轮导航** | 整个 App 只靠点击轮驱动：滚轮滚动选中、中键确认、MENU 返回；曲库列表也做成 iPod 菜单样式 | 最大还原、最有辨识度；工作量较大 |
| A2 混合模式               | 曲库浏览用常规触摸列表，只有「正在播放」用点击轮控制                                     | 更快落地；但割裂感强、削弱立意   |

**选择 A1**，这是本产品的「记忆点」。

### 决策 B：锁屏 / 通知媒体控制

| 方案                | 说明                                                                                             |
| ------------------- | ------------------------------------------------------------------------------------------------ |
| B1 仅后台播放（v1） | expo-audio 后台播放即可，不做锁屏控制 / 通知条                                                   |
| B2 完整媒体控制     | 锁屏 + 通知栏显示歌名 / 封面 / 控制按钮（MediaSession + 前台服务）                               |

**确定**：v1 直接上前台服务 + 锁屏控制（即 B2 的 MediaSession 机制，用 expo-audio 自带的 `setActiveForLockScreen` 实现，不额外引 react-native-track-player）。原因：Android 上可靠后台播放本就依赖 MediaSession + 前台服务，否则约 3 分钟被系统停掉（expo/expo#38317），B1/B2 无法干净拆分。

---

## 4. 信息架构（iPod 菜单层级）

沿用真实 iPod Classic 的菜单树，全部由点击轮导航：

```
主菜单
├── 音乐 Music
│   ├── 正在播放 Now Playing
│   ├── 播放列表 Playlists
│   ├── 歌手 Artists ──▶ 专辑 ──▶ 曲目
│   ├── 专辑 Albums ──▶ 曲目
│   ├── 歌曲 Songs
│   └── 风格 Genres ──▶ 歌手 / 专辑
├── 随机播放 Shuffle Songs
└── 设置 Settings
    ├── 重复模式（关 / 单曲 / 全部）
    ├── 随机开关
    ├── 关于
    └── 重新扫描曲库
```

屏幕清单：

1. 主菜单（列表）
2. 各列表屏（菜单式，选中项居中高亮，白字蓝底，模拟 iPod 反色选中）
3. 正在播放屏
4. 设置屏

---

## 5. UI 设计系统

### 5.1 配色

```
LCD 背光底（径向）: #071426 → #0d2340 → #1a3a5f
LCD 主文字        : #e6f4ff
LCD 次级文字      : #9cc6ee
LCD 弱化文字      : #6f9cc8
LCD 边框 / 分割线 : #1e4166 / #24456b
进度条底 / 填充   : #14304d / #9cc6ee（播放头菱形 #e6f4ff）
金属机身渐变      : #2c2c32 → #17171b → #0f0f13
点击轮渐变        : #26262b → #141419 → #0d0d11
背景              : #0b0b0e（+ 蓝光晕 + 噪点）
```

### 5.2 字体

- LCD 文字：`VT323`（复古像素感）
- 按键标签：`JetBrains Mono`（MENU / 播放图标）

> RN 里用 `expo-font` 本地加载 ttf（不能像网页用 @import）。

### 5.3 点击轮 → 手势映射

| iPod 操作    | 手势 / 点击                                       |
| ------------ | ------------------------------------------------- |
| 滚轮滑动     | 列表上下选择 / 正在播放时调音量 / 菜单切换选中    |
| 中键         | 确认 / 进入                                       |
| MENU         | 返回上一级                                        |
| ⏮ / ⏭      | 上一首 / 下一首                                   |
| ▶❚❚       | 播放 / 暂停                                       |
| 滚轮快速滑动 | 惯性滚动（reanimated + gesture-handler 的 fling） |

### 5.4 动效

- 中键 / 方向键按压：`whileTap` 缩放 0.96 + 变暗（reanimated）
- 菜单项选中：反色高亮随滚轮移动平滑过渡
- 屏幕转场：LCD「淡入 + 扫描线刷新」感
- 正在播放进度：播放头菱形随时间位移

---

## 6. 数据模型 & 状态

```ts
interface Track {
  id: string
  uri: string            // file:// 路径
  title: string
  artist: string
  album: string
  albumId: string
  duration: number       // ms（media-library 返回秒，需 ×1000 换算）
  trackNumber: number
  year?: number
  artwork?: string       // 封面 file:// 路径（扫描时落盘，不存 base64）
}

interface Playlist {
  id: string
  name: string
  trackIds: string[]
}
```

```ts
// zustand
playerStore:   currentTrack | queue | isPlaying | position | shuffle | repeat | volume
libraryStore:  tracks | artists | albums | playlists | scanStatus
settingsStore: repeatMode | shuffle | 上次进度
```

---

## 7. 目录结构（新项目）

```
ipod-player/
├── app/                     # expo-router 路由
│   ├── _layout.tsx
│   ├── index.tsx            # 正在播放（iPod 界面）
│   └── menu/                # 主菜单 & 列表屏
├── src/
│   ├── components/ipod/     # ClickWheel / LcdScreen / AlbumArt / MenuList / NowPlaying
│   ├── hooks/               # usePlayer / useMediaLibrary / useWheelNav
│   ├── store/               # zustand stores
│   ├── services/            # playback.ts / metadata.ts / scanner.ts
│   ├── theme/               # colors.ts / fonts.ts
│   └── types/
├── assets/fonts/            # VT323.ttf / JetBrainsMono.ttf
├── app.json                 # 权限 & 插件配置
└── package.json
```

---

## 8. 关键流程

1. **启动扫描**：请求 `READ_MEDIA_AUDIO` → expo-media-library 拉取音频（uri/duration）→ metadata-retriever 逐个读标签+封面（分批扫描，封面落盘 file://）
   → 生成 tracks / artists / albums → 存 zustand。
2. **播放**：点曲目 → 组装队列 → expo-audio 加载 uri → 更新 `playerStore`。
3. **后台**：`setAudioModeAsync` 开后台 + `setActiveForLockScreen(true, metadata)` 上前台服务/锁屏控制。
4. **进度恢复**：退出时存 position，下次启动恢复。

---

## 9. 权限 & 配置

- `android.permission.READ_MEDIA_AUDIO`（Android 13+）/ `READ_EXTERNAL_STORAGE`（旧版）
- `FOREGROUND_SERVICE` + `FOREGROUND_SERVICE_MEDIA_PLAYBACK`（后台播放前台服务，expo-audio 插件生成）
- `app.json` 配置 expo-audio（`enableBackgroundPlayback: true`）/ media-library 插件
- metadata-retriever 依赖 JitPack 的 Media3 fork；若构建解析失败，需在根 build.gradle 加 `maven { url 'https://jitpack.io' }`

---

## 10. 开发工作流（全 VS Code）

1. `npx create-expo-app@latest` + TypeScript
2. 装依赖、`npx expo prebuild` 生成 android 工程（一次性）
3. `npx expo run:android` 装到真机 / `npx expo start` 起 dev server
4. 全程 VS Code 编辑 + 真机热更新；只在需要官方模拟器时才用 Android Studio

---

## 11. 里程碑

- **M1 骨架**：Expo 工程 + 路由 + 字体 / 主题 + 点击轮组件可点击
- **M2 扫描**：权限 + media-library + 元数据读取（分批扫描 + 惰性封面），曲库列表可浏览
- **M3 播放**：expo-audio 播放/暂停/切歌/进度/音量，接点击轮；前台服务 + 锁屏控制
- **M4 还原界面**：把现有 iPod 界面逐块移植到 RN（LCD / 专辑封面 / 滚轮细节）
- **M5 打磨**：菜单反色选中、转场、随机 / 循环、进度恢复、设置
- **M6（v2）**：播放列表编辑

---

## 12. 决策记录（已确定）

1. **决策 A**：✅ 选 **A1 全点击轮导航**（点击轮驱动整个 App）。
2. **决策 B**：✅ v1 直接上「前台服务 + 锁屏控制」（expo-audio `setActiveForLockScreen`）。
3. **元数据方案**：✅ 原生 `@missingcore/react-native-metadata-retriever`（仅 Android，符合项目安卓定位）；时长从 expo-media-library 拿，封面落盘 file:// 再存 state（惰性）。跨平台兜底：`@missingcore/audio-metadata`。
4. **扫描策略**：✅ 分批扫描 + 惰性封面（曲库约百首，属架构保障而非性能刚需）。
