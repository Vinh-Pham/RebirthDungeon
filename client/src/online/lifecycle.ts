import { AppState } from 'react-native';
import * as Network from 'expo-network';
export function observeConnection(
  change: (online: boolean, foreground: boolean) => void,
): () => void {
  let online = true;
  let foreground = AppState.currentState === null || AppState.currentState === 'active';
  let received = false;
  const publish = () => change(online, foreground);
  const updateNetwork = (state: Network.NetworkState) => {
    received = true;
    online = state.isConnected !== false && state.isInternetReachable !== false;
    publish();
  };
  const network = Network.addNetworkStateListener(updateNetwork);
  void Network.getNetworkStateAsync()
    .then((state) => {
      if (!received) updateNetwork(state);
    })
    .catch(() => publish());
  const app = AppState.addEventListener('change', (state) => {
    foreground = state === 'active';
    publish();
  });
  publish();
  return () => {
    received = true;
    network.remove();
    app.remove();
  };
}
