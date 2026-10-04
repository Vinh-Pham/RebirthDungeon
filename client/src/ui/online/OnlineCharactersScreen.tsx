import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';
import { useOnline } from '../../online/OnlineProvider';
import { charactersOptions } from '../../online/queries';
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
              onPress={() => router.push(gameHref(character.id))}
            />
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
        onPress={() => router.push('/online/characters/new')}
      />
      <MenuButton label="Account" secondary onPress={() => router.navigate('/account')} />
      <MenuButton label="Back to title" secondary onPress={() => router.navigate('/')} />
    </MenuPage>
  );
}
