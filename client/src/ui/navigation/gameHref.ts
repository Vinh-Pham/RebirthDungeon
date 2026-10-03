import type { Href } from 'expo-router';
export type GameDestination =
  | ''
  | 'inventory'
  | 'skills'
  | 'quests'
  | 'titles'
  | 'logs'
  | 'explore'
  | 'save-load';
export function gameHref(
  source: 'local' | 'online',
  id: string,
  destination: GameDestination = '',
): Href {
  if (source === 'online' && destination === 'save-load')
    throw new Error('Online progress has no manual saves.');
  return `${source === 'online' ? '/online' : ''}/game/${encodeURIComponent(id)}${destination ? '/' + destination : ''}` as Href;
}
