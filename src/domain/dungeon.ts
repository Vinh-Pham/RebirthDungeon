import { nextRandom } from './dice';
import type { Dungeon, Room } from './model';
export const TILE = 32;
export function generateDungeon(seed: number): Dungeon {
    const original = seed;
    const cells: { x: number; y: number }[] = [];
    const seen = new Set<string>();
    // A randomized connected tree: the deepest leaf is the boss, with two side rooms.
    let x = 2,
        y = 2;
    cells.push({ x, y });
    seen.add(`${x},${y}`);
    for (let i = 1; i < 7; i++) {
        const candidates = cells
            .flatMap((c) =>
                [
                    [0, 1],
                    [1, 0],
                    [0, -1],
                    [-1, 0],
                ].map(([dx, dy]) => ({ x: c.x + dx, y: c.y + dy, parent: c })),
            )
            .filter(
                (c) => c.x >= 0 && c.x < 5 && c.y >= 0 && c.y < 5 && !seen.has(`${c.x},${c.y}`),
            );
        let n;
        [seed, n] = nextRandom(seed);
        const pick = candidates[Math.floor(n * candidates.length)];
        cells.push(pick);
        seen.add(`${pick.x},${pick.y}`);
    }
    const tiles = Array.from({ length: 65 }, () => Array<number>(65).fill(0));
    const rooms: Room[] = cells.map((c, id) => ({
        id,
        x: c.x * 13 + 6,
        y: c.y * 13 + 6,
        kind: id === 0 ? 'entry' : id === 6 ? 'boss' : id === 5 ? 'supplies' : 'encounter',
        trigger: id === 2 ? 'chest' : id === 3 ? 'switch' : 'spider',
        required: id > 0 && id < 4,
    }));
    for (const room of rooms) {
        for (let yy = room.y - 4; yy <= room.y + 4; yy++)
            for (let xx = room.x - 4; xx <= room.x + 4; xx++) tiles[yy][xx] = 1;
    }
    for (let i = 1; i < cells.length; i++) {
        const cell = cells[i] as (typeof cells)[number] & { parent: (typeof cells)[number] };
        const p = cell.parent;
        let xx = p.x * 13 + 6,
            yy = p.y * 13 + 6;
        const dest = rooms[i];
        while (xx !== dest.x || yy !== dest.y) {
            for (let dy = -1; dy <= 1; dy++)
                for (let dx = -1; dx <= 1; dx++) tiles[yy + dy][xx + dx] = 1;
            if (xx !== dest.x) xx += Math.sign(dest.x - xx);
            else yy += Math.sign(dest.y - yy);
        }
    }
    return {
        id: `alby-${original}`,
        seed: original,
        tiles,
        rooms,
        cleared: [],
        visited: [0],
        x: rooms[0].x * TILE + 16,
        y: rooms[0].y * TILE + 16,
        chests: [],
        chosen: null,
    };
}
export function findPath(
    grid: readonly (readonly number[])[],
    start: { x: number; y: number },
    end: { x: number; y: number },
): { x: number; y: number }[] {
    if (!grid[end.y]?.[end.x] || !grid[start.y]?.[start.x]) return [];
    const key = (p: { x: number; y: number }) => `${p.x},${p.y}`;
    const frontier = [start];
    const from = new Map<string, { x: number; y: number }>();
    const cost = new Map([[key(start), 0]]);
    while (frontier.length) {
        frontier.sort(
            (a, b) =>
                cost.get(key(a))! +
                Math.abs(a.x - end.x) +
                Math.abs(a.y - end.y) -
                (cost.get(key(b))! + Math.abs(b.x - end.x) + Math.abs(b.y - end.y)),
        );
        const cur = frontier.shift()!;
        if (cur.x === end.x && cur.y === end.y) {
            const path = [cur];
            while (key(path[0]) !== key(start)) path.unshift(from.get(key(path[0]))!);
            return path.slice(1);
        }
        for (const [dx, dy] of [
            [0, -1],
            [1, 0],
            [0, 1],
            [-1, 0],
        ]) {
            const p = { x: cur.x + dx, y: cur.y + dy },
                k = key(p);
            if (!grid[p.y]?.[p.x]) continue;
            const score = cost.get(key(cur))! + 1;
            if (score < (cost.get(k) ?? Infinity)) {
                cost.set(k, score);
                from.set(k, cur);
                frontier.push(p);
            }
        }
    }
    return [];
}
