const { withAppBuildGradle, withDangerousMod, withGradleProperties } = require('expo/config-plugins');
const fs = require('node:fs');
const path = require('node:path');

/**
 * 把 iPod Player 依赖的 3 处原生侧改动自动化到 `expo prebuild`。
 *
 * 背景：`android/` 是被 .gitignore 忽略的 CNG 生成目录，`npx expo prebuild --clean`
 * 会重新生成并抹掉手工改动。没有这个插件，全新克隆的仓库 prebuild 后无法构建：
 *
 * 1. MissingCore fork 的 media3 与 expo-audio 使用的官方 androidx.media3 类重复
 *    → 排除 fork，统一用官方 artifact（含 inspector，metadata-retriever 需要）。
 * 2. RN 0.86 生成的 daemon JVM criteria 要求 JDK 25，而 JDK 24+/25 限制了
 *    `System.load`（gradle/gradle#31625），会让 react-native-worklets /
 *    react-native-screens 的 configureCMakeDebug 任务失败 → daemon 降到 JDK 21。
 * 3. Gradle 需要知道本机 JDK 位置，否则会尝试从 GitHub 下载 JDK 25（国内网络易失败）。
 *
 * 可用环境变量覆盖第 3 点的取值：
 * - `JAVA_HOME`（必填来源，作为 `org.gradle.java.home`）
 * - `ANDROID_STUDIO_JBR`（可选，Android Studio 自带 JBR 路径，一并加入 toolchain 搜索路径）
 */

const MEDIA3_MARKER = 'com.github.MissingCore.media';

const MEDIA3_SNIPPET = `    // 由 plugins/withAndroidBuildFixes.js 注入：排除 MissingCore fork 的 media3，
    // 避免与 expo-audio 引入的官方 androidx.media3 产生 duplicate class。
    configurations.configureEach {
        exclude group: "com.github.MissingCore.media"
    }
    implementation("androidx.media3:media3-inspector:1.9.3")
`;

/** 规范化成 Gradle 可用的正斜杠路径。 */
function toGradlePath(value) {
  return value.replace(/\\/g, '/');
}

/** 注入 media3 去重配置到 app/build.gradle 的 dependencies 块。 */
function withMedia3Deduplication(config) {
  return withAppBuildGradle(config, (cfg) => {
    if (cfg.modResults.language !== 'groovy') {
      return cfg;
    }
    const contents = cfg.modResults.contents;
    if (contents.includes(MEDIA3_MARKER)) {
      return cfg;
    }
    const anchor = 'dependencies {';
    const index = contents.indexOf(anchor);
    if (index === -1) {
      return cfg;
    }
    cfg.modResults.contents = contents.replace(anchor, `${anchor}\n${MEDIA3_SNIPPET}`);
    return cfg;
  });
}

/** 写入 Gradle daemon JVM 的 toolchain 版本（21）。 */
function withDaemonJvmCriteria(config) {
  return withDangerousMod(config, [
    'android',
    (cfg) => {
      const target = path.join(
        cfg.modRequest.platformProjectRoot,
        'gradle',
        'gradle-daemon-jvm.properties',
      );
      const patched = 'toolchainVersion=21';
      try {
        if (fs.existsSync(target)) {
          const source = fs.readFileSync(target, 'utf8');
          const next = /^toolchainVersion=.*$/m.test(source)
            ? source.replace(/^toolchainVersion=.*$/m, patched)
            : `${source.trimEnd()}\n${patched}\n`;
          if (next !== source) {
            fs.writeFileSync(target, next);
          }
        } else {
          fs.mkdirSync(path.dirname(target), { recursive: true });
          fs.writeFileSync(target, `${patched}\n`);
        }
      } catch (error) {
        // 该文件缺失或不可写不应中断 prebuild，Gradle 会用默认 daemon JVM
        console.warn(
          `[withAndroidBuildFixes] 无法写入 gradle-daemon-jvm.properties: ${String(error)}`,
        );
      }
      return cfg;
    },
  ]);
}

/** 把本机 JDK 位置写入 gradle.properties。 */
function withLocalJdkPaths(config) {
  return withGradleProperties(config, (cfg) => {
    const setProperty = (key, value) => {
      const existing = cfg.modResults.find((item) => item.type === 'property' && item.key === key);
      if (existing) {
        existing.value = value;
        return;
      }
      cfg.modResults.push({ type: 'property', key, value });
    };

    const javaHome = process.env.JAVA_HOME;
    const studioJbr = process.env.ANDROID_STUDIO_JBR;

    if (javaHome) {
      // daemon 固定在 JDK 21；缺少时交由 Gradle 自行决定
      setProperty('org.gradle.java.home', toGradlePath(javaHome));
    }

    const toolchainPaths = [studioJbr, javaHome]
      .filter((value) => typeof value === 'string' && value.length > 0)
      .map(toGradlePath);
    if (toolchainPaths.length > 0) {
      // 让 Gradle 能在本机找到所需 toolchain，避免联网下载 JDK
      setProperty('org.gradle.java.installations.paths', toolchainPaths.join(','));
    }

    return cfg;
  });
}

module.exports = function withAndroidBuildFixes(config) {
  return withLocalJdkPaths(withDaemonJvmCriteria(withMedia3Deduplication(config)));
};
