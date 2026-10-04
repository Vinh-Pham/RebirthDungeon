/** Existing gameplay scenarios use a complete observation assembled here, never an aggregate API route. */
import { app } from '../src/index.js';
import { env } from 'cloudflare:workers';
import {
  actionDefinitions,
  previewDefinitions,
} from '@rebirth/game-core/online/Actions';
import { GameRepository } from '../src/game/repository.js';
export async function scenarioRequest(
  path: string,
  cookie?: string,
  body?: unknown,
  headers: Record<string, string> = {},
) {
  const input = body as Record<string, any> | undefined;
  let translated = path,
    payload = body;
  if (path.endsWith('/commands')) {
    const command = input?.command ?? {},
      definition =
        actionDefinitions.find((d) => d.type === command.type) ??
        actionDefinitions[0];
    translated =
      path.slice(0, -9) +
      definition.path.replace(/\{(\w+)\}/g, (_, key) =>
        encodeURIComponent(String(command[key] ?? 'missing')),
      );
    payload = {
      ...Object.fromEntries(
        Object.entries(input ?? {}).filter(([key]) => key !== 'command'),
      ),
      ...Object.fromEntries(
        Object.entries(command).filter(
          ([key]) => key !== 'type' && !definition.keys.includes(key),
        ),
      ),
    };
    if (!actionDefinitions.some((d) => d.type === command.type))
      (payload as any).unsupportedType = command.type ?? 'missing';
  }
  if (path.endsWith('/previews')) {
    const selection = input?.selection ?? {},
      definition =
        previewDefinitions.find((d) => d.type === selection.type) ??
        previewDefinitions[0];
    translated = path.slice(0, -9) + definition.path;
    payload = {
      ...Object.fromEntries(
        Object.entries(input ?? {}).filter(([key]) => key !== 'selection'),
      ),
      ...Object.fromEntries(
        Object.entries(selection).filter(([key]) => key !== 'type'),
      ),
    };
  }
  const response = await app.request(
    translated,
    {
      method: body === undefined ? 'GET' : 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(cookie ? { Cookie: cookie } : {}),
        ...headers,
      },
      ...(body === undefined ? {} : { body: JSON.stringify(payload) }),
    },
    env,
  );
  if (!response.ok) return response;
  const result = await response.clone().json<any>();
  if (path.endsWith('/previews')) {
    const {
      apiVersion: _apiVersion,
      characterId: _characterId,
      ...preview
    } = result;
    return Response.json(preview, { headers: response.headers });
  }
  const character =
    result.character ??
    result.updates?.character ??
    (result.data?.id ? result.data : undefined);
  if (character) {
    const userId = await env.DB.prepare(
      'SELECT user_id FROM game_characters WHERE id=?',
    )
      .bind(character.id)
      .first<string>('user_id');
    const loaded = await new GameRepository(env.DB, userId!).load(character.id);
    const view = loaded.runtime.publicView(loaded.state, loaded.character);
    return Response.json(
      result.receipt ? { receipt: result.receipt, view } : view,
      { headers: response.headers },
    );
  }
  return response;
}
