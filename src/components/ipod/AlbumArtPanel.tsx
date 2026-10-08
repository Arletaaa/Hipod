import { Image } from 'expo-image';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { usePalette } from '@/hooks/useTheme';
import { resolveArtwork } from '@/services/artwork';
import { usePlayerStore } from '@/store/player';
import { fonts } from '@/theme/fonts';
import type { Palette } from '@/theme/palettes';

/**
 * 主菜单右侧的分屏封面区（iPod Classic 主菜单的经典布局）：
 * 显示当前播放曲目的内嵌封面；没有封面或没有播放内容时显示占位符。
 */
export function AlbumArtPanel() {
  const palette = usePalette();
  const styles = useMemo(() => makeStyles(palette), [palette]);

  const track = usePlayerStore((s) => s.queue[s.currentIndex] ?? null);
  const uri = track?.uri ?? null;
  const [artwork, setArtwork] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setArtwork(null);
    if (uri) {
      void resolveArtwork(uri).then((resolved) => {
        if (!cancelled) setArtwork(resolved);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [uri]);

  return (
    <View style={styles.panel}>
      {artwork ? (
        <Image source={{ uri: artwork }} style={styles.image} contentFit="cover" />
      ) : (
        <Text style={styles.placeholder}>♪</Text>
      )}
    </View>
  );
}

function makeStyles(palette: Palette) {
  return StyleSheet.create({
    panel: {
      flex: 1,
      marginLeft: 8,
      borderRadius: 4,
      backgroundColor: palette.artworkPanel,
      borderWidth: 1,
      borderColor: palette.lcd.divider,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    image: {
      width: '100%',
      height: '100%',
    },
    placeholder: {
      color: palette.lcd.textMuted,
      fontFamily: fonts.lcd,
      fontSize: 48,
    },
  });
}
