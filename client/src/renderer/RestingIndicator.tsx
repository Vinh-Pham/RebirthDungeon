import { useEffect } from 'react';
import { Group, Text, type SkFont } from '@shopify/react-native-skia';
import {
  cancelAnimation,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

/** Cosmetic sleeping letters; recovery is driven by the host's clock commands. */
export default function RestingIndicator({ font }: { font: SkFont }) {
  const rise = useSharedValue(0);
  const transform = useDerivedValue(() => [
    { translateX: rise.get() * 4 },
    { translateY: -rise.get() * 10 },
  ]);
  const opacity = useDerivedValue(() => 1 - rise.get() * 0.35);
  useEffect(() => {
    rise.set(withRepeat(withTiming(1, { duration: 800 }), -1));
    return () => cancelAnimation(rise);
  }, [rise]);
  return (
    <Group transform={transform} opacity={opacity}>
      <Text x={19} y={2} font={font} text="Z" color="#f7f3b7" />
      <Text x={27} y={-8} font={font} text="Z" color="#dab163" />
      <Text x={35} y={-18} font={font} text="Z" color="#f7f3b7" />
    </Group>
  );
}
