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

## 点击轮操作映射

| 操作 | 作用 |
| --- | --- |
| 转动滚轮 | 菜单/列表选中移动（快速转动带惯性）；正在播放页调进度或音量 |
| 中键 | 确认进入；**正在播放页循环切换「进度 ↔ 音量」显示模式** |
| MENU | 返回上一级；在「关于」页内先退回设置列表 |
| ⏮ / ⏭ | 上一首 / 下一首 |
| ▶❚❚ | 播放 / 暂停 |

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

## ⚠️ 原生工程（`android/`）注意事项

`android/` 是 Expo CNG 生成的目录，**已被 .gitignore 忽略**，且 `npx expo prebuild --clean` 会重新生成并**覆盖**其中的手工改动。
当前工程依赖以下 3 处原生侧改动，若重新 prebuild 需重新应用：

1. **`android/gradle.properties`** — 让 Gradle 使用本机 JDK，避免去 GitHub 下载 JDK 25（国内网络会失败）：

   ```properties
   org.gradle.java.installations.paths=<Android Studio 自带 JBR 路径>,<本机 JDK 21 路径>
   # Gradle daemon 跑在 21：JDK 24+/25 限制了 System.load，会让 CMake 配置任务失败
   # （参见 gradle/gradle#31625）
   org.gradle.java.home=<本机 JDK 21 路径>
   ```

2. **`android/gradle/gradle-daemon-jvm.properties`** — 把 `toolchainVersion=25` 改为 `21`（RN 0.86 默认要求 daemon 用 JDK 25，
   而 JDK 25 上 `react-native-worklets` / `react-native-screens` 的 `configureCMakeDebug` 会因 restricted method 报错）。

3. **`android/app/build.gradle`** — 排除 MissingCore fork 的 media3，避免与 expo-audio 引入的官方 media3 重复类：

   ```groovy
   configurations.configureEach {
     exclude group: "com.github.MissingCore.media"
   }
   implementation("androidx.media3:media3-inspector:1.9.3")
   ```

> 若迁移到新机器：确保 JDK 21 与 `ANDROID_HOME` 就绪，并把这 3 处改动重新落到 `android/` 下，或考虑把它们写成 Expo config plugin 自动化。

## 数据与持久化

- 设置（重复模式 / 随机）与播放会话（队列 / 上次曲目 / 播放位置 / 音量）通过 AsyncStorage 持久化，
  下次启动恢复并停在上次位置（不自动播放）。
- 封面惰性解析后落盘为 `file://` 路径，**不存 base64**。
