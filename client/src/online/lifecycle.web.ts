export function observeConnection(
  change: (online: boolean, foreground: boolean) => void,
): () => void {
  const publish = () => change(navigator.onLine, document.visibilityState !== 'hidden');
  window.addEventListener('online', publish);
  window.addEventListener('offline', publish);
  document.addEventListener('visibilitychange', publish);
  publish();
  return () => {
    window.removeEventListener('online', publish);
    window.removeEventListener('offline', publish);
    document.removeEventListener('visibilitychange', publish);
  };
}
