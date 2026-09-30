import { useEffect } from 'react';
import { Circle, Group } from '@shopify/react-native-skia';
import { cancelAnimation, useDerivedValue, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import type { PresentationBatch } from './animations/PresentationQueue';
import type { RenderEntity } from './types';
function Particle({ index, x, y, progress, color }: { index: number; x: number; y: number; progress: ReturnType<typeof useSharedValue<number>>; color: string }) {
  const angle = index * Math.PI * 2 / 10;
  const cx = useDerivedValue(() => x + Math.cos(angle) * (8 + progress.get() * 26));
  const cy = useDerivedValue(() => y + Math.sin(angle) * (8 + progress.get() * 26) + progress.get() * progress.get() * 12);
  const opacity = useDerivedValue(() => 1 - progress.get());
  return <Circle cx={cx} cy={cy} r={index % 2 ? 1.5 : 2.5} color={color} opacity={opacity} />;
}
export function ParticleRenderer({ active, entities }: { active?: PresentationBatch; entities: readonly RenderEntity[] }) {
  const progress = useSharedValue(1);
  useEffect(() => {
    if (active?.impacts.length || active?.deaths.length) { progress.set(0); progress.set(withDelay(350, withTiming(1, { duration: 550 }))); }
    return () => cancelAnimation(progress);
  }, [active, progress]);
  return <Group>{active?.impacts.map((impact) => {
    const target = entities.find((entity) => entity.id === impact.targetId);
    return target ? <Group key={`${target.id}:${impact.healing}`}>{Array.from({ length: 10 }, (_, index) =>
      <Particle key={index} index={index} x={target.x + 16} y={target.y + 16} progress={progress} color={impact.healing ? '#a2d58e' : '#e9bb77'} />)}</Group> : null;
  })}</Group>;
}
