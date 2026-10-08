const { withAppBuildGradle } = require('expo/config-plugins');
const fs = require('node:fs');
const path = require('node:path');

/**
 * 注入固定签名配置，让 release 包不再使用 debug 密钥。
 *
 * 为什么必须是插件：`android/` 是 CNG 生成目录（已 gitignore），
 * 手写进 `app/build.gradle` 的 signingConfigs 会在下次 `expo prebuild` 时被抹掉。
 *
 * 密钥与口令来源（按优先级）：
 * 1. 环境变量 `HIPOD_KEYSTORE` / `HIPOD_KEYSTORE_PASSWORD` / `HIPOD_KEY_ALIAS` / `HIPOD_KEY_PASSWORD`
 * 2. `<repo>/keys/keystore.properties`（已 gitignore，**需要自行备份**）
 *
 * 找不到配置时插件静默跳过，工程仍能用模板自带的 debug 密钥构建（便于全新克隆）。
 *
 * 另外：debug 与 release 都用同一把密钥签名，这样在「开发用的 debug 包」和
 * 「分享用的 release 包」之间来回切换时**不需要先卸载**（签名不同会装不上）。
 */

const MARKER = 'HiPodReleaseSigning';

function readSigningConfig(projectRoot) {
  const file = path.join(projectRoot, 'keys', 'keystore.properties');
  const fromFile = {};
  if (fs.existsSync(file)) {
    for (const raw of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith('#')) continue;
      const eq = line.indexOf('=');
      if (eq > 0) fromFile[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
    }
  }
  const pick = (envKey, fileKey) => process.env[envKey] || fromFile[fileKey];
  const storeFile = pick('HIPOD_KEYSTORE', 'storeFile');
  return {
    // Gradle 里用绝对路径，避免与 android/app 的相对层级耦合
    storeFile: storeFile ? path.resolve(projectRoot, storeFile).replace(/\\/g, '/') : undefined,
    storePassword: pick('HIPOD_KEYSTORE_PASSWORD', 'storePassword'),
    keyAlias: pick('HIPOD_KEY_ALIAS', 'keyAlias'),
    keyPassword: pick('HIPOD_KEY_PASSWORD', 'keyPassword'),
  };
}

module.exports = function withReleaseSigning(config) {
  const projectRoot = config.modRequest?.projectRoot ?? process.cwd();
  const signing = readSigningConfig(projectRoot);

  if (!signing.storeFile || !signing.storePassword || !signing.keyAlias || !signing.keyPassword) {
    console.warn(
      '[withReleaseSigning] 未找到签名配置（keys/keystore.properties 或 HIPOD_* 环境变量），' +
        'release 将继续使用模板的 debug 密钥。',
    );
    return config;
  }
  if (!fs.existsSync(signing.storeFile)) {
    console.warn(`[withReleaseSigning] 密钥文件不存在：${signing.storeFile}，已跳过。`);
    return config;
  }

  return withAppBuildGradle(config, (cfg) => {
    if (cfg.modResults.language !== 'groovy') return cfg;
    let contents = cfg.modResults.contents;
    if (contents.includes(MARKER)) return cfg;

    const block = `    // ${MARKER}：由 plugins/withReleaseSigning.js 注入（勿手改，prebuild 会重写）
    release {
        storeFile file('${signing.storeFile}')
        storePassword '${signing.storePassword}'
        keyAlias '${signing.keyAlias}'
        keyPassword '${signing.keyPassword}'
    }
`;

    const anchor = 'signingConfigs {';
    const at = contents.indexOf(anchor);
    if (at === -1) {
      console.warn('[withReleaseSigning] build.gradle 里找不到 signingConfigs 块，已跳过。');
      return cfg;
    }
    contents = contents.replace(anchor, `${anchor}\n${block}`);

    // debug / release 两个 buildType 都改用固定密钥（见文件头说明）
    contents = contents.replace(
      /(\n\s*debug\s*\{[^}]*?signingConfig\s+)signingConfigs\.debug/,
      '$1signingConfigs.release',
    );
    contents = contents.replace(
      /(\n\s*release\s*\{[^}]*?signingConfig\s+)signingConfigs\.debug/,
      '$1signingConfigs.release',
    );

    cfg.modResults.contents = contents;
    return cfg;
  });
};
