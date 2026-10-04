import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type PropsWithChildren,
} from 'react';
import {
  QueryClient,
  QueryClientProvider,
  focusManager,
  onlineManager,
  useMutation,
  useQuery,
} from '@tanstack/react-query';
import { createCommandId } from './commandId';
import { Platform } from 'react-native';
import { z } from 'zod';
import { OnlineAccess } from './Access';
import { GameAPI, StaleAccessError, retryRead } from './API';
import { getAuthClient, requestCredentials } from './auth-client';
import { apiConfiguration, requireAPIURL } from './config';
import {
  authenticationError,
  connectionStatus,
  withConnectionTimeout,
  type ConnectionStatus,
} from './ConnectionStatus';
import { onlineWebAddress } from './localWeb';
import { observeConnection } from './lifecycle';
import { createCommandJournal } from './createCommandJournal';
import { ActivityOutbox } from './ActivityOutbox';
import { createActivityStorage } from './createActivityStorage';
import { CommandCoordinator } from './CommandCoordinator';

const sessionSchema = z.object({
  user: z.object({ id: z.string(), name: z.string(), email: z.string() }),
  session: z.object({ expiresAt: z.coerce.date() }),
});
export type AccountSession = { user: z.infer<typeof sessionSchema>['user']; expiresAt: number };
interface OnlineContextValue {
  access: OnlineAccess;
  api?: GameAPI;
  commands?: CommandCoordinator;
  activity?: ActivityOutbox;
  session?: AccountSession;
  loading: boolean;
  connectionStatus: ConnectionStatus;
  webAddress?: string;
  changing: boolean;
  error?: string;
  refreshSession(): Promise<void>;
  authenticate(mode: 'sign-in' | 'sign-up', email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
}
const OnlineContext = createContext<OnlineContextValue | null>(null);
export function OnlineProvider({ children }: PropsWithChildren) {
  const [queries] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: retryRead, gcTime: 300000 },
          mutations: { retry: false, networkMode: 'always' },
        },
      }),
  );
  const [access] = useState(() => new OnlineAccess());
  return (
    <QueryClientProvider client={queries}>
      <OnlineServices queries={queries} access={access}>
        {children}
      </OnlineServices>
    </QueryClientProvider>
  );
}
function OnlineServices({
  queries,
  access,
  children,
}: PropsWithChildren<{ queries: QueryClient; access: OnlineAccess }>) {
  const started = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const webAddress = started ? onlineWebAddress() : undefined;
  const [changing, setChanging] = useState(false);
  const [authError, setAuthError] = useState<string>();
  const activeChange = useRef(false);
  const snapshot = useSyncExternalStore(access.subscribe, access.getSnapshot, access.getSnapshot);
  const [api] = useState(() =>
    apiConfiguration.url
      ? new GameAPI({
          origin: apiConfiguration.url,
          access,
          credentials: requestCredentials,
          onUnauthorized() {
            access.invalidate();
            void queries.cancelQueries({ queryKey: ['game'] });
            queries.removeQueries({ queryKey: ['game'] });
            setAuthError('Your session expired or was replaced. Sign in again.');
            void queries.invalidateQueries({ queryKey: ['auth'] });
          },
        })
      : undefined,
  );
  const [commands] = useState(() => {
    let journal: ReturnType<typeof createCommandJournal> | undefined;
    return api
      ? new CommandCoordinator({
          api,
          access,
          queries,
          uuid: createCommandId,
          journal: () =>
            (journal ??= createCommandJournal().catch((error) => {
              journal = undefined;
              throw error;
            })),
        })
      : undefined;
  });
  const [activity] = useState(() => {
    let storage: ReturnType<typeof createActivityStorage> | undefined;
    return api
      ? new ActivityOutbox({
          api,
          access,
          uuid: createCommandId,
          now: Date.now,
          storage: () =>
            (storage ??= createActivityStorage().catch((error) => {
              storage = undefined;
              throw error;
            })),
          acknowledged: (characterId, userId) => {
            void queries.invalidateQueries({
              queryKey: ['game', api.origin, userId, 'logs', characterId],
            });
          },
        })
      : undefined;
  });
  useEffect(() => activity?.start(), [activity]);
  const session = useQuery({
    queryKey: ['auth', apiConfiguration.url ?? 'unconfigured', 'session'],
    enabled: started && !!api && !webAddress && !changing && snapshot.online && snapshot.foreground,
    staleTime: 30000,
    retry: retryRead,
    queryFn: async ({ signal }) => {
      const lease = access.getSnapshot();
      const result = await withConnectionTimeout(signal, (requestSignal) =>
        getAuthClient().getSession({
          query: { disableCookieCache: true },
          fetchOptions: { signal: requestSignal },
        }),
      );
      if (!access.matches(lease)) throw new StaleAccessError();
      if (result.error && result.error.status !== 401)
        throw authenticationError(result.error, 'Authentication unavailable');
      const parsed = result.data && !result.error ? sessionSchema.parse(result.data) : undefined;
      return {
        lease,
        account: parsed
          ? { user: parsed.user, expiresAt: parsed.session.expiresAt.getTime() }
          : undefined,
      };
    },
  });
  useEffect(() => {
    return observeConnection((online, foreground) => {
      access.connection(online, foreground);
      onlineManager.setOnline(online);
      if (Platform.OS !== 'web') focusManager.setFocused(foreground);
      if (online && foreground && api) void queries.invalidateQueries({ queryKey: ['auth'] });
    });
  }, [access, api, queries]);
  useEffect(() => {
    if (!session.data || !access.matches(session.data.lease)) return;
    const previous = access.getSnapshot().userId;
    const accepted = access.accept(session.data.account?.user.id, session.data.lease);
    if (accepted && previous !== session.data.account?.user.id) {
      void queries.cancelQueries({ queryKey: ['game'] });
      queries.removeQueries({ queryKey: ['game'] });
    }
  }, [session.data, access, queries]);
  useEffect(() => {
    const expiry = session.data?.account?.expiresAt;
    if (!expiry) return;
    const timer = setTimeout(
      () => {
        access.invalidate();
        void queries.invalidateQueries({ queryKey: ['auth'] });
      },
      Math.min(2147483647, Math.max(0, expiry - Date.now())),
    );
    return () => clearTimeout(timer);
  }, [session.data, access, queries]);
  const beginChange = async () => {
    if (activeChange.current) throw new Error('An account request is already pending.');
    if (!access.getSnapshot().online || !access.getSnapshot().foreground)
      throw new Error('Connect to the server to manage your account.');
    if (webAddress)
      throw new Error('Open the configured online play address to manage your account.');
    requireAPIURL();
    activeChange.current = true;
    setChanging(true);
    setAuthError(undefined);
    void activity?.flush();
    access.invalidate();
    await queries.cancelQueries({ queryKey: ['auth'] });
    await queries.cancelQueries({ queryKey: ['game'] });
    queries.removeQueries({ queryKey: ['game'] });
  };
  const finishChange = async () => {
    activeChange.current = false;
    setChanging(false);
    if (api && !webAddress && access.getSnapshot().online && access.getSnapshot().foreground)
      await session.refetch();
  };
  const signIn = useMutation({
    mutationKey: ['auth', 'authenticate'],
    retry: false,
    networkMode: 'always',
    onMutate: beginChange,
    mutationFn: async ({
      mode,
      email,
      password,
    }: {
      mode: 'sign-in' | 'sign-up';
      email: string;
      password: string;
    }) => {
      const client = getAuthClient();
      const result =
        mode === 'sign-up'
          ? await client.signUp.email({
              name: 'Player',
              email: email.trim().toLowerCase(),
              password,
            })
          : await client.signIn.email({ email: email.trim().toLowerCase(), password });
      if (result.error) throw authenticationError(result.error, 'Unable to sign in.');
    },
    onError: (error) => setAuthError(error.message),
    onSettled: finishChange,
  });
  const signOut = useMutation({
    mutationKey: ['auth', 'sign-out'],
    retry: false,
    networkMode: 'always',
    onMutate: beginChange,
    mutationFn: async () => {
      const result = await getAuthClient().signOut();
      if (result.error) throw authenticationError(result.error, 'Sign-out failed. Try again.');
    },
    onError: (error) => setAuthError(error.message),
    onSettled: finishChange,
  });
  return (
    <OnlineContext
      value={{
        access,
        api,
        commands,
        activity,
        session: snapshot.verified ? session.data?.account : undefined,
        webAddress,
        loading:
          started &&
          !!api &&
          !webAddress &&
          !snapshot.verified &&
          session.isFetching &&
          snapshot.online,
        changing,
        connectionStatus: connectionStatus({
          webAddress,
          configured: !!api,
          configurationError: apiConfiguration.error,
          online: snapshot.online,
          foreground: snapshot.foreground,
          fetching: session.isFetching || (started && !!api && session.isPending),
          verified: snapshot.verified,
          error: session.error,
        }),
        error:
          apiConfiguration.error ??
          (!api ? 'Online play is not configured for this app.' : undefined) ??
          authError ??
          (session.error instanceof StaleAccessError ? undefined : session.error?.message),
        refreshSession: async () => {
          if (webAddress) return;
          access.invalidate();
          await session.refetch();
        },
        authenticate: async (mode, email, password) => {
          if (activeChange.current) throw new Error('Wait for the account change to finish.');
          await signIn.mutateAsync({ mode, email, password });
        },
        signOut: async () => {
          if (activeChange.current) throw new Error('Wait for the account change to finish.');
          await signOut.mutateAsync();
        },
      }}
    >
      {children}
    </OnlineContext>
  );
}
export function useOnline() {
  const context = useContext(OnlineContext);
  if (!context) throw new Error('OnlineProvider is missing.');
  return context;
}
export function useOnlineAccess() {
  const { access } = useOnline();
  return useSyncExternalStore(access.subscribe, access.getSnapshot, access.getSnapshot);
}
