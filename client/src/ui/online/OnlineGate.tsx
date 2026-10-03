import type { PropsWithChildren } from 'react';
import { useOnline, useOnlineAccess } from '../../online/OnlineProvider';
import AccountScreen from './AccountScreen';
export default function OnlineGate({ children }: PropsWithChildren) {
  const { session } = useOnline();
  const access = useOnlineAccess();
  return session && access.verified && access.online && access.foreground ? (
    children
  ) : (
    <AccountScreen />
  );
}
