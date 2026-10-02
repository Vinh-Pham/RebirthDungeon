import { describe, expect, it, vi } from 'vitest';
import { AudioManager, type AudioBackend } from '../../audio/AudioManager';
import { EventBus } from '../../engine/EventBus';
function backend(): AudioBackend {
  return {
    configure: vi.fn(async () => {}),
    playSound: vi.fn(),
    playMusic: vi.fn(),
    stopMusic: vi.fn(),
    dispose: vi.fn(),
  };
}
describe('audio presentation services', () => {
  it('reports unsuccessful unlocking when audio configuration fails', async () => {
    const output = backend();
    output.configure = vi.fn(async () => {
      throw new Error('Audio unavailable');
    });
    const report = vi.fn();
    const manager = new AudioManager(output, report);
    expect(await manager.enable({ enabled: true, music: 0.3, sfx: 0.7 })).toBe(false);
    expect(report).toHaveBeenCalled();
    expect(output.playMusic).not.toHaveBeenCalled();
    manager.dispose();
  });
  it('plays event SFX only after enable, honors volume/mute and switches music scenes', async () => {
    const output = backend();
    const manager = new AudioManager(output);
    const events = new EventBus();
    manager.connect(events);
    const hit = {
      type: 'DAMAGE_DEALT',
      sourceId: 'player',
      targetId: 'enemy',
      amount: 4,
      critical: false,
    } as const;
    events.emit(hit);
    expect(output.playSound).not.toHaveBeenCalled();
    await manager.enable({ enabled: true, music: 0.2, sfx: 0.6 });
    events.emit(hit);
    expect(output.playSound).toHaveBeenCalledWith('hit', 0.6);
    expect(output.playMusic).toHaveBeenCalledWith('exploration', 0.2);
    manager.setScene('battle');
    expect(output.playMusic).toHaveBeenLastCalledWith('battle', 0.2);
    manager.setSettings({ enabled: false, music: 1, sfx: 1 });
    events.emit(hit);
    expect(output.playSound).toHaveBeenCalledTimes(1);
    expect(output.stopMusic).toHaveBeenCalled();
    manager.dispose();
  });
  it('suspends in background and releases all players/subscriptions once', async () => {
    const output = backend();
    const manager = new AudioManager(output);
    const events = new EventBus();
    manager.connect(events);
    await manager.enable({ enabled: true, music: 0.3, sfx: 1 });
    manager.suspend(true);
    events.emit({ type: 'LOOT_RECEIVED', experience: 20, gold: 10 });
    expect(output.playSound).not.toHaveBeenCalled();
    manager.suspend(false);
    events.emit({ type: 'LOOT_RECEIVED', experience: 20, gold: 10 });
    expect(output.playSound).toHaveBeenCalledWith('loot', 1);
    manager.dispose();
    manager.dispose();
    events.emit({ type: 'LOOT_RECEIVED', experience: 20, gold: 10 });
    expect(output.dispose).toHaveBeenCalledTimes(1);
    expect(output.playSound).toHaveBeenCalledTimes(1);
  });
  it('isolates audio failures from game event delivery and handles disposal during initialization', async () => {
    const output = backend();
    output.playSound = () => {
      throw new Error('Audio interrupted');
    };
    const error = vi.fn();
    const manager = new AudioManager(output, error);
    const events = new EventBus();
    manager.connect(events);
    await manager.enable({ enabled: true, music: 0, sfx: 1 });
    expect(() =>
      events.emit({ type: 'WORLD_MOVED', entityId: 'player', x: 1, y: 2 }),
    ).not.toThrow();
    expect(error).toHaveBeenCalled();
    expect(() => manager.setSettings({ enabled: true, music: -1, sfx: 1 })).toThrow('volume');
    manager.dispose();
    const late = backend();
    const lateManager = new AudioManager(late);
    const pending = lateManager.enable({ enabled: true, music: 1, sfx: 1 });
    lateManager.dispose();
    await pending;
    expect(late.playMusic).not.toHaveBeenCalled();
  });
});
