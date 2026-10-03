import { apiConfiguration, localWebAddress } from './config';
export function onlineWebAddress(): string | undefined {
  return typeof window === 'undefined'
    ? undefined
    : localWebAddress(apiConfiguration.url, window.location.href, __DEV__);
}
export function openOnlineWebAddress(): void {
  const address = onlineWebAddress();
  if (address) window.location.assign(address);
}
