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
| **经典银色**（默认） | 仿 iPod Classic：银色机身 + 纯白点击轮 + 白底蓝选中列表 + 顶部状态栏（标题 / 时间 / 播放图标 / 电量），主菜单右侧**分屏显示专辑封面** |
| 深色背光 | 初版风格：黑色金属机身 + 蓝色背光 LCD + 白色扫描线纹理 |

实现要点：

- 调色板集中在 [src/theme/palettes.ts](src/theme/palettes.ts)，组件样式用 `makeThemedStyles`
  预生成两套（[src/theme/themedStyles.ts](src/theme/themedStyles.ts)），切主题只换样式表、不重建组件树
- 扫描线只在深色风格启用；浅色风格按参考图不带纹理
- 分屏封面由 [src/components/ipod/AlbumArtPanel.tsx](src/components/ipod/AlbumArtPanel.tsx) 提供，
  复用 `resolveArtwork` 的进程级封面缓存

## 点击轮操作映射

| 操作 | 作用 |
| --- | --- |
| 转动滚轮 | 菜单/列表选中移动；正在播放页调进度或音量。**无惯性**，手指离开即停 |
| 中键 | 确认进入；**正在播放页循环切换「进度 ↔ 音量」显示模式**；**设置页进入音量调节态** |
| MENU | 返回上一级；在「关于」页内先退回设置列表 |
| ⏮ / ⏭ | 上一首 / 下一首 |
| ▶❚❚ | 播放 / 暂停 |

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
