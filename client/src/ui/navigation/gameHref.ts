import type { Href } from 'expo-router';
export type GameDestination =
  | ''
  | 'inventory'
  | 'skills'
  | 'quests'
  | 'titles'
  | 'logs'
  | 'explore';

export function gameHref(id: string, destination: GameDestination = ''): Href {
  return `/online/game/${encodeURIComponent(id)}${destination ? '/' + destination : ''}` as Href;
}
