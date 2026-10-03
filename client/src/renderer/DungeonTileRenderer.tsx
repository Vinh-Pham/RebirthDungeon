import { useMemo } from 'react';
import {
  Atlas,
  FilterMode,
  Group,
  MipmapMode,
  Rect,
  Skia,
  useImage,
} from '@shopify/react-native-skia';
import { atlasAssets } from './AtlasAssets';
import { dungeonScenery, type DungeonSceneMap, type DungeonSceneryBatch } from './DungeonScenery';

const sampling = { filter: FilterMode.Nearest, mipmap: MipmapMode.None };

export function DungeonTileRenderer({ map }: { map: DungeonSceneMap }) {
  const batches = useMemo(() => dungeonScenery(map), [map]);
  return (
    <Group>
      <Rect
        x={0}
        y={0}
        width={map.width * map.tileSize}
        height={map.height * map.tileSize}
        color="#2c1e31"
      />
      {batches.map((batch) => (
        <DungeonBatch key={batch.id} batch={batch} tileSize={map.tileSize} />
      ))}
    </Group>
  );
}

/** One atlas draw per texture, rather than a React component for every floor tile. */
function DungeonBatch({ batch, tileSize }: { batch: DungeonSceneryBatch; tileSize: number }) {
  const image = useImage(atlasAssets[batch.id]);
  const sprites = useMemo(
    () => batch.positions.map(() => Skia.XYWHRect(0, 0, 32, 32)),
    [batch.positions],
  );
  const transforms = useMemo(
    () =>
      batch.positions.map(({ x, y }) => Skia.RSXform(tileSize / 32, 0, x * tileSize, y * tileSize)),
    [batch.positions, tileSize],
  );
  return image ? (
    <Atlas image={image} sprites={sprites} transforms={transforms} sampling={sampling} />
  ) : null;
}
