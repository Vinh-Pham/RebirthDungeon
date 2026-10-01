import type { JourneyHost } from '../../game/JourneyHost';
import { useSyncExternalStore } from 'react';
import { View } from 'react-native';
import { DungeonButton, DungeonNotice } from '../shared/DungeonUI';
export default function ProgressionFeedback({ host }: { host: JourneyHost }) {
  const view = useSyncExternalStore(host.subscribe, host.getSnapshot, host.getServerSnapshot);
  if (!view.error && !view.busy && !view.notice) return null;
  return <View className="gap-2">
    <DungeonNotice message={view.error ?? (view.busy ? 'Saving progress…' : view.notice)} status={view.error ? 'danger' : 'accent'} />
    {view.retryAvailable ? <DungeonButton primary label="Retry save" busy={view.busy} onPress={() => { void host.retryProgression(); }} /> : null}
  </View>;
}
