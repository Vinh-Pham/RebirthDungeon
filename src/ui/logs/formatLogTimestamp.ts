import { format } from 'date-fns';
/** Local display only. The original millisecond timestamp never changes. */
export function formatLogTimestamp(timestamp: number): string {
  return format(timestamp, "MMM d, yyyy 'at' h:mm:ss a");
}
