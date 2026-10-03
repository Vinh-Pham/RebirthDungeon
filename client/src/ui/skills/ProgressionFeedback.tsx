import type { GameplayHost as JourneyHost } from '../../game/Gameplay';
import { useSyncExternalStore } from 'react';
import { View } from 'react-native';
import { DungeonButton, DungeonNotice } from '../shared/DungeonUI';
export default function ProgressionFeedback({
  host,
  showNotice = true,
}: {
  host: JourneyHost;
  showNotice?: boolean;
}) {
  const view = useSyncExternalStore(host.subscribe, host.getSnapshot, host.getServerSnapshot);
  if (!view.error && !view.busy && (!view.notice || !showNotice)) return null;
  return (
    <View className="gap-2">
      <DungeonNotice
        message={
          view.error ??
          (view.busy
            ? host.source === 'online'
              ? 'Connecting or resolving action…'
              : 'Saving progress…'
            : view.notice)
        }
        status={view.error ? 'danger' : 'accent'}
      />
      {view.retryAvailable && view.pendingResult ? (
        <DungeonNotice
          status="accent"
          message={
            host.source === 'online'
              ? `Pending: ${view.pendingResult}. Recovery checks the original request without charging or rolling again.`
              : `Waiting to save: ${view.pendingResult} Retry saves this same result without another roll or charge.`
          }
        />
      ) : null}
      {view.retryAvailable ? (
        <DungeonButton
          primary
          label={host.source === 'online' ? 'Recover pending action' : 'Retry save'}
          busy={view.busy}
          onPress={() => {
            void host.retryProgression();
          }}
        />
      ) : null}
    </View>
  );
}
