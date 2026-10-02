import { useEffect } from 'react';
import { Circle, Group } from '@shopify/react-native-skia';
import {
  cancelAnimation,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import type { PresentationBatch } from './animations/PresentationQueue';
import type { Skill } from '../data/schemas/content';
import type { RenderEntity } from './types';

const colors = {
  physical: ['#97aaa9', '#d5dddd'],
  fire: ['#d87947', '#f1c476'],
  ice: ['#719fba', '#b9deee'],
  lightning: ['#9e91cc', '#dbd5f1'],
};

export function EffectRenderer({
  active,
  entities,
  element = 'fire',
}: {
  active?: PresentationBatch;
  entities: readonly RenderEntity[];
  element?: Skill['element'];
}) {
  const progress = useSharedValue(0);
  const opacity = useSharedValue(0);
  const source = entities.find((entity) => entity.id === active?.sourceId);
  const target = entities.find((entity) => entity.id === active?.targetId);
  const healing = !!active?.impacts.some((impact) => impact.healing);
  const x = useDerivedValue(
    () => (source?.x ?? 0) + 16 + ((target?.x ?? 0) - (source?.x ?? 0)) * progress.get(),
  );
  const y = useDerivedValue(
    () => (source?.y ?? 0) + 16 + ((target?.y ?? 0) - (source?.y ?? 0)) * progress.get(),
  );
  useEffect(() => {
    if (!active || active.animation !== 'skill') return;
    progress.set(0);
    opacity.set(0);
    progress.set(withDelay(120, withTiming(1, { duration: 250 })));
    opacity.set(
      withSequence(
        withTiming(1, { duration: 120 }),
        withTiming(1, { duration: 250 }),
        withTiming(0, { duration: 170 }),
      ),
    );
  }, [active, progress, opacity]);
  useEffect(
    () => () => {
      cancelAnimation(progress);
      cancelAnimation(opacity);
    },
    [progress, opacity],
  );
  return (
    <Group opacity={opacity}>
      <Circle
        cx={x}
        cy={y}
        r={healing ? 14 : 7}
        color={healing ? '#9fcd86' : colors[element][0]}
        opacity={0.45}
      />
      <Circle cx={x} cy={y} r={healing ? 9 : 4} color={healing ? '#c4e3b4' : colors[element][1]} />
    </Group>
  );
}
