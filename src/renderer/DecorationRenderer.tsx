import { useMemo } from 'react';
import { Atlas, FilterMode, MipmapMode, Skia, useImage } from '@shopify/react-native-skia';
import type { SpriteAtlas } from '../data/schemas/content';
import type { WorldMap, WorldDecoration } from '../data/schemas/world';
import { atlasAssets } from './AtlasAssets';
import { spriteRect } from './Atlas';

/** Batch repeated props by image; their ground position determines player occlusion. */
export function DecorationRenderer({
  map,
  atlases,
  playerY,
  foreground,
}: {
  map: WorldMap;
  atlases: SpriteAtlas[];
  playerY: number;
  foreground: boolean;
}) {
  const groups = useMemo(() => {
    const byAtlas = new Map<string, WorldDecoration[]>();
    for (const decoration of map.decorations) {
      const inFront = decoration.y + decoration.size > playerY + 1;
      if (inFront !== foreground) continue;
      const group = byAtlas.get(decoration.sprite.atlas) ?? [];
      group.push(decoration);
      byAtlas.set(decoration.sprite.atlas, group);
    }
    return [...byAtlas.entries()];
  }, [map.decorations, playerY, foreground]);
  return (
    <>
      {groups.map(([id, decorations]) => (
        <DecorationBatch
          key={id}
          atlas={atlases.find((atlas) => atlas.id === id)!}
          decorations={decorations}
          tileSize={map.tileSize}
        />
      ))}
    </>
  );
}

function DecorationBatch({
  atlas,
  decorations,
  tileSize,
}: {
  atlas: SpriteAtlas;
  decorations: WorldDecoration[];
  tileSize: number;
}) {
  const source = atlasAssets[atlas.id];
  if (!source) throw new Error(`No bundled image registered for atlas: ${atlas.id}`);
  const image = useImage(source);
  const sprites = useMemo(
    () => decorations.map((decoration) => spriteRect(atlas, decoration.sprite.frame)),
    [atlas, decorations],
  );
  const transforms = useMemo(
    () =>
      decorations.map((decoration) =>
        Skia.RSXform(
          (decoration.size * tileSize) / atlas.frameWidth,
          0,
          decoration.x * tileSize,
          decoration.y * tileSize,
        ),
      ),
    [atlas.frameWidth, decorations, tileSize],
  );
  return image ? (
    <Atlas
      image={image}
      sprites={sprites}
      transforms={transforms}
      sampling={{ filter: FilterMode.Nearest, mipmap: MipmapMode.None }}
    />
  ) : null;
}
