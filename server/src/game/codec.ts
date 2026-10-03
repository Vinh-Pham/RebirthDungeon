import type { OnlineState } from '@rebirth/game-core/online/Runtime';
import type { PersistedBattleState } from '@rebirth/game-core/game/BattleSession';
import { CampaignSchema } from '@rebirth/game-core/persistence/SaveSchema';
import { gameTables, type Row, type Rows, type TableName } from './tables.js';

const emptyRows = () =>
  Object.fromEntries(gameTables.map((t) => [t.name, []])) as unknown as Rows;
const n = (r: Row, key: string) => {
  const value = r[key];
  if (typeof value !== 'number') throw new Error('Invalid numeric column');
  return value;
};
const s = (r: Row, key: string) => {
  const value = r[key];
  if (typeof value !== 'string') throw new Error('Invalid text column');
  return value;
};
const optional = (r: Row, key: string) =>
  r[key] === null ? undefined : s(r, key);
const ordered = (rows: Row[], key = 'position') =>
  [...rows].sort((a, b) => n(a, key) - n(b, key));
const singleton = (rows: Row[]) => {
  if (rows.length !== 1) throw new Error('Missing state row');
  return rows[0];
};
const words = (row: Row) => [0, 1, 2, 3].map((i) => n(row, `word${i}`));
const wordColumns = (state: number[]) =>
  Object.fromEntries(state.map((word, i) => [`word${i}`, word]));

