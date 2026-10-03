import { queryOptions } from '@tanstack/react-query';
import {
  ContentResponseSchema,
  ListResponseSchema,
  PublicViewSchema,
  PreviewResponseSchema,
  GAME_CONTENT_VERSION,
  type PublicView,
  type PreviewRequestSchema,
} from '@rebirth/game-core/online/Contracts';
import type { z } from 'zod';
import type { GameAPI } from './API';
import type { OnlineAccess } from './Access';
import { retryRead } from './API';
export const gameKeys = {
  account: (origin: string, userId: string) => ['game', origin, userId] as const,
  content: (origin: string, userId: string) =>
    [...gameKeys.account(origin, userId), 'content'] as const,
  characters: (origin: string, userId: string) =>
    [...gameKeys.account(origin, userId), 'characters'] as const,
  character: (origin: string, userId: string, id: string) =>
    [...gameKeys.account(origin, userId), 'character', id] as const,
  preview: (origin: string, userId: string, id: string, revision: number, selection: unknown) =>
    [...gameKeys.account(origin, userId), 'preview', id, revision, selection] as const,
};
export interface CachedCharacter {
  view: PublicView;
  connectionGeneration: number;
}
export function mergeCharacter(
  old: CachedCharacter | undefined,
  incoming: CachedCharacter,
): CachedCharacter {
  return old && old.view.character.revision > incoming.view.character.revision
    ? { ...incoming, view: old.view }
    : incoming;
}
export function characterOptions(api: GameAPI, access: OnlineAccess, userId: string, id: string) {
  return queryOptions({
    queryKey: gameKeys.character(api.origin, userId, id),
    staleTime: 5000,
    retry: retryRead,
    queryFn: async ({ signal }): Promise<CachedCharacter> => {
      api.assertAccount(userId);
      const lease = access.getSnapshot();
      const view = await api.request(
        '/api/game/characters/' + encodeURIComponent(id),
        PublicViewSchema,
        undefined,
        signal,
      );
      if (view.character.contentVersion !== GAME_CONTENT_VERSION)
        throw new Error('Update the app to play this character.');
      return { view, connectionGeneration: lease.connectionGeneration };
    },
    structuralSharing: (old, incoming) =>
      mergeCharacter(old as CachedCharacter | undefined, incoming as CachedCharacter),
  });
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
export function contentOptions(api: GameAPI, userId: string) {
  return queryOptions({
    queryKey: gameKeys.content(api.origin, userId),
    staleTime: 300000,
    retry: retryRead,
    queryFn: async ({ signal }) => {
      api.assertAccount(userId);
      const result = await api.request(
        '/api/game/content',
        ContentResponseSchema,
        undefined,
        signal,
      );
      if (result.contentVersion !== GAME_CONTENT_VERSION)
        throw new Error('Update the app to match the server content.');
      return result;
    },
  });
}
export function previewOptions(
  api: GameAPI,
  userId: string,
  id: string,
  body: z.infer<typeof PreviewRequestSchema>,
) {
  return queryOptions({
    queryKey: gameKeys.preview(api.origin, userId, id, body.expectedRevision, body.selection),
    staleTime: Infinity,
    gcTime: 60000,
    retry: false,
    queryFn: ({ signal }) => {
      api.assertAccount(userId);
      return api.request(
        '/api/game/characters/' + encodeURIComponent(id) + '/previews',
        PreviewResponseSchema,
        body,
        signal,
      );
    },
  });
}
