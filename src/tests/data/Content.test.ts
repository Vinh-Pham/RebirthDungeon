import { describe, expect, it } from 'vitest';
import { loadGameContent } from '../../data/content';
import { ContentRegistry } from '../../engine/data/ContentRegistry';
import { ContentSchema } from '../../data/schemas/content';

function data() { return structuredClone(loadGameContent().data); }
describe('validated game content', () => {
  it('loads every requested content category and creates independent entity components', () => {
    const content = loadGameContent();
    for (const entries of Object.values(content.data)) expect(entries.length).toBeGreaterThan(0);
    const first = content.spawn('slime', 'first', 'enemy', 1, 2);
    const second = content.spawn('slime', 'second', 'enemy', 3, 4);
    first.health!.current = 0; first.combatant!.attack = 999; first.skills!.push('fireball'); first.sprite!.idleFrames![0] = 3;
    expect(second.health!.current).toBe(34); expect(second.combatant!.attack).toBe(8);
    expect(content.data.enemies[0].combatant.attack).toBe(8);
    expect(second.skills).toEqual([]); expect(second.sprite?.idleFrames).toEqual([2, 3]);
    expect(content.data.enemies[0].sprite.idleFrames).toEqual([2, 3]);
  });
  it('adds a new enemy and skill entirely through validated data', () => {
    const raw = data();
    raw.skills.push({ ...raw.skills[0], id: 'ice-lance', name: 'Ice lance', element: 'ice', power: 24 });
    raw.enemies.push({ ...raw.enemies[0], id: 'ice-slime', name: 'Ice slime', skills: ['ice-lance'] });
    const content = new ContentRegistry(raw);
    expect(content.spawn('ice-slime', 'new-enemy', 'enemy', 0, 0).skills).toEqual(['ice-lance']);
    expect(content.skill('ice-lance').power).toBe(24);
  });
  it('rejects malformed values, duplicate IDs, broken references, and invalid atlas frames', () => {
    const mutations = [
      (raw: ReturnType<typeof data>) => { raw.enemies[0].maxHealth = -1; },
      (raw: ReturnType<typeof data>) => { raw.classes[0].combatant.attack = Number.MAX_SAFE_INTEGER; },
      (raw: ReturnType<typeof data>) => { raw.skills[0].power = Number.MAX_SAFE_INTEGER; },
      (raw: ReturnType<typeof data>) => { raw.skills[0].manaCost = 1.5; },
      (raw: ReturnType<typeof data>) => { raw.classes[0].combatant.hitChance = 2; },
      (raw: ReturnType<typeof data>) => { raw.enemies.push(raw.enemies[0]); },
      (raw: ReturnType<typeof data>) => { raw.classes[0].skills.push('missing'); },
      (raw: ReturnType<typeof data>) => { raw.enemies[0].sprite.frame = 100; },
      (raw: ReturnType<typeof data>) => { raw.enemies[0].sprite.idleFrames = [99]; },
      (raw: ReturnType<typeof data>) => { raw.enemies[0].sprite.atlas = 'missing'; },
      (raw: ReturnType<typeof data>) => { raw.skills[0].target = 'self'; },
    ];
    for (const mutate of mutations) { const raw = data(); mutate(raw); expect(ContentSchema.safeParse(raw).success).toBe(false); }
  });
  it('rejects maps with invalid tiles, spawn bounds, blocked spawns or unknown definitions', () => {
    const mutations = [
      (raw: ReturnType<typeof data>) => { raw.maps[0].tiles.pop(); },
      (raw: ReturnType<typeof data>) => { raw.maps[0].spawns[0].x = 100; },
      (raw: ReturnType<typeof data>) => { raw.maps[0].spawns[0].x = 0; },
      (raw: ReturnType<typeof data>) => { raw.maps[0].spawns[0].definitionId = 'missing'; },
      (raw: ReturnType<typeof data>) => { raw.maps[0].spawns[1].entityId = raw.maps[0].spawns[0].entityId; },
    ];
    for (const mutate of mutations) { const raw = data(); mutate(raw); expect(() => new ContentRegistry(raw)).toThrow(); }
  });
});
