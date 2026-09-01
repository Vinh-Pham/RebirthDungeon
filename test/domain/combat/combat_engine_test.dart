import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:rebirth_dungeon/core/engine/engine_contracts.dart';
import 'package:rebirth_dungeon/core/errors/domain_exception.dart';
import 'package:rebirth_dungeon/core/errors/failure.dart';
import 'package:rebirth_dungeon/core/random/fake_random_source.dart';
import 'package:rebirth_dungeon/core/random/seeded_random_source.dart';
import 'package:rebirth_dungeon/domain/combat/combat_command.dart';
import 'package:rebirth_dungeon/domain/combat/combat_die.dart';
import 'package:rebirth_dungeon/domain/combat/combat_engine.dart';
import 'package:rebirth_dungeon/domain/combat/combat_event.dart';
import 'package:rebirth_dungeon/domain/combat/combat_state.dart';
import 'package:rebirth_dungeon/domain/content/ability_data.dart';
import 'package:rebirth_dungeon/domain/content/game_content.dart';

import '../content/content_fixtures.dart';

final GameContent _content = GameContent.parse(validContentSet());

extension on EngineResult<CombatState, CombatEvent> {
  (CombatState, List<CombatEvent>) toTuple() => (state, events);
}

CombatEngine _engine(FakeRandomSource random) =>
    CombatEngine(content: _content, random: random);

CombatState _started(
  CombatEngine engine, {
  String heroId = 'hero_knight',
  List<String> monsterIds = const ['goblin_01'],
}) => engine
    .execute(
      const CombatState(),
      StartCombat(heroId: heroId, monsterIds: monsterIds),
    )
    .state;

void _expectIllegal(
  CombatEngine engine,
  CombatState state,
  CombatCommand command,
) {
  expect(
    () => engine.execute(state, command),
    throwsA(
      isA<DomainException>().having(
        (e) => e.failure,
        'failure',
        isA<InvalidOperationFailure>(),
      ),
    ),
  );
}

/// Plays a full combat headlessly with a fixed strategy: roll, use the
/// hero's first damaging ability, end the turn, let enemies act.
(CombatState, List<CombatEvent>) _runCombat(
  CombatEngine engine, {
  required String heroId,
  required List<String> monsterIds,
  int maxCommands = 400,
}) {
  var state = const CombatState();
  final events = <CombatEvent>[];

  void submit(CombatCommand command) {
    final result = engine.execute(state, command);
    state = result.state;
    events.addAll(result.events);
  }

  submit(StartCombat(heroId: heroId, monsterIds: monsterIds));
  var commands = 1;
  while (!state.isTerminal && commands < maxCommands) {
    switch (state.phase) {
      case CombatPhase.rolling:
        submit(const RollDice());
      case CombatPhase.awaitingPlayerAction:
        final hero = engine.content.hero(heroId);
        final abilityId = hero.abilityIds.firstWhere(
          (id) => engine.content.ability(id).effect == AbilityEffect.damage,
          orElse: () => hero.abilityIds.first,
        );
        final cost = engine.content.ability(abilityId).dieCost;
        var assigned = 0;
        for (final die in state.dice) {
          if (assigned < cost && die.status == DieStatus.available) {
            submit(
              AssignDieToAbility(dieIndex: die.dieIndex, abilityId: abilityId),
            );
            assigned++;
          }
        }
        if (assigned >= cost) {
          submit(
            UseAbility(
              abilityId: abilityId,
              targetId: state.firstLivingEnemy?.id,
            ),
          );
        }
        if (!state.isTerminal) {
          submit(const EndTurn());
        }
      case CombatPhase.enemyTurn:
        submit(const EnemyAct());
      case CombatPhase.notStarted:
      case CombatPhase.victory:
      case CombatPhase.defeat:
        break;
    }
    commands++;
  }
  return (state, events);
}