export function encodeState(id: string, state: OnlineState): Rows {
  const rows = emptyRows();
  const add = (
    table: string,
    row: Record<string, string | number | null | undefined>,
  ) => {
    const name = `game_${table}` as TableName;
    const descriptor = gameTables.find((t) => t.name === name)!;
    rows[name].push(
      Object.fromEntries(
        descriptor.columns.map((column) => [
          column,
          column === 'character_id' ? id : (row[column] ?? null),
        ]),
      ),
    );
  };
  const c = state.campaign,
    h = c.hero;
  add('heroes', {
    class_id: h.classId,
    level: h.level,
    cumulative_level: h.cumulativeLevel,
    experience: h.experience,
    gold: h.gold,
    ap: h.ap,
    health: h.health,
    mana: h.mana,
    stamina: h.stamina,
    wounds: h.wounds,
    fullness_tenths: Math.round(h.fullness * 10),
    next_weapon_id: h.nextWeaponId,
    next_armor_id: h.nextArmorId,
  });
  add('campaigns', {
    world_id: c.worldId,
    x: c.position.x,
    y: c.position.y,
    encounter_count: c.encounterCount,
    active_service: state.context.activeService,
    resting: +state.context.resting,
    last_rest_tick: state.context.lastRestTick,
    rest_lease_until: state.context.restLeaseUntil,
  });
  for (const kind of ['journey', 'enchant'] as const)
    add('rng_streams', {
      kind,
      seed: kind === 'journey' ? c.seed : h.enchanting.seed,
      algorithm: 'xoroshiro128plus',
      version: 1,
      ...wordColumns(kind === 'journey' ? c.randomState : h.enchanting.state),
      next_operation_id:
        kind === 'enchant' ? h.enchanting.nextOperationId : undefined,
    });
  for (const kind of ['opened', 'cleared'] as const)
    c[kind].forEach((object_id, position) =>
      add('world_flags', { kind, object_id, position }),
    );
  Object.entries(h.inventory).forEach(([item_id, quantity]) =>
    add('inventory_stacks', { item_id, quantity }),
  );
  for (const [kind, collection] of [
    ['weapon', h.weapons],
    ['armor', h.armors],
  ] as const)
    for (const [instance_id, instance] of Object.entries(collection)) {
      add('equipment_instances', {
        instance_id,
        definition_id: instance.itemId,
        kind,
        durability:
          'durability' in instance ? Number(instance.durability) : undefined,
        locked: instance.locked === undefined ? undefined : +instance.locked,
      });
      for (const slot of ['prefix', 'suffix'] as const) {
        const enchant = instance[slot];
        if (enchant) {
          add('equipment_enchants', {
            instance_id,
            slot,
            enchant_id: enchant.enchantId,
          });
          Object.entries(enchant.values).forEach(([stat_id, value]) =>
            add('equipment_enchant_values', {
              instance_id,
              slot,
              stat_id,
              value,
            }),
          );
        }
      }
    }
  add('loadouts', {
    weapon_id: h.equipment.weapon,
    armor_id: h.equipment.armor,
    ammunition_id: h.equipment.secondaryHand,
  });
  h.itemHotbar.forEach((item_id, position) =>
    add('item_hotbar', { item_id, position }),
  );
  h.discoveredSkills.forEach((skill_id, position) =>
    add('discovered_skills', { skill_id, position }),
  );
  Object.entries(h.learnedSkills).forEach(([skill_id, record]) => {
    add('learned_skills', { skill_id, rank: record.rank });
    Object.entries(record.objectiveCounts).forEach(([objective_id, count]) =>
      add('skill_objective_counts', { skill_id, objective_id, count }),
    );
  });
  Object.entries(h.bookCollections).forEach(([recipe_id, record]) => {
    add('skill_book_collections', { recipe_id, completed: +record.completed });
    record.insertedPages.forEach((page_id, position) =>
      add('skill_book_pages', { recipe_id, page_id, position }),
    );
  });
  h.claimedMilestones.forEach((milestone_id, position) =>
    add('milestone_claims', { milestone_id, position }),
  );
  Object.entries(h.quests).forEach(([quest_id, record]) => {
    add('quests', {
      quest_id,
      status: record.status,
      stage_id: record.stageId,
      claim_id: record.claimId,
    });
    Object.entries(record.counts).forEach(([objective_id, count]) =>
      add('quest_objective_counts', { quest_id, objective_id, count }),
    );
  });
  h.questFlags.forEach((flag_id, position) =>
    add('quest_flags', { flag_id, position }),
  );
  h.trackedObjectives.forEach((record, position) =>
    add('tracked_objectives', {
      position,
      quest_id: record.questId,
      objective_id: record.objectiveId,
    }),
  );
  const titles = new Set([
    ...h.titleCollection.discovered,
    ...h.earnedTitles,
    ...Object.keys(h.titleCollection.records),
  ]);
  for (const title_id of titles)
    add('character_titles', {
      title_id,
      discovered_position: h.titleCollection.discovered.includes(title_id)
        ? h.titleCollection.discovered.indexOf(title_id)
        : undefined,
      earned_position: h.earnedTitles.includes(title_id)
        ? h.earnedTitles.indexOf(title_id)
        : undefined,
      source: h.titleCollection.records[title_id]?.source,
    });
  Object.entries(h.titleCollection.evidence).forEach(([evidence_id, count]) =>
    add('title_evidence', { evidence_id, count }),
  );
  Object.entries(h.titleCollection.selected).forEach(([slot, title_id]) => {
    if (title_id) add('selected_titles', { slot, title_id });
  });
  h.enchanting.receipts.forEach((r, position) => {
    add('enchant_receipts', {
      operation_id: r.id,
      position,
      kind: r.kind,
      message: r.message,
      success: +r.success,
    });
    r.recovered.forEach((item_id, index) =>
      add('enchant_recovered_items', {
        operation_id: r.id,
        item_id,
        position: index,
      }),
    );
  });
  if (c.dungeon) {
    const d = c.dungeon;
    add('dungeon_runs', {
      definition_id: d.blueprint.definitionId,
      return_world_id: d.returnTo.worldId,
      return_x: d.returnTo.position.x,
      return_y: d.returnTo.position.y,
      blueprint: JSON.stringify(d.blueprint),
      boss_door_opened: +d.bossDoorOpened,
      selected_chest: d.selectedChest,
    });
    for (const kind of [
      'cleared',
      'opened',
      'revealedMimics',
      'usedFountains',
    ] as const)
      d[kind].forEach((object_id, position) =>
        add('dungeon_flags', { kind, object_id, position }),
      );
    for (const kind of ['bossKey', 'treasureKey'] as const)
      add('dungeon_keys', {
        kind,
        status: d[kind].status,
        x: d[kind].position?.x,
        y: d[kind].position?.y,
      });
    d.effects.forEach((effect, position) =>
      add('dungeon_effects', {
        position,
        status_id: effect.statusId,
        stacks: effect.stacks,
      }),
    );
  }
  if (state.battle) {
    const b = state.battle,
      p = c.pending!;
    add('encounters', {
      encounter_id: b.encounterId,
      phase: b.combat.outcome ?? 'selectingAction',
      algorithm: 'xoroshiro128plus',
      world_id: p.worldId,
      object_id: p.objectId,
      map_id: p.mapId,
      seed: b.seed,
      version: b.version,
      ...wordColumns(b.randomState),
      result: b.combat.outcome,
      action_sequence: b.combat.actionSequence,
      cursor: b.combat.turns.cursor,
      training_last_action: b.training.lastAction,
      quest_last_action: b.quests.lastAction,
      title_eligible: +b.titles.eligible,
      title_flawless: +b.titles.flawless,
    });
    b.entities.forEach((entity, position) => {
      add('encounter_actors', {
        actor_id: entity.id,
        position,
        defending_position: b.combat.defending.includes(entity.id)
          ? b.combat.defending.indexOf(entity.id)
          : undefined,
      });
      for (const [key, value] of Object.entries(entity))
        if (key !== 'id' && value !== undefined) {
          const group =
            (
              {
                combatant: 'stats',
                inventory: 'inventory',
                statuses: 'statuses',
                cooldowns: 'cooldowns',
                skills: 'skills',
                learnedSkills: 'skills',
                statSource: 'sources',
              } as Record<string, string>
            )[key] ?? 'actor_values';
          for (const leaf of flatten(value, [key]))
            add('encounter_' + group, { actor_id: entity.id, ...leaf });
        }
    });
    b.combat.turns.ids.forEach((actor_id, position) =>
      add('encounter_turn_order', {
        actor_id,
        position,
        defending: +b.combat.defending.includes(actor_id),
      }),
    );
    b.enemyHistory.forEach(({ id: actor_id, action }) =>
      add('encounter_enemy_history', {
        actor_id,
        action: action.action,
        skill_id: action.skillId,
        target_id: undefined,
      }),
    );
    Object.entries(b.training.counts).forEach(([skill_id, counts]) =>
      (Object.entries(counts).length
        ? Object.entries(counts)
        : [['', 0] as const]
      ).forEach(([objective_id, count]) =>
        add('encounter_training', { skill_id, objective_id, count }),
      ),
    );
    Object.entries(b.quests.ledger).forEach(([quest_id, record]) => {
      const counts = Object.entries(record.counts);
      if (!counts.length)
        add('encounter_quest_evidence', {
          quest_id,
          stage_id: record.stageId,
          objective_id: '',
          count: 0,
        });
      counts.forEach(([objective_id, count]) =>
        add('encounter_quest_evidence', {
          quest_id,
          stage_id: record.stageId,
          objective_id,
          count,
        }),
      );
    });
  }
  if (state.rewards) {
    add('encounter_rewards', {
      gold: state.rewards.loot.gold,
      experience: state.rewards.loot.experience,
      ...wordColumns(state.rewards.randomState),
    });
    state.rewards.loot.items.forEach((item, position) =>
      add('encounter_reward_items', {
        position,
        item_id: item.itemId,
        quantity: item.quantity,
        collectable: item.collectable,
      }),
    );
  }
  return rows;
}

