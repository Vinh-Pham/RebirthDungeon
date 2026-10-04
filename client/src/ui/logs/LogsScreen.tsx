import { useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { FlatList, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Tabs } from 'heroui-native/tabs';
import { LogPageSchema, type HistoryRow } from '@rebirth/game-core/online/Audit';
import { LOG_CATEGORIES, type LogFilter } from '../../engine/logging/LogEngine';
import { useCharacterGame } from '../menu/CharacterGameContext';
import { useOnline, useOnlineAccess } from '../../online/OnlineProvider';
import { useAppScreenChrome } from '../navigation/AppScreenChrome';
import { DungeonButton, DungeonCard, DungeonLoading, DungeonNotice } from '../shared/DungeonUI';
import KeyboardChoiceGroup from '../shared/KeyboardChoiceGroup';
import { menu } from '../menu/MenuUI';
import { formatLogTimestamp } from './formatLogTimestamp';

const title = (value: string) => value[0].toUpperCase() + value.slice(1);
export function HistoryCard({ entry, filter = 'all' }: { entry: HistoryRow; filter?: LogFilter }) {
  return (
    <DungeonCard>
      <View className="flex-row flex-wrap justify-between gap-2">
        <Text className="text-accent text-xs font-semibold">
          {title(entry.category)} ·{' '}
          {entry.source === 'server'
            ? entry.outcome === 'committed'
              ? 'Server verified'
              : 'Server observed'
            : 'Client reported'}
        </Text>
        <Text className="text-muted text-xs">{formatLogTimestamp(entry.timestamp)}</Text>
      </View>
      <Text className="text-foreground" style={menu.body}>
        {entry.message}
      </Text>
      {entry.occurredAt !== null ? (
        <Text className="text-muted text-xs">
          Reported occurrence: {formatLogTimestamp(entry.occurredAt)} · time supplied by client
        </Text>
      ) : null}
      {entry.events
        ?.filter((e) => filter === 'all' || e.category === filter)
        .map((event, index) => (
          <Text key={index} className="text-muted text-sm">
            {event.message}
          </Text>
        ))}
    </DungeonCard>
  );
}
export default function LogsScreen() {
  const { profile } = useCharacterGame(),
    { api, session } = useOnline(),
    access = useOnlineAccess();
  const { edges } = useAppScreenChrome();
  const [filter, setFilter] = useState<LogFilter>('all');
  const userId = session?.user.id;
  const history = useInfiniteQuery({
    queryKey: ['game', api?.origin, userId, 'logs', profile.id, filter],
    initialPageParam: undefined as string | undefined,
    enabled: !!api && !!userId && access.verified && access.online,
    queryFn: ({ pageParam, signal }) => {
      api!.assertAccount(userId!);
      const query = new URLSearchParams();
      if (filter !== 'all') query.set('category', filter);
      if (pageParam) query.set('cursor', pageParam);
      return api!.request(
        `/api/game/characters/${encodeURIComponent(profile.id)}/logs?${query}`,
        LogPageSchema,
        undefined,
        signal,
      );
    },
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
  const entries = history.data?.pages.flatMap((page) => page.entries) ?? [];
  return (
    <SafeAreaView edges={edges} className="flex-1 bg-background">
      <Tabs value={filter} onValueChange={(v) => setFilter(v as LogFilter)} className="flex-1">
        <View className="w-full max-w-[680px] self-center gap-3 px-5 pb-4 pt-6">
          <View className="flex-row items-center justify-between gap-3">
            <Text accessibilityRole="header" className="text-foreground" style={menu.title}>
              Logs
            </Text>
            <DungeonButton
              label="Refresh"
              disabled={history.isFetching}
              onPress={() => {
                void history.refetch();
              }}
            />
          </View>
          <Text className="text-muted" style={menu.body}>
            {profile.name} · Last 90 days · {entries.length} records loaded
          </Text>
          {history.data?.pages[0] ? (
            <Text className="text-muted text-xs">
              Recording began {formatLogTimestamp(history.data.pages[0].recordingSince)}
            </Text>
          ) : null}
          {history.error ? <DungeonNotice message={history.error.message} /> : null}
          <KeyboardChoiceGroup itemRole="tab" value={filter}>
            <Tabs.List
              accessibilityLabel="Log filters"
              className="w-full border border-border bg-surface"
            >
              <Tabs.ScrollView>
                <Tabs.Indicator className="rounded-lg bg-surface-tertiary" />
                {(['all', ...LOG_CATEGORIES] as const).map((value) => (
                  <Tabs.Trigger
                    key={value}
                    value={value}
                    accessibilityLabel={title(value)}
                    className="min-h-12 px-3"
                    style={{ flexShrink: 0, minWidth: 68 }}
                  >
                    <Tabs.Label className="text-xs">{title(value)}</Tabs.Label>
                  </Tabs.Trigger>
                ))}
              </Tabs.ScrollView>
            </Tabs.List>
          </KeyboardChoiceGroup>
        </View>
        <Tabs.Content value={filter} className="flex-1">
          <FlatList
            data={entries}
            keyExtractor={(entry) => entry.id}
            renderItem={({ item }) => <HistoryCard entry={item} filter={filter} />}
            accessibilityLabel={`${title(filter)} log messages`}
            contentContainerStyle={{
              paddingHorizontal: 20,
              paddingBottom: 24,
              gap: 12,
              width: '100%',
              maxWidth: 680,
              alignSelf: 'center',
              flexGrow: 1,
            }}
            ListEmptyComponent={
              history.isPending ? (
                <DungeonLoading label="Loading history" />
              ) : (
                <Text className="text-muted">No matching history yet.</Text>
              )
            }
            ListFooterComponent={
              history.hasNextPage ? (
                <DungeonButton
                  label="Load older records"
                  busy={history.isFetchingNextPage}
                  onPress={() => {
                    void history.fetchNextPage();
                  }}
                />
              ) : null
            }
          />
        </Tabs.Content>
      </Tabs>
    </SafeAreaView>
  );
}
