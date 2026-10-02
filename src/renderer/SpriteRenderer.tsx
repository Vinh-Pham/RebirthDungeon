import { useEffect, useMemo } from 'react';
import { Atlas, Group, Rect, Skia, Text, useFont, type SkImage, FilterMode, MipmapMode } from '@shopify/react-native-skia';
import { cancelAnimation, useDerivedValue, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import type { RenderEntity } from './types';
import type { SpriteAtlas } from '../data/schemas/content';
import type { PresentationBatch } from './animations/PresentationQueue';
import { spriteRect } from './Atlas';

const white = [Skia.Color('white')];
const sampling = { filter: FilterMode.Nearest, mipmap: MipmapMode.None };

export function SpriteRenderer({ entity, image, atlas, active, selected, targetable = false }: {
  entity: RenderEntity; image: SkImage; atlas: SpriteAtlas; active?: PresentationBatch; selected: boolean; targetable?: boolean;
}) {
  const idle = useSharedValue(0);
  const lunge = useSharedValue(0);
  const flash = useSharedValue(0);
  const opacity = useSharedValue(1);
  const hp = useSharedValue(entity.health / entity.maxHealth);
  const numberOpacity = useSharedValue(0);
  const numberRise = useSharedValue(0);
  const font = useFont(require('../../assets/fonts/SpaceMono-Regular.ttf'), 11);
  const sourceFrames = useMemo(() => (entity.sprite.idleFrames ?? [entity.sprite.frame]).map((frame) => spriteRect(atlas, frame)), [atlas, entity.sprite]);
  const frames = useDerivedValue(() => [sourceFrames[Math.min(sourceFrames.length - 1, Math.floor(idle.get() * sourceFrames.length))]]);
  const transforms = useMemo(() => [Skia.RSXform(1, 0, 0, 0)], []);
  const transform = useDerivedValue(() => [{ translateX: entity.x + lunge.get() }, { translateY: entity.y }]);
  const hpWidth = useDerivedValue(() => 24 * hp.get());
  const numberY = useDerivedValue(() => -6 + numberRise.get());
  const impact = active?.impacts.find((impact) => impact.targetId === entity.id);
  const missed = !!active?.missed && active.targetId === entity.id;
  const label = impact ? `${impact.healing ? '+' : '−'}${impact.amount}${impact.critical ? '!' : ''}` : missed ? 'MISS' : '';

  useEffect(() => {
    idle.set(withRepeat(withTiming(1, { duration: 600 }), -1, true));
    return () => { cancelAnimation(idle); };
  }, [idle]);
  useEffect(() => {
    if (!active) return;
    if (active.sourceId === entity.id && active.sourceId !== active.targetId) {
      lunge.set(withSequence(withTiming(entity.side === 'player' ? 16 : -16, { duration: 170 }), withTiming(0, { duration: 230 })));
    }
    if (impact) {
      hp.set(withDelay(400, withTiming(impact.healthAfter / impact.maxHealth, { duration: 280 })));
      if (!impact.healing) flash.set(withDelay(350, withSequence(withTiming(1, { duration: 30 }), withTiming(0, { duration: 260 }))));
    }
    if (impact || missed) {
      numberRise.set(0); numberOpacity.set(0);
      numberRise.set(withDelay(350, withTiming(-22, { duration: 540 })));
      numberOpacity.set(withDelay(350, withSequence(withTiming(1, { duration: 50 }), withTiming(1, { duration: 300 }), withTiming(0, { duration: 190 }))));
    }
    if (active.deaths.includes(entity.id)) {
      cancelAnimation(idle);
      opacity.set(withDelay(650, withTiming(0, { duration: 280 })));
    }
  }, [active, entity.id, entity.side, flash, hp, idle, impact, lunge, missed, numberOpacity, numberRise, opacity]);
  useEffect(() => () => {
    [lunge, flash, opacity, hp, numberOpacity, numberRise].forEach(cancelAnimation);
  }, [lunge, flash, opacity, hp, numberOpacity, numberRise]);

  return (
    <Group transform={transform} opacity={opacity}>
      <Rect x={6} y={29} width={21} height={3} color="#0b1216" opacity={0.6} />
      {selected || targetable ? <Rect x={-2} y={-2} width={36} height={38} style="stroke" strokeWidth={1} color={selected ? '#dbb675' : '#9fbd7e'} /> : null}
      <Atlas image={image} sprites={frames} transforms={transforms} sampling={sampling} />
      <Group opacity={flash}><Atlas image={image} sprites={frames} transforms={transforms} colors={white} colorBlendMode="srcATop" sampling={sampling} /></Group>
      <Rect x={4} y={35} width={24} height={3} color="#10171c" />
      <Rect x={4} y={35} width={hpWidth} height={3} color={entity.side === 'player' ? '#d4ae70' : '#9fbd7e'} />
      {font ? <Group opacity={numberOpacity}><Text x={1} y={numberY} text={label} font={font} color={impact?.healing ? '#a2d58e' : '#f4dfb9'} /></Group> : null}
    </Group>
  );
}
