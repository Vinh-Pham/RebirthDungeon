import type { Immutable } from '../engine/immutableState';
import type { GameContent } from '../data/schemas/content';
import type { WorldMap } from '../data/schemas/world';
import type { DungeonSnapshot } from '../engine/dungeon/Dungeon';

/** Resolve art at display time so saved dungeon blueprints receive current sprites. */
export function worldObjectSprite(
  object: Immutable<WorldMap['objects'][number]>,
  content: Pick<GameContent, 'maps' | 'enemies' | 'atlases'>,
  dungeon?: DungeonSnapshot,
  claimed = false,
) {
  if (object.sprite) return object.sprite;
  if (object.kind === 'encounter') {
    const encounter =
      dungeon?.blueprint.encounters.find((entry) => entry.objectId === object.id)?.map ??
      content.maps.find((map) => map.id === object.encounterMap);
    const enemy = encounter?.spawns.find((spawn) => spawn.kind === 'enemy');
    return enemy
      ? content.enemies.find((entry) => entry.id === enemy.definitionId)?.sprite
      : undefined;
  }
  // Selecting one final chest claims all alternatives, but only that chest opens.
  const opened = dungeon ? dungeon.opened.includes(object.id) : claimed;
  let atlas: string | undefined;
  switch (object.kind) {
    case 'chest':
    case 'mimic': // Unrevealed ambushes retain exactly the ordinary chest disguise.
      atlas = opened ? 'dungeon-chest-open' : 'dungeon-chest';
      break;
    case 'finalChest':
      atlas = opened ? 'sealed-treasure-chest-open' : 'sealed-treasure-chest';
      break;
    case 'portal':
      atlas = object.dungeonId
        ? object.blocked
          ? 'dungeon-boss-gate'
          : 'dungeon-boss-gate-open'
        : 'dungeon-exit';
      break;
    case 'gate':
      if (object.gateType)
        atlas = `dungeon-${object.gateType}-gate${object.blocked ? '' : '-open'}`;
      break;
    case 'key':
      if (object.keyType) atlas = `dungeon-${object.keyType}-key`;
      break;
    case 'statue':
    case 'altar':
    case 'dungeonEntrance':
      atlas = 'goddess-altar';
      break;
    case 'fountain':
      atlas = 'moon-fountain';
      break;
    case 'rest':
      atlas = 'garden-bench';
      break;
  }
  return atlas && content.atlases.some((entry) => entry.id === atlas)
    ? { atlas, frame: 0 }
    : undefined;
}
