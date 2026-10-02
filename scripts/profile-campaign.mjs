// Headless Node diagnostic; device/Hermes profiling is still required for release.
// Usage: node --expose-gc scripts/profile-campaign.mjs [alternate-checkout]
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { createServer } from 'vite';

const root = resolve(process.argv[2] ?? '.');
const server = await createServer({
  root,
  configFile: false,
  server: { middlewareMode: true },
  appType: 'custom',
});
try {
  const { loadGameContent } = await server.ssrLoadModule('/src/data/content.ts');
  const { JourneySession } = await server.ssrLoadModule('/src/game/JourneySession.ts');
  const { addItem } = await server.ssrLoadModule('/src/engine/rpg/Character.ts');
  const { generateDungeon, createDungeonRun } = await server.ssrLoadModule(
    '/src/engine/dungeon/Dungeon.ts',
  );
  const { isWalkable } = await server.ssrLoadModule('/src/engine/world/TileMap.ts');
  const content = loadGameContent();
  const sessions = [];
  const create = (state) => {
    const session = new JourneySession(content, state);
    sessions.push(session);
    return session;
  };
  const quantiles = (samples) => {
    samples.sort((a, b) => a - b);
    return {
      medianMs: samples[Math.floor(samples.length / 2)],
      p95Ms: samples[Math.floor(samples.length * 0.95)],
    };
  };
  const canonical = (value) => {
    if (Array.isArray(value)) return value.map(canonical);
    if (value && typeof value === 'object')
      return Object.fromEntries(
        Object.keys(value)
          .sort()
          .map((key) => [key, canonical(value[key])]),
      );
    return value;
  };
  const digest = (state) =>
    createHash('sha256')
      .update(JSON.stringify(canonical(state)))
      .digest('hex');
  const results = {};
  for (const populated of [false, true]) {
    const state = create().toSave();
    if (populated) {
      for (let i = 0; i < 200; i++) addItem(state.hero, 'iron-blade', 1, content);
      state.dungeon = createDungeonRun(
        generateDungeon(content.data.dungeons[0], 56789, state.hero.classId),
        { worldId: state.worldId, position: state.position },
      );
      state.worldId = state.dungeon.blueprint.world.id;
      state.position = { ...state.dungeon.blueprint.world.entry };
    }
    const session = create(state);
    const [dx, dy] = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ].find(([x, y]) =>
      isWalkable(session.map, { x: state.position.x + x, y: state.position.y + y }),
    );
    const retained = [],
      samples = [];
    const initial = session.getSnapshot();
    for (let i = 0; i < 200; i++)
      session.dispatch({
        type: 'MOVE',
        entityId: 'player',
        dx: i % 2 ? -dx : dx,
        dy: i % 2 ? -dy : dy,
      });
    globalThis.gc?.();
    const heapBefore = process.memoryUsage().heapUsed;
    for (let i = 0; i < 1000; i++) {
      const start = performance.now();
      session.dispatch({
        type: 'MOVE',
        entityId: 'player',
        dx: i % 2 ? -dx : dx,
        dy: i % 2 ? -dy : dy,
      });
      retained.push(session.getSnapshot());
      samples.push(performance.now() - start);
    }
    globalThis.gc?.();
    results[populated ? 'dungeon_200_weapons' : 'starter'] = {
      ...quantiles(samples),
      retainedHeapMiB: (process.memoryUsage().heapUsed - heapBefore) / 1024 / 1024,
      retainedSnapshots: retained.length,
      campaignDigest: digest(session.toSave()),
      sharedInventory: retained.at(-1).state.hero.inventory === initial.state.hero.inventory,
      sharedBlueprint: populated
        ? retained.at(-1).state.dungeon.blueprint === initial.state.dungeon.blueprint
        : undefined,
    };
    if (populated)
      candidateSamples('dungeon_inventory_candidate', session, {
        type: 'DROP_ITEM',
        item: { itemId: 'potion' },
        quantity: 1,
      });
    session.dispose();
  }
  function candidateSamples(name, session, command) {
    const samples = [];
    let campaignDigest;
    for (let i = 0; i < 150; i++) {
      const start = performance.now();
      const candidate = session.progressionCandidate(command);
      if (i >= 50) samples.push(performance.now() - start);
      if (i === 149) campaignDigest = digest(candidate.toSave());
      candidate.dispose();
    }
    results[name] = { ...quantiles(samples), campaignDigest };
  }
  const source = create();
  candidateSamples('inventory_candidate', source, {
    type: 'DROP_ITEM',
    item: { itemId: 'potion' },
    quantity: 1,
  });
  source.dispatch({ type: 'INTERACT', objectId: 'keeper' });
  candidateSamples('lesson_candidate', source, {
    type: 'LEARN_SKILL',
    objectId: 'keeper',
    skillId: 'smash',
  });
  source.dispatch({ type: 'TRAVEL_TO', x: 7, y: 3 });
  source.dispatch({ type: 'INTERACT', objectId: 'east' });
  source.dispatch({ type: 'TRAVEL_TO', x: 5, y: 3 });
  const battle = source.createBattle();
  const player = battle.engine.getEntity('player');
  player.combatant.attack = 10000;
  player.combatant.hitChance = 1;
  for (const entity of battle.engine.world.entities) if (entity.enemy) entity.health.current = 1;
  while (!battle.combat.result) {
    if (battle.battle.phase === 'enemyTurn') battle.advanceEnemyTurns();
    else {
      battle.dispatch({ type: 'SELECT_ACTION', action: 'attack' });
      battle.dispatch({ type: 'SELECT_TARGET', targetId: battle.battle.validTargetIds()[0] });
      battle.dispatch({ type: 'CONFIRM_ACTION' });
    }
  }
  const settlements = [];
  let campaignDigest;
  for (let i = 0; i < 150; i++) {
    const start = performance.now();
    const candidate = source.battleCandidate(battle);
    if (i >= 50) settlements.push(performance.now() - start);
    if (i === 149) campaignDigest = digest(candidate.toSave());
    candidate.dispose();
  }
  results.battle_candidate = { ...quantiles(settlements), campaignDigest };
  battle.dispose();
  sessions.forEach((session) => session.dispose());
  console.log(JSON.stringify({ runtime: process.version, gc: !!globalThis.gc, results }, null, 2));
} finally {
  await server.close();
}