function flatten(value: unknown, path: string[]): Row[] {
  const base = {
    path: path.map(encodeURIComponent).join('/'),
    value_type: typeof value,
    text_value: null,
    number_value: null,
  } as Row;
  if (typeof value === 'string') return [{ ...base, text_value: value }];
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('Invalid component number');
    return [
      {
        ...base,
        number_value:
          path.length === 1 && path[0] === 'fullness'
            ? Math.round(value * 10)
            : value,
      },
    ];
  }
  if (typeof value === 'boolean') return [{ ...base, number_value: +value }];
  if (value && typeof value === 'object')
    return [
      { ...base, value_type: Array.isArray(value) ? 'array' : 'object' },
      ...Object.entries(value).flatMap(([key, item]) =>
        item === undefined ? [] : flatten(item, [...path, key]),
      ),
    ];
  throw new Error('Unsupported encounter component');
}
function inflate(rows: Row[]): Record<string, unknown> {
  const root: Record<string, unknown> = {};
  for (const row of [...rows].sort(
    (a, b) => s(a, 'path').split('/').length - s(b, 'path').split('/').length,
  )) {
    const path = s(row, 'path').split('/').map(decodeURIComponent);
    if (
      path.some((key) =>
        ['__proto__', 'prototype', 'constructor'].includes(key),
      )
    )
      throw new Error('Invalid component path');
    let parent: Record<string, unknown> = root;
    for (const key of path.slice(0, -1)) {
      if (!parent[key] || typeof parent[key] !== 'object')
        throw new Error('Missing component parent');
      parent = parent[key] as Record<string, unknown>;
    }
    const kind = s(row, 'value_type');
    let value: unknown;
    switch (kind) {
      case 'object':
        value = {};
        break;
      case 'array':
        value = [];
        break;
      case 'string':
        value = s(row, 'text_value');
        break;
      case 'number':
        value = n(row, 'number_value');
        if (path.length === 1 && path[0] === 'fullness')
          value = (value as number) / 10;
        break;
      case 'boolean':
        value = !!n(row, 'number_value');
        break;
      default:
        throw new Error('Invalid component type');
    }
    parent[path[path.length - 1]] = value;
  }
  return root;
}

