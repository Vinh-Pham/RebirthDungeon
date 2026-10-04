import { router } from 'expo-router';
import { useState } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Text, View } from 'react-native';
import { Input } from 'heroui-native/input';
import { Label } from 'heroui-native/label';
import { TextField } from 'heroui-native/text-field';
import {
  AuditDetailSchema,
  CapabilitiesSchema,
  ExportSchema,
  LogPageSchema,
  PlayersSchema,
} from '@rebirth/game-core/online/Audit';
import { useOnline } from '../../online/OnlineProvider';
import OnlineGate from '../online/OnlineGate';
import { MenuButton, MenuError, MenuPage, menu } from '../menu/MenuUI';
import { DungeonLoading } from '../shared/DungeonUI';
import { HistoryCard } from './LogsScreen';
import { exportHistory } from './exportHistory';

const fields = {
  userId: 'Account ID',
  characterId: 'Character ID',
  from: 'From (UTC date or ISO time)',
  to: 'Until (UTC date or ISO time)',
  category: 'Category: combat, movement, user, system',
  source: 'Source: server, client',
  outcome: 'Outcome: committed, rejected, replayed, reported, administration',
  type: 'Command or event type',
  commandId: 'Command ID',
  requestId: 'Request ID',
  encounterId: 'Encounter ID',
  revision: 'Revision',
};
function queryString(values: Record<string, string>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values))
    if (value.trim()) {
      if (key === 'from' || key === 'to') {
        const date = Date.parse(
          value.trim().length === 10
            ? `${value.trim()}T${key === 'to' ? '23:59:59.999' : '00:00:00.000'}Z`
            : value,
        );
        if (!Number.isFinite(date)) throw new Error('Enter a valid UTC date or ISO timestamp.');
        params.set(key, String(date));
      } else params.set(key, value.trim());
    }
  return params.toString();
}
export default function AdminAuditScreen() {
  return (
    <OnlineGate>
      <Investigation />
    </OnlineGate>
  );
}
function Investigation() {
  const { api, session } = useOnline();
  const userId = session!.user.id;
  const base = ['game', api!.origin, userId, 'admin'] as const;
  const request = <T extends Parameters<NonNullable<typeof api>['request']>[1]>(
    path: string,
    schema: T,
    signal?: AbortSignal,
  ) => {
    api!.assertAccount(userId);
    return api!.request(path, schema, undefined, signal);
  };
  const capabilities = useQuery({
    queryKey: [...base, 'capabilities'],
    queryFn: ({ signal }) => request('/api/admin/capabilities', CapabilitiesSchema, signal),
    refetchInterval: 30000,
  });
  const [draft, setDraft] = useState<Record<string, string>>({}),
    [filters, setFilters] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [search, setSearch] = useState(''),
    [lookup, setLookup] = useState<string>();
  const [selected, setSelected] = useState<string>(),
    [error, setError] = useState<string>();
  const [exportCursor, setExportCursor] = useState<string | null>(),
    [exporting, setExporting] = useState(false);
  const players = useQuery({
    queryKey: [...base, 'players', lookup],
    enabled: !!capabilities.data?.admin && lookup !== undefined,
    queryFn: ({ signal }) =>
      request(`/api/admin/players?q=${encodeURIComponent(lookup ?? '')}`, PlayersSchema, signal),
  });
  const history = useInfiniteQuery({
    queryKey: [...base, 'logs', filters],
    enabled: !!capabilities.data?.admin,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) =>
      request(
        `/api/admin/logs?${filters}${pageParam ? `&cursor=${encodeURIComponent(pageParam)}` : ''}`,
        LogPageSchema,
        signal,
      ),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
  const detail = useQuery({
    queryKey: [...base, 'detail', selected],
    enabled: !!capabilities.data?.admin && !!selected,
    queryFn: ({ signal }) => request(`/api/admin/logs/${selected}`, AuditDetailSchema, signal),
  });
  const apply = (next: Record<string, string>) => {
    try {
      setFilters(queryString(next));
      setDraft(next);
      setSelected(undefined);
      setExportCursor(undefined);
      setError(undefined);
    } catch (e) {
      setError((e as Error).message);
    }
  };
  if (capabilities.isPending)
    return (
      <MenuPage>
        <DungeonLoading label="Checking administrator access" />
      </MenuPage>
    );
  if (!capabilities.data?.admin)
    return (
      <MenuPage>
        <MenuError message={capabilities.error?.message ?? 'Administrator access required.'} />
        <MenuButton label="Back to account" secondary onPress={() => router.navigate('/account')} />
      </MenuPage>
    );
  const failure = history.error ?? players.error ?? detail.error;
  return (
    <MenuPage>
      <MenuButton label="Back to account" secondary onPress={() => router.navigate('/account')} />
      <Text accessibilityRole="header" className="text-foreground" style={menu.title}>
        Gameplay investigations
      </Text>
      <Text className="text-muted">
        Read-only · Last 90 days. Client reports are unverified. Rejections and retries alone do not
        prove cheating.
      </Text>
      {history.data?.pages[0] ? (
        <Text className="text-muted">
          Recording began {new Date(history.data.pages[0].recordingSince).toISOString()}
        </Text>
      ) : null}
      <TextField>
        <Label>Find a player or character</Label>
        <Input
          accessibilityLabel="Find a player or character"
          value={search}
          onChangeText={setSearch}
          placeholder="Email, account ID, character name or ID"
        />
      </TextField>
      <MenuButton label="Find player" secondary onPress={() => setLookup(search)} />
      {!failure
        ? players.data?.players.map((p) => (
            <MenuButton
              key={`${p.userId}:${p.characterId}`}
              secondary
              label={`${p.email} · ${p.name ?? 'No character'}`}
              onPress={() =>
                apply({
                  userId: p.userId,
                  ...(p.characterId ? { characterId: p.characterId } : {}),
                })
              }
            />
          ))
        : null}
      <MenuButton
        label={showFilters ? 'Hide filters' : 'Show filters'}
        secondary
        onPress={() => setShowFilters((value) => !value)}
      />
      {showFilters ? (
        <View className="gap-3">
          {Object.entries(fields).map(([key, label]) => (
            <TextField key={key}>
              <Label>{label}</Label>
              <Input
                accessibilityLabel={label}
                value={draft[key] ?? ''}
                onChangeText={(value) => setDraft((old) => ({ ...old, [key]: value }))}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </TextField>
          ))}
          <MenuButton label="Apply filters" onPress={() => apply(draft)} />
          <MenuButton label="Reset filters" secondary onPress={() => apply({})} />
        </View>
      ) : null}
      <MenuButton
        label="Refresh history"
        secondary
        disabled={history.isFetching}
        onPress={() => {
          void capabilities.refetch();
          void history.refetch();
          setExportCursor(undefined);
        }}
      />
      <MenuError message={error ?? failure?.message} />
      <MenuButton
        label={
          exportCursor
            ? 'Export next page'
            : exportCursor === null
              ? 'Export complete'
              : 'Export matching records'
        }
        secondary
        busy={exporting}
        disabled={exportCursor === null || !!failure}
        onPress={() => {
          setExporting(true);
          setError(undefined);
          void request(
            `/api/admin/logs/export?${filters}${exportCursor ? `&cursor=${encodeURIComponent(exportCursor)}` : ''}`,
            ExportSchema,
          )
            .then(async (page) => {
              await exportHistory(page.jsonl);
              setExportCursor(page.nextCursor);
            })
            .catch((e) => setError(e.message))
            .finally(() => setExporting(false));
        }}
      />
      <Text className="text-muted">
        Exports contain up to 50 records per file. Continue until Export complete; each series uses
        a fixed record boundary.
      </Text>
      {!failure && selected && detail.data ? (
        <View className="gap-3 rounded-lg border border-border p-4">
          <Text className="text-accent">Record details</Text>
          <Text selectable className="text-foreground">
            {JSON.stringify(detail.data, null, 2)}
          </Text>
          {(['commandId', 'requestId', 'encounterId', 'revision'] as const).map((field) =>
            detail.data!.record[field] != null ? (
              <MenuButton
                key={field}
                secondary
                label={`Related ${fields[field]}`}
                onPress={() =>
                  apply({
                    [field]: String(detail.data!.record[field]),
                    ...(detail.data!.record.characterId
                      ? { characterId: detail.data!.record.characterId! }
                      : {}),
                  })
                }
              />
            ) : null,
          )}
          <MenuButton label="Close details" secondary onPress={() => setSelected(undefined)} />
        </View>
      ) : null}
      {history.isPending ? <DungeonLoading label="Loading investigation history" /> : null}
      {!failure
        ? history.data?.pages
            .flatMap((p) => p.entries)
            .map((entry) => (
              <View key={entry.id} className="gap-2">
                <HistoryCard entry={entry} />
                <Text selectable className="text-muted text-xs">
                  {entry.outcome} · {entry.type} · {entry.characterId ?? 'No character'} · Revision{' '}
                  {entry.revision ?? '—'}
                </Text>
                <MenuButton
                  label="Inspect record"
                  secondary
                  onPress={() => setSelected(entry.id)}
                />
              </View>
            ))
        : null}
      {!failure && history.hasNextPage ? (
        <MenuButton
          label="Load older records"
          busy={history.isFetchingNextPage}
          onPress={() => {
            void history.fetchNextPage();
          }}
        />
      ) : null}
    </MenuPage>
  );
}
