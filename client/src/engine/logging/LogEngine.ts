import { z } from 'zod';
import { freeze } from 'immer';

export const LOG_CATEGORIES = ['combat', 'movement', 'user', 'system'] as const;
export type LogCategory = (typeof LOG_CATEGORIES)[number];
export type LogFilter = 'all' | LogCategory;
const InputSchema = z.strictObject({
  category: z.enum(LOG_CATEGORIES),
  type: z.string().min(1),
  message: z.string().min(1),
  characterId: z.string().optional(),
  characterName: z.string().optional(),
  encounterId: z.string().optional(),
  actorId: z.string().optional(),
  actionId: z.string().optional(),
  metadata: z.record(z.string(), z.json()).optional(),
});
export type LogJson =
  | string
  | number
  | boolean
  | null
  | readonly LogJson[]
  | { readonly [key: string]: LogJson };
export interface LogInput {
  readonly category: LogCategory;
  readonly type: string;
  readonly message: string;
  readonly characterId?: string;
  readonly characterName?: string;
  readonly encounterId?: string;
  readonly actorId?: string;
  readonly actionId?: string;
  readonly metadata?: Readonly<Record<string, LogJson>>;
}
export type LogEntry = LogInput & {
  readonly id: string;
  readonly sequence: number;
  readonly timestamp: number;
};
export interface LogSink {
  append(entries: readonly LogInput[]): void;
}
export interface LogSnapshot {
  readonly revision: number;
  readonly count: number;
  readonly chunks: readonly (readonly LogEntry[])[];
}
const CHUNK_SIZE = 128;
const initial: LogSnapshot = Object.freeze({ revision: 0, count: 0, chunks: Object.freeze([]) });

export function copyLogInput(input: LogInput): LogInput {
  return freeze(InputSchema.parse(input), true);
}

/** Append-only immutable messages. Clearing releases history; sequence IDs are never reused. */
export class LogEngine implements LogSink {
  private snapshot = initial;
  private sequence = 0;
  private readonly listeners = new Set<() => void>();
  constructor(private readonly now: () => number) {}
  getSnapshot = (): LogSnapshot => this.snapshot;
  subscribe = (listener: () => void) => {
    const subscription = () => listener();
    this.listeners.add(subscription);
    return () => {
      this.listeners.delete(subscription);
    };
  };
  append(inputs: readonly LogInput[]) {
    if (!inputs.length) return;
    // Parse the whole batch into detached plain JSON before publishing any of it.
    const parsed = inputs.map((input) => InputSchema.parse(input));
    const timestamp = this.now();
    if (!Number.isSafeInteger(timestamp) || Math.abs(timestamp) > 8640000000000000)
      throw new Error('Invalid log timestamp');
    if (!Number.isSafeInteger(this.sequence + parsed.length))
      throw new Error('Log sequence exhausted');
    const entries = parsed.map((input, index) =>
      freeze(
        {
          ...input,
          timestamp,
          sequence: this.sequence + index + 1,
          id: `log-${this.sequence + index + 1}`,
        },
        true,
      ),
    );
    const chunks = [...this.snapshot.chunks];
    for (const entry of entries) {
      const tail = chunks.at(-1);
      if (tail && tail.length < CHUNK_SIZE)
        chunks[chunks.length - 1] = Object.freeze([...tail, entry]);
      else chunks.push(Object.freeze([entry]));
    }
    this.sequence += entries.length;
    this.snapshot = Object.freeze({
      revision: this.snapshot.revision + 1,
      count: this.snapshot.count + entries.length,
      chunks: Object.freeze(chunks),
    });
    this.notify();
  }
  clear = () => {
    if (!this.snapshot.count) return;
    this.snapshot = Object.freeze({
      revision: this.snapshot.revision + 1,
      count: 0,
      chunks: initial.chunks,
    });
    this.notify();
  };
  private notify() {
    for (const listener of [...this.listeners]) {
      if (!this.listeners.has(listener)) continue;
      try {
        listener();
      } catch {
        /* Observers cannot reject accepted gameplay or messages. */
      }
    }
  }
}
export function selectLogEntries(
  snapshot: LogSnapshot,
  filter: LogFilter = 'all',
): readonly LogEntry[] {
  return Object.freeze(
    snapshot.chunks
      .flat()
      .filter((entry) => filter === 'all' || entry.category === filter)
      .reverse(),
  );
}
/** Logging is an observer and cannot turn a committed action into a gameplay failure. */
export function appendLogs(sink: LogSink | undefined, entries: readonly LogInput[]) {
  if (!sink || !entries.length) return;
  try {
    sink.append(entries);
  } catch {
    /* Gameplay remains authoritative if a logging sink fails. */
  }
}
