import { Image } from 'expo-image';
import { useState } from 'react';
import { gameImageSource, NO_GAME_IMAGE, type GameImageReference } from './gameImages';

/** Decorative artwork: the adjacent name remains the accessible source of truth. */
export default function GameImage({ kind, id, size = 48 }: GameImageReference & { size?: number }) {
  return <Artwork key={`${kind}/${id}`} kind={kind} id={id} size={size} />;
}

function Artwork({ kind, id, size }: GameImageReference & { size: number }) {
  const [failed, setFailed] = useState(false);
  return (
    <Image
      source={failed ? NO_GAME_IMAGE : gameImageSource({ kind, id })}
      accessible={false}
      accessibilityLabel=""
      contentFit="contain"
      transition={0}
      recyclingKey={`${kind}/${id}`}
      cachePolicy="memory-disk"
      onError={() => setFailed(true)}
      style={{ width: size, height: size, flexShrink: 0, borderRadius: 6 }}
    />
  );
}
