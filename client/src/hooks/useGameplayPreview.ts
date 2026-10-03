import { useQuery } from '@tanstack/react-query';
import type { GameplayJourney, PreviewSelection } from '../game/Gameplay';
export function useGameplayPreview(
  session: GameplayJourney,
  selection: PreviewSelection | undefined,
  enabled: boolean,
) {
  const revision = session.getSnapshot().revision;
  return useQuery({
    queryKey: selection ? session.previewKey(selection) : ['disabled-preview'],
    queryFn: ({ signal }) => session.preview(selection!, revision, signal),
    enabled: !!selection && enabled,
    retry: false,
    staleTime: Infinity,
    gcTime: 60000,
    networkMode: session.source === 'local' ? 'always' : 'online',
  });
}
