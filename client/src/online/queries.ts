import { notifyManager, queryOptions, type QueryClient } from '@tanstack/react-query';
import {
  ListResponseSchema,
  type PublicView,
  type PreviewRequestSchema,
} from '@rebirth/game-core/online/Contracts';
import { ContentSchema } from '@rebirth/game-core/data/schemas/content';
import {
  CORE_FEATURES,
  GAME_FEATURES,
  CONTENT_COLLECTIONS,
  contentProperty,
  ContentManifestSchema,
  contentCollectionResponseSchema,
  FeaturePreviewResponseSchema,
  featureResponseSchema,
  type GameFeature,
  type FeatureData,
  type FeatureResponse,
  type MutationResponse,
} from '@rebirth/game-core/online/Features';
import { previewRequest } from '@rebirth/game-core/online/Actions';
import type { z } from 'zod';
import type { GameAPI } from './API';
import type { OnlineAccess } from './Access';
import { APIError, retryRead, StaleAccessError } from './API';
export const gameKeys = {
  account: (origin: string, userId: string) => ['game', origin, userId] as const,
  content: (origin: string, userId: string, version?: string) =>
    [...gameKeys.account(origin, userId), 'content', version] as const,
  characters: (origin: string, userId: string) =>
    [...gameKeys.account(origin, userId), 'characters'] as const,
  character: (origin: string, userId: string, id: string) =>
    [...gameKeys.account(origin, userId), 'character', id] as const,
  feature: (origin: string, userId: string, id: string, feature: GameFeature) =>
    [...gameKeys.character(origin, userId, id), 'feature', feature] as const,
  preview: (origin: string, userId: string, id: string, revision: number, selection: unknown) =>
    [...gameKeys.character(origin, userId, id), 'preview', revision, selection] as const,
};
export type CoreHero = FeatureData['progression'] & FeatureData['resources'];
export type CoreView = Omit<PublicView, 'hero'> & {
  hero: CoreHero;
  statReview: FeatureData['stats'];
};
export interface CachedCharacter {
  view: CoreView;
  connectionGeneration: number;
}
export interface CachedFeature<K extends GameFeature = GameFeature> extends FeatureResponse<K> {
  connectionGeneration: number;
}
export function mergeCharacter(
  old: CachedCharacter | undefined,
  incoming: CachedCharacter,
): CachedCharacter {
  return old && old.view.character.revision > incoming.view.character.revision ? old : incoming;
}
export function featureOptions<K extends GameFeature>(
  api: GameAPI,
  access: OnlineAccess,
  userId: string,
  id: string,
  feature: K,
  expectedRevision?: number,
) {
  return queryOptions({
    queryKey: gameKeys.feature(api.origin, userId, id, feature),
    staleTime: 5000,
    retry: retryRead,
    queryFn: async ({ signal }): Promise<CachedFeature<K>> => {
      api.assertAccount(userId);
      const lease = access.getSnapshot();
      const path =
        '/api/game/characters/' +
        encodeURIComponent(id) +
        (feature === 'character' ? '' : '/' + feature) +
        (expectedRevision === undefined ? '' : '?expectedRevision=' + expectedRevision);
      const result = (await api.request(
        path,
        featureResponseSchema(feature),
        undefined,
        signal,
      )) as FeatureResponse<K>;
      if (
        result.characterId !== id ||
        (expectedRevision !== undefined && result.revision !== expectedRevision)
      )
        throw new Error('Unexpected character feature response');
      if (feature === 'character') {
        const metadata = result.data as FeatureData['character'];
        if (
          metadata.id !== id ||
          metadata.revision !== result.revision ||
          metadata.contentVersion !== result.contentVersion
        )
          throw new Error('Inconsistent character metadata');
      }
      return { ...result, connectionGeneration: lease.connectionGeneration };
    },
    structuralSharing: (old, incoming) => {
      const a = old as CachedFeature<K> | undefined,
        b = incoming as CachedFeature<K>;
      return a && a.revision > b.revision ? a : b;
    },
  });
}
export function cachedFeature<K extends GameFeature>(
  queries: QueryClient,
  api: GameAPI,
  userId: string,
  id: string,
  feature: K,
) {
  return queries.getQueryData<CachedFeature<K>>(gameKeys.feature(api.origin, userId, id, feature));
}
export function coherentCharacter(
  queries: QueryClient,
  api: GameAPI,
  userId: string,
  id: string,
): CachedCharacter | undefined {
  const metadata = cachedFeature(queries, api, userId, id, 'character');
  if (!metadata) return;
  const required = CORE_FEATURES.map((feature) => cachedFeature(queries, api, userId, id, feature));
  if (
    required.some(
      (row) =>
        !row ||
        row.revision !== metadata.revision ||
        row.contentVersion !== metadata.contentVersion ||
        row.connectionGeneration !== metadata.connectionGeneration,
    )
  )
    return;
  const data = <K extends GameFeature>(feature: K) =>
    cachedFeature(queries, api, userId, id, feature)!.data;
  return {
    connectionGeneration: metadata.connectionGeneration,
    view: {
      version: 1,
      character: data('character'),
      hero: { ...data('progression'), ...data('resources') },
      stats: data('stats').stats,
      statReview: data('stats'),
      ...data('journey'),
      resting: data('rest').resting,
      dungeon: data('dungeon') ?? undefined,
      encounter: data('encounter') ?? undefined,
    },
  };
}
/** Guard all required and already loaded slices. Unloaded features remain absent. */
export async function refreshFeatures(
  queries: QueryClient,
  api: GameAPI,
  access: OnlineAccess,
  userId: string,
  id: string,
  extra: GameFeature[] = [],
  signal?: AbortSignal,
) {
  for (let attempt = 0; attempt < 3; attempt++) {
    signal?.throwIfAborted();
    const lease = access.getSnapshot();
    api.assertAccount(userId);
    const metadata = await queries.fetchQuery({
      ...featureOptions(api, access, userId, id, 'character'),
      staleTime: 0,
    });
    signal?.throwIfAborted();
    if (!access.matches(lease)) throw new StaleAccessError();
    const needed = new Set([
      ...CORE_FEATURES,
      ...extra,
      ...GAME_FEATURES.filter((feature) => cachedFeature(queries, api, userId, id, feature)),
    ]);
    try {
      await Promise.all(
        [...needed]
          .filter((f) => f !== 'character')
          .map((feature) =>
            queries.fetchQuery({
              ...featureOptions(api, access, userId, id, feature, metadata.revision),
              staleTime: 0,
            }),
          ),
      );
      signal?.throwIfAborted();
      if (!access.matches(lease)) throw new StaleAccessError();
      const result = coherentCharacter(queries, api, userId, id);
      if (
        result &&
        [...needed].every((feature) => {
          const row = cachedFeature(queries, api, userId, id, feature);
          return (
            row?.revision === metadata.revision &&
            row.connectionGeneration === lease.connectionGeneration
          );
        })
      ) {
        queries.setQueryData(gameKeys.character(api.origin, userId, id), result);
        return result;
      }
    } catch (error) {
      if (!(error instanceof APIError && error.status === 409)) throw error;
    }
  }
  throw new APIError(409, 'The character changed during refresh. Please retry.');
}
export function characterOptions(
  api: GameAPI,
  access: OnlineAccess,
  userId: string,
  id: string,
  queries: QueryClient,
) {
  return queryOptions({
    queryKey: gameKeys.character(api.origin, userId, id),
    staleTime: 5000,
    retry: retryRead,
    queryFn: ({ signal }) => refreshFeatures(queries, api, access, userId, id, [], signal),
    structuralSharing: (old, incoming) =>
      mergeCharacter(old as CachedCharacter | undefined, incoming as CachedCharacter),
  });
}
export async function applyUpdates(
  queries: QueryClient,
  api: GameAPI,
  access: OnlineAccess,
  userId: string,
  result: MutationResponse,
) {
  const id = result.updates.character.id,
    revision = result.snapshotRevision,
    generation = access.getSnapshot().connectionGeneration;
  const previous = cachedFeature(queries, api, userId, id, 'character');
  if (previous && previous.revision > revision) {
    if (!coherentCharacter(queries, api, userId, id))
      await refreshFeatures(queries, api, access, userId, id);
    return;
  }
  const sequential =
    previous?.revision === result.receipt.baseRevision &&
    revision === result.receipt.committedRevision;
  notifyManager.batch(() => {
    for (const feature of GAME_FEATURES) {
      const data = result.updates[feature],
        old = cachedFeature(queries, api, userId, id, feature);
      if (old && old.revision > revision) continue;
      if (
        data !== undefined ||
        (old &&
          sequential &&
          old.revision === previous?.revision &&
          old.connectionGeneration === generation)
      )
        queries.setQueryData(gameKeys.feature(api.origin, userId, id, feature), {
          apiVersion: 2,
          characterId: id,
          revision,
          contentVersion: result.updates.character.contentVersion,
          connectionGeneration: generation,
          data: data === undefined ? old!.data : data,
        });
    }
    const current = coherentCharacter(queries, api, userId, id);
    if (current)
      queries.setQueryData(gameKeys.character(api.origin, userId, id), (old) =>
        mergeCharacter(old as CachedCharacter | undefined, current),
      );
  });
  if (
    !coherentCharacter(queries, api, userId, id) ||
    GAME_FEATURES.some((feature) => {
      const row = cachedFeature(queries, api, userId, id, feature);
      return row && row.revision !== revision;
    })
  )
    await refreshFeatures(queries, api, access, userId, id);
}
export function charactersOptions(api: GameAPI, userId: string) {
  return queryOptions({
    queryKey: gameKeys.characters(api.origin, userId),
    staleTime: 30000,
    retry: retryRead,
    queryFn: ({ signal }) => {
      api.assertAccount(userId);
      return api.request('/api/game/characters', ListResponseSchema, undefined, signal);
    },
  });
}
export async function deleteCharacter(
  queries: QueryClient,
  api: GameAPI,
  userId: string,
  id: string,
  permanent = false,
) {
  api.assertAccount(userId);
  const result = await api.deleteCharacter(id, permanent);
  // Cancel earlier reads before removing cached data so they cannot republish the character.
  await Promise.all([
    queries.cancelQueries({ queryKey: gameKeys.characters(api.origin, userId) }),
    queries.cancelQueries({ queryKey: gameKeys.character(api.origin, userId, id) }),
  ]);
  api.assertAccount(userId);
  queries.removeQueries({ queryKey: gameKeys.character(api.origin, userId, id) });
  queries.setQueryData<z.output<typeof ListResponseSchema>>(
    gameKeys.characters(api.origin, userId),
    (old) => old && { characters: old.characters.filter((character) => character.id !== id) },
  );
  await queries.invalidateQueries({ queryKey: gameKeys.characters(api.origin, userId) });
  return result;
}
export function contentOptions(api: GameAPI, userId: string, version?: string) {
  return queryOptions({
    queryKey: gameKeys.content(api.origin, userId, version),
    staleTime: Infinity,
    retry: retryRead,
    queryFn: async ({ signal }) => {
      api.assertAccount(userId);
      const manifest = await api.request(
        '/api/game/content',
        ContentManifestSchema,
        undefined,
        signal,
      );
      const pinned = version ?? manifest.activeVersion;
      const entries = await Promise.all(
        CONTENT_COLLECTIONS.map(async (collection) => {
          const result = await api.request(
            '/api/game/content/' + encodeURIComponent(pinned) + '/' + collection,
            contentCollectionResponseSchema(collection),
            undefined,
            signal,
          );
          if (result.contentVersion !== pinned) throw new Error('Unexpected content release');
          return [contentProperty(collection), result.data];
        }),
      );
      return { contentVersion: pinned, catalog: ContentSchema.parse(Object.fromEntries(entries)) };
    },
  });
}
export function previewOptions(
  api: GameAPI,
  userId: string,
  id: string,
  body: z.infer<typeof PreviewRequestSchema>,
) {
  const request = previewRequest(id, body);
  return queryOptions({
    queryKey: gameKeys.preview(api.origin, userId, id, body.expectedRevision, body.selection),
    staleTime: Infinity,
    gcTime: 60000,
    retry: false,
    queryFn: ({ signal }) => {
      api.assertAccount(userId);
      return api.request(request.path, FeaturePreviewResponseSchema, request.body, signal);
    },
  });
}