export function decodeState(rows: Rows, talent: string): OnlineState {
  const get = (name: string) => rows[`game_${name}` as TableName];
  const map = (name: string, key: string, value: (r: Row) => unknown) =>
    Object.fromEntries(get(name).map((r) => [s(r, key), value(r)]));
  const indexes = new Map<string, Map<Row[string], Row[]>>();
  const matching = (name: string, key: string, value: string) => {
    const identity = JSON.stringify([name, key]);
    let index = indexes.get(identity);
    if (!index) {
      index = new Map();
      for (const row of get(name)) {
        const group = index.get(row[key]) ?? [];
        group.push(row);
        index.set(row[key], group);
      }
      indexes.set(identity, index);
    }
    return index.get(value) ?? [];
  };
  const list = (name: string, key: string) =>
    ordered(get(name)).map((r) => s(r, key));
  const counters = (name: string, key: string, value: string) =>
    Object.fromEntries(
      matching(name, key, value).map((r) => [
        s(r, 'objective_id'),
        n(r, 'count'),
      ]),
    );
  const h = singleton(get('heroes')),
    c = singleton(get('campaigns')),
    j = singleton(matching('rng_streams', 'kind', 'journey')),
    e = singleton(matching('rng_streams', 'kind', 'enchant')),
    l = singleton(get('loadouts'));
  const equipment = (kind: string) =>
    Object.fromEntries(
      matching('equipment_instances', 'kind', kind)
        // Allocation IDs encode creation order. Armor bulk removal uses this order in the engine.
        .sort(
          (a, b) =>
            Number(s(a, 'instance_id').split('-')[1]) -
            Number(s(b, 'instance_id').split('-')[1]),
        )
        .map((r) => {
          const id = s(r, 'instance_id');
          return [
            id,
            {
              itemId: s(r, 'definition_id'),
              ...(kind === 'weapon' ? { durability: n(r, 'durability') } : {}),
              ...(r.locked !== null ? { locked: !!n(r, 'locked') } : {}),
              ...Object.fromEntries(
                matching('equipment_enchants', 'instance_id', id).map(
                  (enchant) => [
                    s(enchant, 'slot'),
                    {
                      enchantId: s(enchant, 'enchant_id'),
                      values: Object.fromEntries(
                        matching('equipment_enchant_values', 'instance_id', id)
                          .filter((v) => v.slot === enchant.slot)
                          .map((v) => [s(v, 'stat_id'), n(v, 'value')]),
                      ),
                    },
                  ],
                ),
              ),
            },
          ];
        }),
    );
  const campaign: Record<string, unknown> = {
    seed: n(j, 'seed'),
    randomState: words(j),
    worldId: s(c, 'world_id'),
    position: { x: n(c, 'x'), y: n(c, 'y') },
    encounterCount: n(c, 'encounter_count'),
    opened: ordered(matching('world_flags', 'kind', 'opened')).map((r) =>
      s(r, 'object_id'),
    ),
    cleared: ordered(matching('world_flags', 'kind', 'cleared')).map((r) =>
      s(r, 'object_id'),
    ),
    audio: { music: 0.3, sfx: 0.7, enabled: false },
    hero: {
      classId: s(h, 'class_id'),
      level: n(h, 'level'),
      cumulativeLevel: n(h, 'cumulative_level'),
      experience: n(h, 'experience'),
      gold: n(h, 'gold'),
      ap: n(h, 'ap'),
      health: n(h, 'health'),
      mana: n(h, 'mana'),
      stamina: n(h, 'stamina'),
      wounds: n(h, 'wounds'),
      fullness: n(h, 'fullness_tenths') / 10,
      growthTalent: talent,
      nextWeaponId: n(h, 'next_weapon_id'),
      nextArmorId: n(h, 'next_armor_id'),
      inventory: map('inventory_stacks', 'item_id', (r) => n(r, 'quantity')),
      weapons: equipment('weapon'),
      armors: equipment('armor'),
      equipment: {
        weapon: optional(l, 'weapon_id'),
        armor: optional(l, 'armor_id'),
        secondaryHand: optional(l, 'ammunition_id'),
      },
      itemHotbar: list('item_hotbar', 'item_id'),
      discoveredSkills: list('discovered_skills', 'skill_id'),
      learnedSkills: map('learned_skills', 'skill_id', (r) => ({
        rank: s(r, 'rank'),
        objectiveCounts: counters(
          'skill_objective_counts',
          'skill_id',
          s(r, 'skill_id'),
        ),
      })),
      bookCollections: map('skill_book_collections', 'recipe_id', (r) => ({
        completed: !!n(r, 'completed'),
        insertedPages: ordered(
          matching('skill_book_pages', 'recipe_id', s(r, 'recipe_id')),
        ).map((page) => s(page, 'page_id')),
      })),
      claimedMilestones: list('milestone_claims', 'milestone_id'),
      quests: map('quests', 'quest_id', (r) => ({
        status: s(r, 'status'),
        stageId: s(r, 'stage_id'),
        claimId: optional(r, 'claim_id'),
        counts: counters(
          'quest_objective_counts',
          'quest_id',
          s(r, 'quest_id'),
        ),
      })),
      questFlags: list('quest_flags', 'flag_id'),
      trackedObjectives: ordered(get('tracked_objectives')).map((r) => ({
        questId: s(r, 'quest_id'),
        objectiveId: s(r, 'objective_id'),
      })),
      earnedTitles: ordered(
        get('character_titles').filter((r) => r.earned_position !== null),
        'earned_position',
      ).map((r) => s(r, 'title_id')),
      titleCollection: {
        discovered: ordered(
          get('character_titles').filter((r) => r.discovered_position !== null),
          'discovered_position',
        ).map((r) => s(r, 'title_id')),
        records: Object.fromEntries(
          get('character_titles')
            .filter((r) => r.source !== null)
            .map((r) => [s(r, 'title_id'), { source: s(r, 'source') }]),
        ),
        evidence: map('title_evidence', 'evidence_id', (r) => n(r, 'count')),
        selected: map('selected_titles', 'slot', (r) => s(r, 'title_id')),
      },
      enchanting: {
        algorithm: 'xoroshiro128plus',
        version: 1,
        seed: n(e, 'seed'),
        state: words(e),
        nextOperationId: n(e, 'next_operation_id'),
        receipts: ordered(get('enchant_receipts')).map((r) => ({
          id: s(r, 'operation_id'),
          kind: s(r, 'kind'),
          message: s(r, 'message'),
          success: !!n(r, 'success'),
          recovered: ordered(
            matching(
              'enchant_recovered_items',
              'operation_id',
              s(r, 'operation_id'),
            ),
          ).map((i) => s(i, 'item_id')),
        })),
      },
    },
  };
  if (get('dungeon_runs').length) {
    const d = singleton(get('dungeon_runs'));
    campaign.dungeon = {
      blueprint: JSON.parse(s(d, 'blueprint')),
      returnTo: {
        worldId: s(d, 'return_world_id'),
        position: { x: n(d, 'return_x'), y: n(d, 'return_y') },
      },
      bossDoorOpened: !!n(d, 'boss_door_opened'),
      selectedChest: optional(d, 'selected_chest'),
      ...Object.fromEntries(
        ['cleared', 'opened', 'revealedMimics', 'usedFountains'].map((kind) => [
          kind,
          ordered(matching('dungeon_flags', 'kind', kind)).map((r) =>
            s(r, 'object_id'),
          ),
        ]),
      ),
      ...Object.fromEntries(
        get('dungeon_keys').map((r) => [
          s(r, 'kind'),
          {
            status: s(r, 'status'),
            ...(r.x === null
              ? {}
              : { position: { x: n(r, 'x'), y: n(r, 'y') } }),
          },
        ]),
      ),
      effects: ordered(get('dungeon_effects')).map((r) => ({
        statusId: s(r, 'status_id'),
        stacks: n(r, 'stacks'),
      })),
    };
  }
  let battle: PersistedBattleState | undefined;
  if (get('encounters').length) {
    const b = singleton(get('encounters'));
    if (
      b.algorithm !== 'xoroshiro128plus' ||
      b.phase !== (b.result ?? 'selectingAction')
    )
      throw new Error('Invalid encounter format');
    campaign.pending = {
      worldId: s(b, 'world_id'),
      objectId: s(b, 'object_id'),
      mapId: s(b, 'map_id'),
      seed: n(b, 'seed'),
    };
    const entities = ordered(get('encounter_actors')).map((r) => {
      const id = s(r, 'actor_id');
      return {
        id,
        ...inflate(
          [
            'actor_values',
            'stats',
            'inventory',
            'statuses',
            'cooldowns',
            'skills',
            'sources',
          ].flatMap((group) => matching('encounter_' + group, 'actor_id', id)),
        ),
      };
    });
    const ledger: Record<
      string,
      { stageId: string; counts: Record<string, number> }
    > = {};
    for (const r of get('encounter_quest_evidence')) {
      const quest = s(r, 'quest_id');
      ledger[quest] ??= { stageId: s(r, 'stage_id'), counts: {} };
      if (r.objective_id !== '')
        ledger[quest].counts[s(r, 'objective_id')] = n(r, 'count');
    }
    battle = {
      version: n(b, 'version'),
      encounterId: s(b, 'encounter_id'),
      seed: n(b, 'seed'),
      randomState: words(b),
      entities,
      combat: {
        outcome: optional(b, 'result'),
        actionSequence: n(b, 'action_sequence'),
        turns: {
          ids: ordered(get('encounter_turn_order')).map((r) =>
            s(r, 'actor_id'),
          ),
          cursor: n(b, 'cursor'),
        },
        defending: ordered(
          get('encounter_actors').filter((r) => r.defending_position !== null),
          'defending_position',
        ).map((r) => s(r, 'actor_id')),
      },
      enemyHistory: get('encounter_enemy_history')
        .sort((a, b) => s(a, 'actor_id').localeCompare(s(b, 'actor_id')))
        .map((r) => ({
          id: s(r, 'actor_id'),
          action: {
            action: s(r, 'action'),
            ...(r.skill_id !== null ? { skillId: s(r, 'skill_id') } : {}),
            ...(r.target_id !== null ? { targetId: s(r, 'target_id') } : {}),
          },
        })),
      training: {
        lastAction: n(b, 'training_last_action'),
        counts: Object.fromEntries(
          [
            ...new Set(get('encounter_training').map((r) => s(r, 'skill_id'))),
          ].map((skill) => [
            skill,
            Object.fromEntries(
              matching('encounter_training', 'skill_id', skill)
                .filter((r) => r.objective_id !== '')
                .map((r) => [s(r, 'objective_id'), n(r, 'count')]),
            ),
          ]),
        ),
      },
      quests: { lastAction: n(b, 'quest_last_action'), ledger },
      titles: {
        encounterId: s(b, 'encounter_id'),
        eligible: !!n(b, 'title_eligible'),
        flawless: !!n(b, 'title_flawless'),
      },
    } as PersistedBattleState;
  }
  const rewards = get('encounter_rewards').length
    ? singleton(get('encounter_rewards'))
    : undefined;
  return {
    campaign: CampaignSchema.parse(campaign),
    context: {
      resting: !!n(c, 'resting'),
      activeService: optional(c, 'active_service'),
      ...(c.last_rest_tick === null
        ? {}
        : { lastRestTick: n(c, 'last_rest_tick') }),
      ...(c.rest_lease_until === null
        ? {}
        : { restLeaseUntil: n(c, 'rest_lease_until') }),
    },
    ...(battle ? { battle } : {}),
    ...(rewards
      ? {
          rewards: {
            loot: {
              gold: n(rewards, 'gold'),
              experience: n(rewards, 'experience'),
              items: ordered(get('encounter_reward_items')).map((r) => ({
                itemId: s(r, 'item_id'),
                quantity: n(r, 'quantity'),
                collectable: n(r, 'collectable'),
              })),
            },
            randomState: words(rewards),
          },
        }
      : {}),
  };
}
