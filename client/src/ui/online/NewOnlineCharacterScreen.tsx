import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createCommandId } from '../../online/commandId';
import { router } from 'expo-router';
import { View } from 'react-native';
import { useOnline } from '../../online/OnlineProvider';
import { gameKeys } from '../../online/queries';
import { NewCharacterForm } from './NewCharacterForm';
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
      details ? commands!.create({ commandId: createCommandId(), ...details }) : commands!.retry(),
    onSuccess: (result) => router.dismissTo(gameHref(result.receipt.characterId)),
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
        blocked={pending.isPending || !!pending.data || !!pending.error || mutation.isPending}
        create={async (details) => {
          await mutation.mutateAsync(details);
        }}
      />
    </View>
  );
}
