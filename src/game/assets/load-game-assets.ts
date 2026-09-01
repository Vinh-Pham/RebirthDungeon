/**
 * Loads and validates every asset the renderer needs. Failures are collected
 * into a single typed error listing each problem with actionable names, so a
 * broken/missing asset is obvious during development instead of a black
 * screen (or silent fallback) inside the game.
 */

import { Asset } from 'expo-asset';
import {
  FilterMode,
  MipmapMode,
  SkImage,
  Skia,
} from '@shopify/react-native-skia';

import {
  gameAssetManifestSchema,
  validateManifestReferences,
  type GameAssetManifest,
} from './asset-manifest';
import manifestJson from '@/assets/atlases/manifest.json';

export interface LoadedGameAssets {
  manifest: GameAssetManifest;
  images: Readonly<Record<string, SkImage>>;
  /** Sampling options used for every pixel-art draw. */
  readonly nearestSampling: { filter: FilterMode; mipmap: MipmapMode };
}

export class AssetLoadingError extends Error {
  readonly problems: readonly string[];

  constructor(problems: readonly string[]) {
    super(`Game assets failed to load:\n- ${problems.join('\n- ')}`);
    this.name = 'AssetLoadingError';
    this.problems = problems;
  }
}

/** Static module refs; require() is resolved lazily so a missing file becomes a catchable problem. */
const ATLAS_MODULE_REFS: Record<string, () => number> = {
  'dungeon-tiles': () => require('@/assets/atlases/dungeon-tiles.png'),
  actors: () => require('@/assets/atlases/actors.png'),
};

export async function loadGameAssets(): Promise<LoadedGameAssets> {
  const problems: string[] = [];

  const parsed = gameAssetManifestSchema.safeParse(manifestJson);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      problems.push(
        `manifest.json: ${issue.path.join('.')} — ${issue.message}`,
      );
    }
    throw new AssetLoadingError(problems);
  }
  const manifest = parsed.data;

  const images: Record<string, SkImage> = {};
  for (const [name, entry] of Object.entries(manifest.atlases)) {
    const moduleRef = ATLAS_MODULE_REFS[name];
    if (!moduleRef) {
      problems.push(
        `atlas '${name}': no bundled module ref registered in ATLAS_MODULE_REFS`,
      );
      continue;
    }
    let asset: Asset;
    try {
      asset = Asset.fromModule(moduleRef());
    } catch (error) {
      problems.push(
        `atlas '${name}' (${entry.file}): failed to resolve module — ${String(error)}`,
      );
      continue;
    }
    try {
      await asset.downloadAsync();
    } catch (error) {
      problems.push(
        `atlas '${name}' (${entry.file}): download failed — ${String(error)}`,
      );
      continue;
    }

    let image: SkImage | null = null;
    try {
      const data = await Skia.Data.fromURI(asset.localUri ?? asset.uri);
      image = Skia.Image.MakeImageFromEncoded(data);
    } catch (error) {
      problems.push(
        `atlas '${name}' (${entry.file}): decode failed — ${String(error)}`,
      );
      continue;
    }
    if (!image) {
      problems.push(
        `atlas '${name}' (${entry.file}): Skia could not decode the image`,
      );
      continue;
    }

    const expectedWidth = entry.columns * manifest.tileSize;
    const expectedHeight = entry.rows * manifest.tileSize;
    if (image.width() !== expectedWidth || image.height() !== expectedHeight) {
      problems.push(
        `atlas '${name}': image is ${image.width()}x${image.height()} but the manifest declares ` +
          `${entry.columns}x${entry.rows} tiles of ${manifest.tileSize}px (${expectedWidth}x${expectedHeight})`,
      );
      continue;
    }
    images[name] = image;
  }

  problems.push(...validateManifestReferences(manifest));

  if (problems.length > 0) throw new AssetLoadingError(problems);

  return {
    manifest,
    images,
    nearestSampling: { filter: FilterMode.Nearest, mipmap: MipmapMode.None },
  };
}
