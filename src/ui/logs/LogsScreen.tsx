import { memo, useMemo, useState, useSyncExternalStore, type ComponentProps } from 'react';
import { FlatList, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Tabs } from 'heroui-native/tabs';
import {
  LOG_CATEGORIES,
  selectLogEntries,
  type LogEntry,
  type LogFilter,
} from '../../engine/logging/LogEngine';
import { useCharacterGame } from '../menu/CharacterGameContext';
import { useAppScreenChrome } from '../navigation/AppScreenChrome';
import { DungeonButton, DungeonCard } from '../shared/DungeonUI';
import KeyboardChoiceGroup from '../shared/KeyboardChoiceGroup';
import { menu } from '../menu/MenuUI';
import { formatLogTimestamp } from './formatLogTimestamp';

const filters: readonly LogFilter[] = ['all', ...LOG_CATEGORIES];
const title = (value: string) => value[0].toUpperCase() + value.slice(1);
const LogRow = memo(function LogRow({ entry }: { entry: LogEntry }) {
  return (
    <DungeonCard>
      <View className="flex-row flex-wrap justify-between gap-2">
        <Text className="text-accent text-xs font-semibold">{title(entry.category)}</Text>
        <Text className="text-muted text-xs">{formatLogTimestamp(entry.timestamp)}</Text>
      </View>
      <Text className="text-foreground" style={menu.body}>
        {entry.message}
      </Text>
    </DungeonCard>
  );
});
const renderRow: NonNullable<ComponentProps<typeof FlatList<LogEntry>>['renderItem']> = ({
  item,
}) => <LogRow entry={item} />;
const key = (entry: LogEntry) => entry.id;
export default function LogsScreen() {
  const { host, profile } = useCharacterGame();
  const { edges } = useAppScreenChrome();
  const snapshot = useSyncExternalStore(
    host.logs.subscribe,
    host.logs.getSnapshot,
    host.logs.getSnapshot,
  );
  const [filter, setFilter] = useState<LogFilter>('all');
  const entries = useMemo(() => selectLogEntries(snapshot, filter), [snapshot, filter]);
  return (
    <SafeAreaView edges={edges} className="flex-1 bg-background">
      <Tabs
        value={filter}
        onValueChange={(value) => setFilter(value as LogFilter)}
        className="flex-1"
      >
        <View className="w-full max-w-[680px] self-center gap-3 px-5 pb-4 pt-6">
          <View className="flex-row items-center justify-between gap-3">
            <Text accessibilityRole="header" className="text-foreground" style={menu.title}>
              Logs
            </Text>
            <DungeonButton
              label="Clear logs"
              disabled={snapshot.count === 0}
              onPress={host.logs.clear}
            />
          </View>
          <Text className="text-muted" style={menu.body}>
            {profile.name} · {snapshot.count} messages · Current visit
          </Text>

          <KeyboardChoiceGroup itemRole="tab" value={filter}>
            <Tabs.List
              accessibilityLabel="Log filters"
              className="w-full border border-border bg-surface"
            >
              <Tabs.ScrollView>
                <Tabs.Indicator className="rounded-lg bg-surface-tertiary" />
                {filters.map((value) => (
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
            renderItem={renderRow}
            keyExtractor={key}
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
              <Text className="text-muted" style={menu.body}>
                {snapshot.count === 0
                  ? 'No logs yet. Your next game action will appear here.'
                  : `No ${filter} logs yet.`}
              </Text>
            }
          />
        </Tabs.Content>
      </Tabs>
    </SafeAreaView>
  );
}
