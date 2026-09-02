import {
  directionBetween,
  directionFromKey,
  directionFromSwipe,
} from '@/presentation/run/input-map';

describe('input mappings (all methods → identical cardinal commands)', () => {
  it('maps arrows and WASD to cardinal directions', () => {
    expect(directionFromKey('ArrowUp')).toEqual({ dx: 0, dy: -1 });
    expect(directionFromKey('ArrowDown')).toEqual({ dx: 0, dy: 1 });
    expect(directionFromKey('ArrowLeft')).toEqual({ dx: -1, dy: 0 });
    expect(directionFromKey('ArrowRight')).toEqual({ dx: 1, dy: 0 });
    expect(directionFromKey('w')).toEqual(directionFromKey('ArrowUp'));
    expect(directionFromKey('A')).toEqual(directionFromKey('ArrowLeft'));
    expect(directionFromKey('s')).toEqual(directionFromKey('ArrowDown'));
    expect(directionFromKey('D')).toEqual(directionFromKey('ArrowRight'));
    expect(directionFromKey('Space')).toBeNull();
    expect(directionFromKey('Enter')).toBeNull();
  });

  it('maps swipes by dominant axis past a threshold', () => {
    expect(directionFromSwipe(40, 0)).toEqual({ dx: 1, dy: 0 });
    expect(directionFromSwipe(-40, 0)).toEqual({ dx: -1, dy: 0 });
    expect(directionFromSwipe(0, 40)).toEqual({ dx: 0, dy: 1 });
    expect(directionFromSwipe(0, -40)).toEqual({ dx: 0, dy: -1 });
    // Ambiguous short gestures never produce a command.
    expect(directionFromSwipe(10, 0)).toBeNull();
    expect(directionFromSwipe(0, 0)).toBeNull();
    // Dominant axis wins on diagonals.
    expect(directionFromSwipe(60, 30)).toEqual({ dx: 1, dy: 0 });
    expect(directionFromSwipe(30, -60)).toEqual({ dx: 0, dy: -1 });
  });

  it('maps adjacent taps to cardinal steps only', () => {
    expect(directionBetween(5, 5, 6, 5)).toEqual({ dx: 1, dy: 0 });
    expect(directionBetween(5, 5, 5, 4)).toEqual({ dx: 0, dy: -1 });
    // Non-adjacent taps are not single steps (tap-to-walk handles them).
    expect(directionBetween(5, 5, 7, 5)).toBeNull();
    expect(directionBetween(5, 5, 5, 5)).toBeNull();
    expect(directionBetween(5, 5, 6, 6)).toBeNull();
  });
});
