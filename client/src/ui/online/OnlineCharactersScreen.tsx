import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';
import { useOnline } from '../../online/OnlineProvider';
import { charactersOptions, deleteCharacter } from '../../online/queries';
import type { CharacterMetadata } from '@rebirth/game-core/online/Contracts';
import { TALENT_LABELS } from '../../persistence/CharacterProfile';
import { MenuButton, MenuError, MenuPage, menu } from '../menu/MenuUI';
import { DungeonLoading, DungeonCard } from '../shared/DungeonUI';
import { gameHref } from '../navigation/gameHref';
import OnlineGate from './OnlineGate';
export default function OnlineCharactersScreen() {
  return (
    <OnlineGate>
      <CharacterList />
    </OnlineGate>
  );
}
function CharacterList() {
  const { reset } = useLocalSearchParams<{ reset?: string }>();
  const { api, session } = useOnline();
  const query = useQuery(charactersOptions(api!, session!.user.id));
  const queries = useQueryClient();
  const [deleting, setDeleting] = useState<CharacterMetadata>();
  const deletion = useMutation({
    mutationFn: ({ id, permanent }: { id: string; permanent: boolean }) =>
      deleteCharacter(queries, api!, session!.user.id, id, permanent),
    retry: false,
    onSuccess: () => setDeleting(undefined),
  });
  return (
    <MenuPage>
      <Text className="text-accent" style={menu.eyebrow}>
        ONLINE · {session!.user.email}
      </Text>
      <Text className="text-foreground" accessibilityRole="header" style={menu.title}>
        Online characters
      </Text>
      <Text className="text-muted" style={menu.body}>
        Progress is saved on the server after every accepted action. A connection is required to
        play.
      </Text>
      {reset === '1' ? (
        <Text className="text-muted" style={menu.body}>
          This character is no longer available. Online characters were reset for the game update;
          your account is preserved. Choose or create a character below.
        </Text>
      ) : null}
      {query.isPending ? <DungeonLoading label="Loading online characters" /> : null}
      <MenuError message={query.error?.message} />
      {query.error ? (
        <MenuButton
          label="Retry"
          secondary
          onPress={() => {
            void query.refetch();
          }}
        />
      ) : null}
      <View style={menu.section}>
        {query.data?.characters.map((character) => (
          <DungeonCard key={character.id}>
            <Text className="text-accent" style={menu.heading}>
              {character.name}
            </Text>
            <Text className="text-muted" style={menu.body}>
              {TALENT_LABELS[character.talent]} · Age {character.age}
            </Text>
            <MenuButton
              label={`Continue ${character.name}`}
              disabled={deletion.isPending}
              onPress={() => router.push(gameHref(character.id))}
            />
            <MenuButton
              label={`Delete ${character.name}`}
              secondary
              disabled={deletion.isPending}
              onPress={() => {
                deletion.reset();
                setDeleting(character);
              }}
            />
            {deleting?.id === character.id ? (
              <View style={menu.section}>
                <Text className="text-foreground" style={menu.body}>
                  Delete {character.name}? Deleting removes this character from your roster and
                  prevents further play. Its saved progress is retained on the server.
                </Text>
                <Text className="text-muted" style={menu.body}>
                  Permanently deleting also erases the character and saved progress from the
                  database. This cannot be undone or restored.
                </Text>
                <MenuError message={deletion.error?.message} />
                <MenuButton
                  label={`Confirm delete ${character.name}`}
                  disabled={deletion.isPending}
                  busy={deletion.isPending && !deletion.variables?.permanent}
                  onPress={() => deletion.mutate({ id: character.id, permanent: false })}
                />
                <MenuButton
                  label={`Permanently delete ${character.name}`}
                  secondary
                  disabled={deletion.isPending}
                  busy={deletion.isPending && !!deletion.variables?.permanent}
                  onPress={() => deletion.mutate({ id: character.id, permanent: true })}
                />
                <MenuButton
                  label="Cancel deletion"
                  secondary
                  disabled={deletion.isPending}
                  onPress={() => {
                    deletion.reset();
                    setDeleting(undefined);
                  }}
                />
              </View>
            ) : null}
          </DungeonCard>
        ))}
      </View>
      {query.data?.characters.length === 0 ? (
        <Text className="text-muted" style={menu.body}>
          Create your first online character.
        </Text>
      ) : null}
      <MenuButton
        label="Create online character"
        disabled={deletion.isPending}
        onPress={() => router.push('/online/characters/new')}
      />
      <MenuButton label="Account" secondary onPress={() => router.navigate('/account')} />
      <MenuButton label="Back to title" secondary onPress={() => router.navigate('/')} />
    </MenuPage>
  );
}
