import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { CapabilitiesSchema } from '@rebirth/game-core/online/Audit';
import { useOnline } from '../../online/OnlineProvider';
import { MenuButton } from '../menu/MenuUI';
export default function AdminEntry() {
  const { api, session } = useOnline();
  const access = useQuery({
    queryKey: ['game', api?.origin, session?.user.id, 'admin', 'capabilities'],
    enabled: !!api && !!session,
    queryFn: ({ signal }) => {
      api!.assertAccount(session!.user.id);
      return api!.request('/api/admin/capabilities', CapabilitiesSchema, undefined, signal);
    },
  });
  return access.data?.admin ? (
    <MenuButton
      label="Gameplay investigations"
      secondary
      onPress={() => router.navigate('/admin/logs')}
    />
  ) : null;
}
