import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import manifestJson from '@/assets/atlases/manifest.json';
import {
  gameAssetManifestSchema,
  validateManifestReferences,
} from '@/game/assets/asset-manifest';

/** Reads the IHDR of a PNG to verify actual atlas dimensions. */
function pngSize(path: string): { width: number; height: number } {
  const buffer = readFileSync(path);
  expect(
    buffer
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  ).toBe(true);
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

describe('game asset manifest', () => {
  it('validates the bundled manifest', () => {
    const parsed = gameAssetManifestSchema.safeParse(manifestJson);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(validateManifestReferences(parsed.data)).toEqual([]);
    }
  });

  it('matches the actual generated atlas dimensions', () => {
    const manifest = gameAssetManifestSchema.parse(manifestJson);
    for (const [name, entry] of Object.entries(manifest.atlases)) {
      const size = pngSize(
        join(process.cwd(), 'assets', 'atlases', entry.file),
      );
      expect(size.width).toBe(entry.columns * manifest.tileSize);
      expect(size.height).toBe(entry.rows * manifest.tileSize);
      void name;
    }
  });

  it('rejects an unsupported version', () => {
    const parsed = gameAssetManifestSchema.safeParse({
      ...manifestJson,
      version: 2,
    });
    expect(parsed.success).toBe(false);
  });
});

describe('validateManifestReferences', () => {
  const base = gameAssetManifestSchema.parse(manifestJson);

  it('flags animations referencing an unknown atlas', () => {
    const problems = validateManifestReferences({
      ...base,
      animations: {
        'ghost/idle': {
          atlas: 'ghosts',
          row: 0,
          startFrame: 0,
          frameCount: 4,
          fps: 5,
          loop: true,
        },
      },
    });
    expect(problems).toEqual([
      expect.stringContaining("references unknown atlas 'ghosts'"),
    ]);
  });

  it('flags rows outside the atlas grid', () => {
    const problems = validateManifestReferences({
      ...base,
      animations: {
        ...base.animations,
        'hero/idle': { ...base.animations['hero/idle'], row: 9 },
      },
    });
    expect(problems).toEqual([
      expect.stringContaining('row 9 is outside atlas'),
    ]);
  });

  it('flags frame ranges wider than the atlas', () => {
    const problems = validateManifestReferences({
      ...base,
      animations: {
        ...base.animations,
        'slime/idle': {
          ...base.animations['slime/idle'],
          startFrame: 2,
          frameCount: 4,
        },
      },
    });
    expect(problems).toEqual([expect.stringContaining('exceed atlas')]);
  });

  it('flags tile name tables larger than the tile atlas', () => {
    const problems = validateManifestReferences({
      ...base,
      tileNames: Array.from({ length: 100 }, (_, i) => `tile-${i}`),
    });
    expect(problems).toEqual([
      expect.stringContaining('tileNames has 100 entries'),
    ]);
  });
});
