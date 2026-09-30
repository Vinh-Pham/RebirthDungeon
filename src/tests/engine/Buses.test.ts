import { describe, expect, it, vi } from 'vitest';
import { CommandBus, EventBus, type GameEvent } from '../../engine';

const damage: GameEvent = { type: 'DAMAGE_DEALT', sourceId: 'a', targetId: 'b', amount: 2, critical: false };

describe('event bus', () => {
  it('delivers typed and all-event subscriptions in order with independent cleanup', () => {
    const bus = new EventBus();
    const calls: string[] = [];
    const unsubscribe = bus.on('DAMAGE_DEALT', (event) => calls.push(`damage:${event.amount}`));
    bus.subscribe((event) => calls.push(event.type));
    bus.emit(damage);
    unsubscribe();
    unsubscribe();
    bus.emit({ type: 'ENTITY_DIED', entityId: 'b' });
    bus.clear();
    bus.emit(damage);
    expect(calls).toEqual(['damage:2', 'DAMAGE_DEALT', 'ENTITY_DIED']);
  });

  it('defers new listeners and honors unsubscription during delivery', () => {
    const bus = new EventBus();
    const late = vi.fn();
    const removed = vi.fn();
    let added = false;
    bus.subscribe(() => {
      unsubscribe();
      if (!added) { bus.subscribe(late); added = true; }
    });
    const unsubscribe = bus.subscribe(removed);
    bus.emit(damage);
    expect(removed).not.toHaveBeenCalled();
    expect(late).not.toHaveBeenCalled();
    bus.emit(damage);
    expect(late).toHaveBeenCalledOnce();
  });

  it('notifies remaining consumers before propagating listener errors', () => {
    const bus = new EventBus();
    const listener = vi.fn();
    bus.subscribe(() => { throw new Error('consumer failed'); });
    bus.subscribe(listener);
    expect(() => bus.emit(damage)).toThrow(AggregateError);
    expect(listener).toHaveBeenCalledWith(damage);
  });

  it('allows the same callback to have independent subscriptions', () => {
    const bus = new EventBus();
    const listener = vi.fn();
    const unsubscribe = bus.subscribe(listener);
    bus.subscribe(listener);
    unsubscribe();
    bus.emit(damage);
    expect(listener).toHaveBeenCalledOnce();
  });
});

describe('command bus', () => {
  it('dispatches synchronously and prevents ambiguous handlers', () => {
    const bus = new CommandBus();
    const handler = vi.fn();
    const unsubscribe = bus.register('ATTACK', handler);
    const command = { type: 'ATTACK' as const, attackerId: 'a', targetId: 'b' };
    expect(() => bus.register('ATTACK', handler)).toThrow('already registered');
    bus.dispatch(command);
    expect(handler).toHaveBeenCalledWith(command);
    unsubscribe();
    const replacement = vi.fn();
    bus.register('ATTACK', replacement);
    unsubscribe();
    bus.dispatch(command);
    expect(replacement).toHaveBeenCalledOnce();
    bus.clear();
    expect(() => bus.dispatch(command)).toThrow('No command handler');
  });

  it('rejects malformed commands before invoking handlers', () => {
    const bus = new CommandBus();
    const handler = vi.fn();
    bus.register('MOVE', handler);
    bus.register('ATTACK', handler);
    expect(() => bus.dispatch({ type: 'MOVE', entityId: 'a', dx: NaN, dy: 0 })).toThrow('Invalid');
    expect(() => bus.dispatch({ type: 'ATTACK', attackerId: ' ', targetId: 'b' })).toThrow('Invalid');
    expect(handler).not.toHaveBeenCalled();
  });
});
