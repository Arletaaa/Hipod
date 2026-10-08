import { JetBrainsMono_400Regular, JetBrainsMono_700Bold } from '@expo-google-fonts/jetbrains-mono';
import { VT323_400Regular } from '@expo-google-fonts/vt323';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AudioPlayerProvider } from '@/components/player/AudioPlayerProvider';
import { usePersistence } from '@/hooks/usePersistence';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    VT323_400Regular,
    JetBrainsMono_400Regular,
    JetBrainsMono_700Bold,
    // 中文像素字体（GNU Unifont，OFL-1.1）：由 scripts/make-pixel-font.mjs 从
    // Fontsource 的 woff2 转成 TTF —— RN 不支持 woff2，且系统字体中文没有像素感。
    UnifontPixel: require('../../assets/fonts/unifont-pixel.ttf'),
  });

  // 启动恢复 + 运行期持久化（设置 / 播放会话）
  usePersistence();

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  if (!loaded && !error) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AudioPlayerProvider>
        <Stack screenOptions={{ headerShown: false, animation: 'none' }} />
      </AudioPlayerProvider>
    </GestureHandlerRootView>
  );
}
