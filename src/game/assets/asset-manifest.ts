/**
 * Zod schema for `assets/atlases/manifest.json`.
 * Validating at load time keeps malformed metadata from reaching Skia.
 */

import { z } from 'zod';

export const atlasEntrySchema = z.object({
  file: z.string().min(1),
  columns: z.number().int().positive(),
  rows: z.number().int().positive(),
});

export const animationSchema = z.object({
  atlas: z.string().min(1),
  row: z.number().int().min(0),
  startFrame: z.number().int().min(0),
  frameCount: z.number().int().positive(),
  fps: z.number().positive(),
  loop: z.boolean(),
});

export const gameAssetManifestSchema = z.object({
  version: z.literal(1),
  tileSize: z.number().int().positive(),
  atlases: z.record(z.string(), atlasEntrySchema),
  tileNames: z.array(z.string()),
  animations: z.record(z.string(), animationSchema),
});

export type AtlasEntry = z.infer<typeof atlasEntrySchema>;
export type AnimationEntry = z.infer<typeof animationSchema>;
export type GameAssetManifest = z.infer<typeof gameAssetManifestSchema>;

/**
 * Cross-reference checks beyond the schema: every animation must point at an
 * existing atlas row/column range, and tileNames must fit the tile atlas.
 */
export function validateManifestReferences(
  manifest: GameAssetManifest,
): string[] {
  const problems: string[] = [];

  for (const [animationName, animation] of Object.entries(
    manifest.animations,
  )) {
    const atlas = manifest.atlases[animation.atlas];
    if (!atlas) {
      problems.push(
        `animation '${animationName}': references unknown atlas '${animation.atlas}'`,
      );
      continue;
    }
    if (animation.row >= atlas.rows) {
      problems.push(
        `animation '${animationName}': row ${animation.row} is outside atlas '${animation.atlas}' (${atlas.rows} rows)`,
      );
    }
    if (animation.startFrame + animation.frameCount > atlas.columns) {
      problems.push(
        `animation '${animationName}': frames ${animation.startFrame}..${animation.startFrame + animation.frameCount - 1} ` +
          `exceed atlas '${animation.atlas}' width (${atlas.columns} columns)`,
      );
    }
  }

  const tileAtlas = manifest.atlases['dungeon-tiles'];
  if (
    tileAtlas &&
    manifest.tileNames.length > tileAtlas.columns * tileAtlas.rows
  ) {
    problems.push(
      `manifest: tileNames has ${manifest.tileNames.length} entries but the dungeon-tiles atlas only holds ` +
        `${tileAtlas.columns * tileAtlas.rows} tiles`,
    );
  }

  return problems;
}