void main() {
  group('start combat', () {
    test('builds combatants and dice from content data', () {
      final engine = _engine(FakeRandomSource());
      final (state, events) = engine
          .execute(
            const CombatState(),
            const StartCombat(heroId: 'hero_knight', monsterIds: ['goblin_01']),
          )
          .toTuple();

      expect(state.phase, CombatPhase.rolling);
      expect(state.turn, 1);
      expect(state.player.id, 'hero_knight');
      expect(state.player.hp, 30);
      expect(state.player.maxHp, 30);
      expect(state.player.attack, 2);
      expect(state.player.defense, 1);
      expect(state.enemies.single.id, 'goblin_01');
      expect(state.enemies.single.hp, 18);
      expect(state.enemies.single.basicAttackMax, 2);
      expect(state.dice, hasLength(3));
      expect(
        state.dice.every(
          (die) =>
              die.sides == 6 &&
              die.maxFace == 6 &&
              die.status == DieStatus.unrolled,
        ),
        isTrue,
      );
      expect(
        events,
        equals([
          const CombatStarted(playerId: 'hero_knight', enemyIds: ['goblin_01']),
          const TurnStarted(turn: 1),
        ]),
      );
    });

    test('duplicate monsters get unique combat ids', () {
      final engine = _engine(FakeRandomSource());
      final state = _started(
        engine,
        monsterIds: ['goblin_01', 'goblin_01', 'skeleton_01'],
      );
      expect(state.enemies.map((e) => e.id), [
        'goblin_01',
        'goblin_01#2',
        'skeleton_01',
      ]);
    });

    test('starting twice is illegal', () {
      final engine = _engine(FakeRandomSource());
      final state = _started(engine);
      _expectIllegal(
        engine,
        state,
        const StartCombat(heroId: 'hero_knight', monsterIds: ['goblin_01']),
      );
    });

    test('starting without monsters is illegal', () {
      final engine = _engine(FakeRandomSource());
      _expectIllegal(
        engine,
        const CombatState(),
        const StartCombat(heroId: 'hero_knight', monsterIds: []),
      );
    });

    test('unknown hero fails with notFound', () {
      final engine = _engine(FakeRandomSource());
      expect(
        () => engine.execute(
          const CombatState(),
          const StartCombat(heroId: 'hero_nobody', monsterIds: ['goblin_01']),
        ),
        throwsA(
          isA<DomainException>().having(
            (e) => e.failure,
            'failure',
            isA<NotFoundFailure>(),
          ),
        ),
      );
    });
  });

  group('rolling', () {
    test('rolls every die and moves to awaitingPlayerAction', () {
      final engine = _engine(FakeRandomSource()..enqueueInts([5, 0, 2]));
      final state = _started(engine);
      final (newState, events) = engine
          .execute(state, const RollDice())
          .toTuple();

      expect(newState.phase, CombatPhase.awaitingPlayerAction);
      expect(newState.dice.map((d) => d.faceValue), [6, 1, 3]);
      expect(
        newState.dice.every((d) => d.status == DieStatus.available),
        isTrue,
      );
      expect(
        events.single,
        DiceRolled(
          rolls: const [
            DieRoll(dieIndex: 0, value: 6),
            DieRoll(dieIndex: 1, value: 1),
            DieRoll(dieIndex: 2, value: 3),
          ],
        ),
      );
    });

    test('rolling outside the rolling phase is illegal', () {
      final engine = _engine(FakeRandomSource()..enqueueInts([0, 0, 0]));
      final rolled = engine.execute(_started(engine), const RollDice()).state;
      _expectIllegal(engine, rolled, const RollDice());
      _expectIllegal(engine, const CombatState(), const RollDice());
    });
  });

  group('rerolling', () {
    test('rerolls only the chosen unassigned dice, once per turn', () {
      final engine = _engine(FakeRandomSource()..enqueueInts([0, 1, 2, 5, 4]));
      var state = _started(engine);
      state = engine.execute(state, const RollDice()).state;

      final (rerolled, events) = engine
          .execute(state, const RerollDice(dieIndices: [1, 2]))
          .toTuple();
      expect(rerolled.dice.map((d) => d.faceValue), [1, 6, 5]);
      expect(rerolled.rerollsUsedThisTurn, 1);
      expect(
        events.single,
        DiceRolled(
          rolls: const [
            DieRoll(dieIndex: 1, value: 6),
            DieRoll(dieIndex: 2, value: 5),
          ],
        ),
      );

      _expectIllegal(engine, rerolled, const RerollDice(dieIndices: [0]));
    });

    test('rerolling an assigned die is illegal', () {
      final engine = _engine(FakeRandomSource()..enqueueInts([0, 1, 2]));
      var state = _started(engine);
      state = engine.execute(state, const RollDice()).state;
      state = engine
          .execute(
            state,
            const AssignDieToAbility(dieIndex: 0, abilityId: 'slash'),
          )
          .state;
      _expectIllegal(engine, state, const RerollDice(dieIndices: [0]));
    });

    test('rerolls reset at the next turn', () {
      final engine = _engine(
        FakeRandomSource()..enqueueInts([0, 0, 0, 0, 1, 1, 1, 0]),
      );
      var state = _started(engine);
      state = engine.execute(state, const RollDice()).state;
      state = engine.execute(state, const RerollDice(dieIndices: [0])).state;
      state = engine.execute(state, const EndTurn()).state;
      state = engine.execute(state, const EnemyAct()).state;
      state = engine.execute(state, const EnemyAct()).state;
      expect(state.phase, CombatPhase.rolling);
      expect(state.rerollsUsedThisTurn, 0);
      expect(
        state.dice.every((die) => die.status == DieStatus.unrolled),
        isTrue,
      );
    });
  });

  group('assigning dice', () {
    test('assigns an available die to a hero ability', () {
      final engine = _engine(FakeRandomSource()..enqueueInts([3, 1, 2]));
      var state = _started(engine);
      state = engine.execute(state, const RollDice()).state;
      final (assigned, events) = engine
          .execute(
            state,
            const AssignDieToAbility(dieIndex: 1, abilityId: 'slash'),
          )
          .toTuple();

      expect(assigned.dice[1].status, DieStatus.assigned);
      expect(assigned.dice[1].assignedAbility, 'slash');
      expect(events.single, const DieAssigned(dieIndex: 1, abilityId: 'slash'));
    });

    test('rejects foreign abilities, bad indices, and bad phases', () {
      final engine = _engine(FakeRandomSource()..enqueueInts([0, 0, 0]));
      var state = _started(engine);
      _expectIllegal(
        engine,
        state,
        const AssignDieToAbility(dieIndex: 0, abilityId: 'slash'),
      );
      state = engine.execute(state, const RollDice()).state;
      _expectIllegal(
        engine,
        state,
        const AssignDieToAbility(dieIndex: 9, abilityId: 'slash'),
      );
      _expectIllegal(
        engine,
        state,
        const AssignDieToAbility(dieIndex: 0, abilityId: 'fireball'),
      );
    });
  });

  group('using abilities — damage and crits', () {
    test('two sixes trigger a critical hit (plan scenario)', () {
      final engine = _engine(FakeRandomSource()..enqueueInts([5, 5, 1, 2, 0]));
      var state = _started(engine, heroId: 'hero_mage');
      state = engine.execute(state, const RollDice()).state;
      state = engine
          .execute(
            state,
            const AssignDieToAbility(dieIndex: 0, abilityId: 'fireball'),
          )
          .state;
      state = engine
          .execute(
            state,
            const AssignDieToAbility(dieIndex: 1, abilityId: 'fireball'),
          )
          .state;
      final (after, events) = engine
          .execute(
            state,
            const UseAbility(abilityId: 'fireball', targetId: 'goblin_01'),
          )
          .toTuple();

      // power roll 4, mage attack 2, crit doubles: (4 + 2) * 2 = 12 raw;
      // goblin defense 1 -> 11 net.
      expect(
        events,
        containsAll([
          const AbilityActivated(
            actorId: 'hero_mage',
            abilityId: 'fireball',
            targetId: 'goblin_01',
          ),
          const CriticalHit(targetId: 'goblin_01', amount: 12),
          const DamageDealt(
            targetId: 'goblin_01',
            amount: 11,
            remainingHp: 7,
            source: DamageSource.attack,
          ),
        ]),
      );
      expect(after.enemies.single.hp, 7);
      expect(
        after.dice.take(2).every((d) => d.status == DieStatus.spent),
        isTrue,
      );
    });

    test('a single max-face die also crits; non-max dice do not', () {
      final engine = _engine(FakeRandomSource()..enqueueInts([5, 2, 4, 2]));
      var state = _started(engine);
      state = engine.execute(state, const RollDice()).state;
      state = engine
          .execute(
            state,
            const AssignDieToAbility(dieIndex: 0, abilityId: 'slash'),
          )
          .state;
      final (critState, critEvents) = engine
          .execute(
            state,
            const UseAbility(abilityId: 'slash', targetId: 'goblin_01'),
          )
          .toTuple();
      expect(
        critEvents.whereType<CriticalHit>().single.amount,
        12, // (4 power + 2 attack) * 2
      );
      expect(critState.enemies.single.hp, 18 - 11);

      // Fresh combat: a 3 on the die does not crit.
      final engine2 = _engine(FakeRandomSource()..enqueueInts([2, 1, 3, 3]));
      var state2 = _started(engine2);
      state2 = engine2.execute(state2, const RollDice()).state;
      state2 = engine2
          .execute(
            state2,
            const AssignDieToAbility(dieIndex: 0, abilityId: 'slash'),
          )
          .state;
      final (noCrit, noCritEvents) = engine2
          .execute(
            state2,
            const UseAbility(abilityId: 'slash', targetId: 'goblin_01'),
          )
          .toTuple();
      expect(noCritEvents.whereType<CriticalHit>(), isEmpty);
      expect(noCrit.enemies.single.hp, 18 - 6); // (5 + 2) - 1
    });

    test('defeating the last enemy wins the combat', () {
      final engine = _engine(
        FakeRandomSource()..enqueueInts([5, 0, 0, 4, 1, 0, 0, 0, 0]),
      );
      var state = _started(engine);
      // Turn 1: crit slash (goblin 18 -> 3).
      state = engine.execute(state, const RollDice()).state;
      state = engine
          .execute(
            state,
            const AssignDieToAbility(dieIndex: 0, abilityId: 'slash'),
          )
          .state;
      state = engine
          .execute(
            state,
            const UseAbility(abilityId: 'slash', targetId: 'goblin_01'),
          )
          .state;
      // Enemy turn: goblin basic strike (knight 30 -> 27).
      state = engine.execute(state, const EndTurn()).state;
      state = engine.execute(state, const EnemyAct()).state;
      state = engine.execute(state, const EnemyAct()).state;
      // Turn 2: slash (3 -> 0).
      state = engine.execute(state, const RollDice()).state;
      state = engine
          .execute(
            state,
            const AssignDieToAbility(dieIndex: 0, abilityId: 'slash'),
          )
          .state;
      final (finalState, events) = engine
          .execute(
            state,
            const UseAbility(abilityId: 'slash', targetId: 'goblin_01'),
          )
          .toTuple();

      expect(finalState.phase, CombatPhase.victory);
      expect(finalState.isTerminal, isTrue);
      expect(events, contains(const EnemyDefeated(enemyId: 'goblin_01')));
      expect(events, contains(const CombatWon(turns: 2)));
    });

    test('illegal uses: no assignment, dead or unknown target, bad phase', () {
      final engine = _engine(
        FakeRandomSource()..enqueueInts([5, 0, 0, 4, 0, 0, 0, 0]),
      );
      var state = _started(engine, monsterIds: ['goblin_01', 'skeleton_01']);
      state = engine.execute(state, const RollDice()).state;
      _expectIllegal(
        engine,
        state,
        const UseAbility(abilityId: 'slash', targetId: 'goblin_01'),
      );
      state = engine
          .execute(
            state,
            const AssignDieToAbility(dieIndex: 0, abilityId: 'slash'),
          )
          .state;
      state = engine
          .execute(
            state,
            const UseAbility(abilityId: 'slash', targetId: 'goblin_01'),
          )
          .state;
      // goblin is dead now; targeting it again is illegal.
      _expectIllegal(
        engine,
        state,
        const UseAbility(abilityId: 'slash', targetId: 'goblin_01'),
      );
      state = engine
          .execute(
            state,
            const AssignDieToAbility(dieIndex: 1, abilityId: 'slash'),
          )
          .state;
      _expectIllegal(
        engine,
        state,
        const UseAbility(abilityId: 'slash', targetId: 'spook'),
      );
      // End the turn to leave awaitingPlayerAction, then try again.
      state = engine.execute(state, const EndTurn()).state;
      _expectIllegal(
        engine,
        state,
        const UseAbility(abilityId: 'slash', targetId: 'skeleton_01'),
      );
    });
  });

  group('using abilities — shield and heal', () {
    test('shield absorbs damage before HP', () {
      final engine = _engine(FakeRandomSource()..enqueueInts([2, 1, 3, 2, 0]));
      var state = _started(engine);
      state = engine.execute(state, const RollDice()).state;
      state = engine
          .execute(
            state,
            const AssignDieToAbility(dieIndex: 0, abilityId: 'shield_wall'),
          )
          .state;
      state = engine
          .execute(
            state,
            const AssignDieToAbility(dieIndex: 1, abilityId: 'shield_wall'),
          )
          .state;
      final (shielded, events) = engine
          .execute(state, const UseAbility(abilityId: 'shield_wall'))
          .toTuple();
      expect(shielded.player.shield, 4);
      expect(
        events,
        contains(
          const ShieldGained(
            targetId: 'hero_knight',
            amount: 4,
            totalShield: 4,
          ),
        ),
      );

      // Goblin basic strike: power 1 + attack 2 = 3 raw, -1 defense = 2 net,
      // fully absorbed by the shield.
      state = engine.execute(shielded, const EndTurn()).state;
      final (afterEnemy, enemyEvents) = engine
          .execute(state, const EnemyAct())
          .toTuple();
      expect(afterEnemy.player.hp, 30);
      expect(afterEnemy.player.shield, 2);
      expect(
        enemyEvents,
        containsAll([
          const ShieldAbsorbed(targetId: 'hero_knight', amount: 2),
          const DamageDealt(
            targetId: 'hero_knight',
            amount: 0,
            remainingHp: 30,
            source: DamageSource.attack,
          ),
        ]),
      );
    });

    test('healing cannot exceed max HP', () {
      final engine = _engine(
        FakeRandomSource()..enqueueInts([0, 0, 0, 0, 1, 1, 1, 1, 1, 4]),
      );
      var state = _started(engine, heroId: 'hero_mage');
      state = engine.execute(state, const RollDice()).state;
      state = engine.execute(state, const EndTurn()).state;
      state = engine.execute(state, const EnemyAct()).state; // mage 20 -> 16
      state = engine.execute(state, const EnemyAct()).state; // turn 2
      state = engine.execute(state, const RollDice()).state;
      state = engine
          .execute(
            state,
            const AssignDieToAbility(dieIndex: 0, abilityId: 'heal'),
          )
          .state;
      state = engine
          .execute(
            state,
            const AssignDieToAbility(dieIndex: 1, abilityId: 'heal'),
          )
          .state;
      final (healed, events) = engine
          .execute(state, const UseAbility(abilityId: 'heal'))
          .toTuple();

      expect(healed.player.hp, 20); // 17 + 7 capped at 20
      expect(
        events,
        contains(
          const HealingApplied(
            targetId: 'hero_mage',
            amount: 3,
            remainingHp: 20,
          ),
        ),
      );
    });

    test('healing at full HP grants nothing', () {
      final engine = _engine(FakeRandomSource()..enqueueInts([0, 0, 0, 0, 0]));
      var state = _started(engine, heroId: 'hero_mage');
      state = engine.execute(state, const RollDice()).state;
      state = engine
          .execute(
            state,
            const AssignDieToAbility(dieIndex: 0, abilityId: 'heal'),
          )
          .state;
      state = engine
          .execute(
            state,
            const AssignDieToAbility(dieIndex: 1, abilityId: 'heal'),
          )
          .state;
      final (healed, events) = engine
          .execute(state, const UseAbility(abilityId: 'heal'))
          .toTuple();
      expect(healed.player.hp, 20);
      expect(
        events,
        contains(
          const HealingApplied(
            targetId: 'hero_mage',
            amount: 0,
            remainingHp: 20,
          ),
        ),
      );
    });
  });

  group('status effects', () {
    test('poison applied by an ability ticks at the enemy turn start and '
        'expires', () {
      final engine = _engine(
        FakeRandomSource()..enqueueInts([2, 2, 2, 1, 2, 0, 1, 1, 1, 1, 0]),
      );
      var state = _started(engine);
      state = engine.execute(state, const RollDice()).state;
      state = engine
          .execute(
            state,
            const AssignDieToAbility(dieIndex: 0, abilityId: 'poison_strike'),
          )
          .state;
      final (applied, appliedEvents) = engine
          .execute(
            state,
            const UseAbility(abilityId: 'poison_strike', targetId: 'goblin_01'),
          )
          .toTuple();
      // Damage 2+2-1 = 3 (goblin 15), then poison potency 3 for 2 turns.
      expect(
        appliedEvents,
        contains(
          const StatusApplied(
            targetId: 'goblin_01',
            statusId: 'poison',
            potency: 3,
            remainingTurns: 2,
          ),
        ),
      );
      expect(applied.enemies.single.hp, 15);

      // Enemy turn 1: poison ticks 15 -> 12, duration 2 -> 1, then strikes.
      state = engine.execute(applied, const EndTurn()).state;
      final (ticked, tickEvents) = engine
          .execute(state, const EnemyAct())
          .toTuple();
      expect(ticked.enemies.single.hp, 12);
      expect(ticked.enemies.single.statuses.single.remainingTurns, 1);
      expect(
        tickEvents,
        contains(
          const DamageDealt(
            targetId: 'goblin_01',
            amount: 3,
            remainingHp: 12,
            source: DamageSource.poison,
          ),
        ),
      );
      state = engine.execute(ticked, const EnemyAct()).state; // turn 2

      // Enemy turn 2: poison ticks 12 -> 9 and expires.
      state = engine.execute(state, const RollDice()).state;
      state = engine.execute(state, const EndTurn()).state;
      final (expired, expiredEvents) = engine
          .execute(state, const EnemyAct())
          .toTuple();
      expect(expired.enemies.single.hp, 9);
      expect(expired.enemies.single.statuses, isEmpty);
      expect(
        expiredEvents,
        containsAll([
          const DamageDealt(
            targetId: 'goblin_01',
            amount: 3,
            remainingHp: 9,
            source: DamageSource.poison,
          ),
          const StatusExpired(targetId: 'goblin_01', statusId: 'poison'),
        ]),
      );
    });

    test(
      'reapplying a status keeps the higher potency and longer duration',
      () {
        final engine = _engine(
          FakeRandomSource()
            ..enqueueInts([0, 0, 0, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0]),
        );
        var state = _started(engine);
        state = engine.execute(state, const RollDice()).state;
        state = engine
            .execute(
              state,
              const AssignDieToAbility(dieIndex: 0, abilityId: 'poison_strike'),
            )
            .state;
        state = engine
            .execute(
              state,
              const UseAbility(
                abilityId: 'poison_strike',
                targetId: 'goblin_01',
              ),
            )
            .state;
        state = engine.execute(state, const EndTurn()).state;
        state = engine.execute(state, const EnemyAct()).state;
        state = engine.execute(state, const EnemyAct()).state; // turn 2

        state = engine.execute(state, const RollDice()).state;
        state = engine
            .execute(
              state,
              const AssignDieToAbility(dieIndex: 0, abilityId: 'poison_strike'),
            )
            .state;
        final (reapplied, events) = engine
            .execute(
              state,
              const UseAbility(
                abilityId: 'poison_strike',
                targetId: 'goblin_01',
              ),
            )
            .toTuple();

        // First application: potency 3, duration 4. After one tick the
        // remaining duration is 3; the second application rolls potency 1 and
        // duration 2, so the maxima (3, 3) win.
        expect(
          events,
          contains(
            const StatusApplied(
              targetId: 'goblin_01',
              statusId: 'poison',
              potency: 3,
              remainingTurns: 3,
            ),
          ),
        );
        expect(reapplied.enemies.single.statuses.single.potency, 3);
        expect(reapplied.enemies.single.statuses.single.remainingTurns, 3);
      },
    );

    test('enemy status riders poison the player and tick on their turn', () {
      final engine = _engine(
        FakeRandomSource()..enqueueInts([0, 0, 0, 1, 0, 0]),
      );
      var state = _started(engine, monsterIds: ['skeleton_01']);
      state = engine.execute(state, const RollDice()).state;
      state = engine.execute(state, const EndTurn()).state;
      final (afterEnemy, events) = engine
          .execute(state, const EnemyAct())
          .toTuple();

      // skeleton poison_strike: power 2 + attack 3 = 5 raw, -1 defense = 4
      // net (knight 26), then poison potency 1 for 2 turns.
      expect(afterEnemy.player.hp, 26);
      expect(
        events,
        contains(
          const StatusApplied(
            targetId: 'hero_knight',
            statusId: 'poison',
            potency: 1,
            remainingTurns: 2,
          ),
        ),
      );

      final (nextTurn, turnEvents) = engine
          .execute(afterEnemy, const EnemyAct())
          .toTuple();
      expect(nextTurn.turn, 2);
      expect(nextTurn.player.hp, 25);
      expect(
        turnEvents,
        contains(
          const DamageDealt(
            targetId: 'hero_knight',
            amount: 1,
            remainingHp: 25,
            source: DamageSource.poison,
          ),
        ),
      );
    });

    test('poison can defeat an enemy at the start of its turn', () {
      final engine = _engine(
        FakeRandomSource()..enqueueInts([
          1, 1, 1, // turn 1 roll
          2, 2, 0, // poison power 3 (net 4), potency 3, duration 2
          1, // goblin strike
          1, 1, 1, // turn 2 roll
          2, 2, 0, // poison reapply (goblin 7)
          1, // goblin strike
          1, 1, 1, // turn 3 roll
          0, // slash power 2 (net 3)
        ]),
      );
      var state = _started(engine);

      // Rolls, optionally attacks with the given ability, ends the turn, and
      // resolves the enemy action.
      CombatState playTurn(CombatState state, {String? abilityId}) {
        state = engine.execute(state, const RollDice()).state;
        if (abilityId != null) {
          state = engine
              .execute(
                state,
                AssignDieToAbility(dieIndex: 0, abilityId: abilityId),
              )
              .state;
          state = engine
              .execute(
                state,
                UseAbility(abilityId: abilityId, targetId: 'goblin_01'),
              )
              .state;
        }
        state = engine.execute(state, const EndTurn()).state;
        state = engine.execute(state, const EnemyAct()).state;
        return state;
      }

      // Turn 1: poison (goblin 14, potency 3); tick -> 11, then turn 2.
      state = playTurn(state, abilityId: 'poison_strike');
      state = engine.execute(state, const EnemyAct()).state;
      // Turn 2: poison reapply (goblin 7); tick -> 4, then turn 3.
      state = playTurn(state, abilityId: 'poison_strike');
      state = engine.execute(state, const EnemyAct()).state;
      // Turn 3: slash (4 -> 1); the poison tick then takes it to -2:
      // defeated at the start of its own turn.
      state = playTurn(state, abilityId: 'slash');

      expect(state.phase, CombatPhase.victory);
      expect(state.allEnemiesDefeated, isTrue);
      expect(state.turn, 3);
    });
  });

  group('enemy turn structure', () {
    test('the enemy AI picks its strongest ability', () {
      final engine = _engine(FakeRandomSource()..enqueueInts([0, 0, 0, 3]));
      var state = _started(engine, monsterIds: ['bone_king']);
      state = engine.execute(state, const RollDice()).state;
      state = engine.execute(state, const EndTurn()).state;
      final (afterEnemy, events) = engine
          .execute(state, const EnemyAct())
          .toTuple();

      // power_strike (6..12) beats slash (2..6): roll 9 + attack 5 = 14 raw,
      // -1 knight defense = 13 net.
      expect(
        events,
        contains(
          const AbilityActivated(
            actorId: 'bone_king',
            abilityId: 'power_strike',
            targetId: 'hero_knight',
          ),
        ),
      );
      expect(afterEnemy.player.hp, 17);
    });

    test('dead enemies are skipped and the turn advances', () {
      final engine = _engine(
        FakeRandomSource()..enqueueInts([5, 0, 0, 4, 0, 2, 0, 0]),
      );
      var state = _started(engine, monsterIds: ['goblin_01', 'skeleton_01']);
      state = engine.execute(state, const RollDice()).state;
      // Two slashes kill the goblin (15 then 3 damage).
      for (final index in [0, 1]) {
        state = engine
            .execute(
              state,
              AssignDieToAbility(dieIndex: index, abilityId: 'slash'),
            )
            .state;
        state = engine
            .execute(
              state,
              const UseAbility(abilityId: 'slash', targetId: 'goblin_01'),
            )
            .state;
      }
      expect(state.enemies[0].hp, 0);
      expect(state.phase, CombatPhase.awaitingPlayerAction);

      state = engine.execute(state, const EndTurn()).state;
      final (afterSkeleton, events) = engine
          .execute(state, const EnemyAct())
          .toTuple();
      expect(
        events.whereType<AbilityActivated>().single.actorId,
        'skeleton_01',
      );
      expect(afterSkeleton.enemyActionCursor, 2);

      // Enemy turn over -> player turn 2.
      final (turn2, _) = engine
          .execute(afterSkeleton, const EnemyAct())
          .toTuple();
      expect(turn2.phase, CombatPhase.rolling);
      expect(turn2.turn, 2);
    });

    test('poison defeats the last enemy mid-enemy-turn', () {
      final engine = _engine(
        FakeRandomSource()..enqueueInts([
          0, 0, 0, // turn 1 roll
          0, 2, 2, // poison power 1 (net 2), potency 3, duration 4
          1, // goblin strike
          0, 0, 0, // turn 2 roll
          0, // slash power 2 (net 3)
          1, // goblin strike
          0, 0, 0, // turn 3 roll
          0, // slash (net 3)
          1, // goblin strike
          0, 0, 0, // turn 4 roll
        ]),
      );
      var state = _started(engine);

      // Rolls, optionally attacks with the given ability, ends the turn.
      CombatState playTurn(CombatState state, {String? abilityId}) {
        state = engine.execute(state, const RollDice()).state;
        if (abilityId != null) {
          state = engine
              .execute(
                state,
                AssignDieToAbility(dieIndex: 0, abilityId: abilityId),
              )
              .state;
          state = engine
              .execute(
                state,
                UseAbility(abilityId: abilityId, targetId: 'goblin_01'),
              )
              .state;
        }
        state = engine.execute(state, const EndTurn()).state;
        return state;
      }

      // Turn 1: poison (goblin 16, potency 3, 4 turns); tick -> 13.
      state = playTurn(state, abilityId: 'poison_strike');
      state = engine.execute(state, const EnemyAct()).state;
      state = engine.execute(state, const EnemyAct()).state; // turn 2

      // Turn 2: slash (13 -> 10); tick -> 7.
      state = playTurn(state, abilityId: 'slash');
      state = engine.execute(state, const EnemyAct()).state;
      state = engine.execute(state, const EnemyAct()).state; // turn 3

      // Turn 3: slash (7 -> 4); tick -> 1.
      state = playTurn(state, abilityId: 'slash');
      state = engine.execute(state, const EnemyAct()).state;
      state = engine.execute(state, const EnemyAct()).state; // turn 4

      // Turn 4: defend; poison ticks 1 -> -2 at the goblin's turn start.
      state = playTurn(state);
      final result = engine.execute(state, const EnemyAct());
      expect(result.state.phase, CombatPhase.victory);
      expect(
        result.events,
        containsAll([
          const EnemyDefeated(enemyId: 'goblin_01'),
          const CombatWon(turns: 4),
        ]),
      );
      final poisonKill = result.events.whereType<DamageDealt>().last;
      expect(poisonKill.source, DamageSource.poison);
      expect(poisonKill.remainingHp, lessThan(1));
    });

    test('phase transition rules are enforced', () {
      final engine = _engine(FakeRandomSource()..enqueueInts([0, 0, 0]));
      var state = _started(engine);
      _expectIllegal(engine, state, const EndTurn());
      _expectIllegal(engine, state, const EnemyAct());
      state = engine.execute(state, const RollDice()).state;
      _expectIllegal(engine, state, const EnemyAct());
      state = engine.execute(state, const EndTurn()).state;
      _expectIllegal(engine, state, const RollDice());
      _expectIllegal(engine, state, const EndTurn());
    });
  });

  group('headless full combats', () {
    test('auto-play defeats a goblin (victory)', () {
      final engine = CombatEngine(
        content: _content,
        random: SeededRandomSource(17),
      );
      final (state, events) = _runCombat(
        engine,
        heroId: 'hero_knight',
        monsterIds: ['goblin_01'],
      );
      expect(state.phase, CombatPhase.victory, reason: 'turns: ${state.turn}');
      expect(state.turn, lessThan(20));
      expect(events.whereType<CombatWon>(), hasLength(1));
    });

    test('auto-play loses to the Bone King (defeat)', () {
      final engine = CombatEngine(
        content: _content,
        random: SeededRandomSource(7),
      );
      final (state, events) = _runCombat(
        engine,
        heroId: 'hero_knight',
        monsterIds: ['bone_king'],
      );
      expect(state.phase, CombatPhase.defeat, reason: 'turns: ${state.turn}');
      expect(events.whereType<PlayerDefeated>(), hasLength(1));
      expect(events.whereType<DamageDealt>().last.remainingHp, lessThan(1));
    });
  });

  group('determinism', () {
    test('same seed produces identical states and events', () {
      List<Object> run() {
        final engine = CombatEngine(
          content: _content,
          random: SeededRandomSource(42),
        );
        final (state, events) = _runCombat(
          engine,
          heroId: 'hero_knight',
          monsterIds: ['goblin_01', 'skeleton_01'],
        );
        return [state, events];
      }

      expect(run(), equals(run()));
    });
  });

  group('serialization', () {
    test('combat state round trips through JSON', () {
      final engine = _engine(
        FakeRandomSource()..enqueueInts([2, 2, 2, 1, 2, 0, 1, 1, 1, 1, 0]),
      );
      var state = _started(engine);
      state = engine.execute(state, const RollDice()).state;
      state = engine
          .execute(
            state,
            const AssignDieToAbility(dieIndex: 0, abilityId: 'poison_strike'),
          )
          .state;
      state = engine
          .execute(
            state,
            const UseAbility(abilityId: 'poison_strike', targetId: 'goblin_01'),
          )
          .state;
      state = engine.execute(state, const EndTurn()).state;
      state = engine.execute(state, const EnemyAct()).state;

      final encoded = jsonEncode(state.toJson());
      final restored = CombatState.fromJson(
        jsonDecode(encoded) as Map<String, dynamic>,
      );
      expect(restored, state);
      expect(restored.phase, CombatPhase.enemyTurn);
      expect(restored.enemies.single.statuses.single.statusId, 'poison');
    });
  });
}
