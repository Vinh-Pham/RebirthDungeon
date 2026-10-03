import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { randomUUID } from 'expo-crypto';
import { router } from 'expo-router';
import { View } from 'react-native';
import { useOnline } from '../../online/OnlineProvider';
import { gameKeys } from '../../online/queries';
import { NewCharacterForm } from '../menu/NewCharacterScreen';
import { MenuButton, MenuError } from '../menu/MenuUI';
import type { CharacterDetails } from '../../persistence/CharacterProfile';
import { gameHref } from '../navigation/gameHref';
import OnlineGate from './OnlineGate';
export default function NewOnlineCharacterScreen() {
  return (
    <OnlineGate>
      <CreateCharacter />
    </OnlineGate>
  );
}
function CreateCharacter() {
  const { api, session, commands } = useOnline(),
    queries = useQueryClient();
  const [attempt, setAttempt] = useState(0);
  const key = [...gameKeys.account(api!.origin, session!.user.id), 'pending-creation'];
  const pending = useQuery({
    queryKey: key,
    queryFn: async () => (await commands!.pending()) ?? null,
    staleTime: 0,
    retry: false,
  });
  const mutation = useMutation({
    retry: false,
    networkMode: 'always',
    mutationFn: (details?: CharacterDetails) =>
      details ? commands!.create({ commandId: randomUUID(), ...details }) : commands!.retry(),
    onSuccess: (result) => router.dismissTo(gameHref('online', result.view.character.id)),
    onSettled: async () => {
      await queries.invalidateQueries({ queryKey: key });
    },
  });
  return (
    <View className="flex-1 bg-background">
      {pending.data || pending.error ? (
        <View className="gap-3 p-5">
          <MenuError
            message={
              pending.error?.message ??
              'An earlier character creation needs recovery. Retry checks the same request.'
            }
          />
          <MenuButton
            label={pending.error ? 'Retry recovery storage' : 'Recover character creation'}
            busy={mutation.isPending}
            onPress={() => {
              if (pending.error) void pending.refetch();
              else mutation.mutate(undefined);
            }}
          />
          <MenuError message={mutation.error?.message} />
        </View>
      ) : null}
      <NewCharacterForm
        key={attempt}
        retry={() => setAttempt((v) => v + 1)}
        blocked={pending.isPending || !!pending.data || !!pending.error || mutation.isPending}
        create={async (details) => {
          await mutation.mutateAsync(details);
        }}
      />
    </View>
  );
}
