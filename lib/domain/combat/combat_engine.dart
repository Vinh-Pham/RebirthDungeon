import 'dart:math';

import 'package:rebirth_dungeon/core/engine/engine_contracts.dart';
import 'package:rebirth_dungeon/core/errors/domain_exception.dart';
import 'package:rebirth_dungeon/core/errors/failure.dart';
import 'package:rebirth_dungeon/core/random/random_source.dart';
import 'package:rebirth_dungeon/core/value_objects/int_range.dart';
import 'package:rebirth_dungeon/domain/combat/combat_command.dart';
import 'package:rebirth_dungeon/domain/combat/combat_die.dart';
import 'package:rebirth_dungeon/domain/combat/combat_event.dart';
import 'package:rebirth_dungeon/domain/combat/combat_state.dart';
import 'package:rebirth_dungeon/domain/combat/combatant.dart';
import 'package:rebirth_dungeon/domain/content/ability_data.dart';
import 'package:rebirth_dungeon/domain/content/die_data.dart';
import 'package:rebirth_dungeon/domain/content/game_content.dart';
import 'package:rebirth_dungeon/domain/content/status_effect_data.dart';

/// The pure-Dart dice combat engine (dart-game-plan.md section 4).
///
/// Resolves [CombatCommand]s against an immutable [CombatState] and returns
/// the new state plus the [CombatEvent]s that happened. All randomness flows
/// through the injected combat-channel [RandomSource] — construct it with
/// `SeededRandomSource(deriveSeed(runSeed, 'combat'))` so combat stays
/// independent of the gacha/loot streams. The same state, command sequence,
/// and seed always produce the same state and events. Commands are validated
/// before any randomness is consumed.
///
/// Rules (first prototype):
///
/// - Attack damage = `power roll + effective attack`, where effective attack
///   is the combatant's attack plus active buff potencies. A crit (any
///   consumed die on its max face, player attacks only) doubles that total.
/// - Mitigation order: subtract defense (minimum 1 remains), then the
///   shield absorbs before HP.
/// - Debuffs tick their potency at the start of the bearer's turn, bypassing
///   defense and shield, then count down; buffs add their potency to attack
///   and count down. Reapplying a status keeps the higher potency and the
///   longer remaining duration.
/// - Enemies act deterministically: strongest ability by
///   `(power.max desc, power.min desc, id asc)`, otherwise a basic strike of
///   `1..basicAttackMax` plus attack.
class CombatEngine
    implements DomainEngine<CombatState, CombatCommand, CombatEvent> {
  CombatEngine({required this.content, required this.random});

  final GameContent content;
  final RandomSource random;

  @override
  EngineResult<CombatState, CombatEvent> execute(
    CombatState state,
    CombatCommand command,
  ) {
    final (newState, events) = switch (command) {
      StartCombat() => _startCombat(state, command),
      RollDice() => _rollDice(state),
      RerollDice() => _rerollDice(state, command),
      AssignDieToAbility() => _assignDie(state, command),
      UseAbility() => _useAbility(state, command),
      EndTurn() => _endTurn(state),
      EnemyAct() => _enemyAct(state),
    };
    return EngineResult(state: newState, events: events);
  }

  // ---------------------------------------------------------------------------
  // Commands
  // ---------------------------------------------------------------------------

  (CombatState, List<CombatEvent>) _startCombat(
    CombatState state,
    StartCombat command,
  ) {
    if (state.phase != CombatPhase.notStarted) {
      throw _invalid('Combat has already started.');
    }
    if (command.monsterIds.isEmpty) {
      throw _invalid('Combat needs at least one monster.');
    }
    final hero = content.hero(command.heroId);
    final die = content.die(hero.dieId);

    final occurrences = <String, int>{};
    final enemies = <EnemyCombatant>[];
    for (final monsterId in command.monsterIds) {
      final monster = content.monster(monsterId);
      final occurrence = (occurrences[monsterId] ?? 0) + 1;
      occurrences[monsterId] = occurrence;
      enemies.add(
        EnemyCombatant(
          id: occurrence == 1 ? monsterId : '$monsterId#$occurrence',
          contentId: monster.id,
          name: monster.name,
          hp: monster.hp,
          maxHp: monster.hp,
          attack: monster.attack,
          defense: monster.defense,
          abilityIds: monster.abilityIds,
          basicAttackMax: max(1, monster.attack),
        ),
      );
    }

    final player = PlayerCombatant(
      id: hero.id,
      name: hero.name,
      hp: hero.baseHp,
      maxHp: hero.baseHp,
      attack: hero.baseAttack,
      defense: hero.baseDefense,
      abilityIds: hero.abilityIds,
    );
    final dice = List.generate(
      hero.dieCount,
      (index) => CombatDie(
        dieIndex: index,
        dieId: die.id,
        sides: die.sides,
        maxFace: _maxFace(die),
      ),
    );

    final events = <CombatEvent>[
      CombatStarted(
        playerId: player.id,
        enemyIds: enemies.map((enemy) => enemy.id).toList(),
      ),
      const TurnStarted(turn: 1),
    ];
    return (
      state.copyWith(
        phase: CombatPhase.rolling,
        player: player,
        enemies: enemies,
        dice: dice,
        turn: 1,
      ),
      events,
    );
  }

  (CombatState, List<CombatEvent>) _rollDice(CombatState state) {
    _requirePhase(state, CombatPhase.rolling, 'roll dice');
    final rolls = <DieRoll>[];
    final dice = state.dice.map((die) {
      final roll = _rollOne(die);
      rolls.add(roll);
      return die.copyWith(
        faceValue: roll.value,
        tags: roll.tags,
        status: DieStatus.available,
      );
    }).toList();
    return (
      state.copyWith(dice: dice, phase: CombatPhase.awaitingPlayerAction),
      <CombatEvent>[DiceRolled(rolls: rolls)],
    );
  }

  (CombatState, List<CombatEvent>) _rerollDice(
    CombatState state,
    RerollDice command,
  ) {
    _requirePhase(state, CombatPhase.awaitingPlayerAction, 'reroll dice');
    if (state.rerollsUsedThisTurn >= 1) {
      throw _invalid('Only one reroll is allowed per turn.');
    }
    if (command.dieIndices.isEmpty) {
      throw _invalid('Reroll needs at least one die index.');
    }
    final byIndex = {for (final die in state.dice) die.dieIndex: die};
    for (final index in command.dieIndices) {
      final die = byIndex[index];
      if (die == null) {
        throw _invalid('No die with index $index.');
      }
      if (die.status != DieStatus.available) {
        throw _invalid(
          'Die $index cannot be rerolled (status: ${die.status.name}).',
        );
      }
    }
    final rerolled = command.dieIndices.toSet();
    final rolls = <DieRoll>[];
    final dice = state.dice.map((die) {
      if (!rerolled.contains(die.dieIndex)) {
        return die;
      }
      final roll = _rollOne(die);
      rolls.add(roll);
      return die.copyWith(faceValue: roll.value, tags: roll.tags);
    }).toList();
    return (
      state.copyWith(dice: dice, rerollsUsedThisTurn: 1),
      <CombatEvent>[DiceRolled(rolls: rolls)],
    );
  }

  (CombatState, List<CombatEvent>) _assignDie(
    CombatState state,
    AssignDieToAbility command,
  ) {
    _requirePhase(state, CombatPhase.awaitingPlayerAction, 'assign dice');
    if (!state.player.abilityIds.contains(command.abilityId)) {
      throw _invalid(
        '"${command.abilityId}" is not one of the hero\'s '
        'abilities.',
      );
    }
    final die = state.dice
        .where((d) => d.dieIndex == command.dieIndex)
        .firstOrNull;
    if (die == null) {
      throw _invalid('No die with index ${command.dieIndex}.');
    }
    if (die.status != DieStatus.available) {
      throw _invalid(
        'Die ${command.dieIndex} cannot be assigned (status: '
        '${die.status.name}).',
      );
    }
    final dice = state.dice
        .map(
          (d) => d.dieIndex == command.dieIndex
              ? d.copyWith(
                  status: DieStatus.assigned,
                  assignedAbility: command.abilityId,
                )
              : d,
        )
        .toList();
    return (
      state.copyWith(dice: dice),
      <CombatEvent>[
        DieAssigned(dieIndex: command.dieIndex, abilityId: command.abilityId),
      ],
    );
  }

  (CombatState, List<CombatEvent>) _useAbility(
    CombatState state,
    UseAbility command,
  ) {
    _requirePhase(state, CombatPhase.awaitingPlayerAction, 'use abilities');
    final ability = content.ability(command.abilityId);
    final player = state.player;
    if (!player.abilityIds.contains(ability.id)) {
      throw _invalid('"${ability.id}" is not one of the hero\'s abilities.');
    }
    final assigned =
        state.dice
            .where(
              (die) =>
                  die.status == DieStatus.assigned &&
                  die.assignedAbility == ability.id,
            )
            .toList()
          ..sort((a, b) => a.dieIndex.compareTo(b.dieIndex));
    if (assigned.length < ability.dieCost) {
      throw _invalid(
        '"${ability.id}" needs ${ability.dieCost} assigned dice, '
        '${assigned.length} assigned.',
      );
    }
    EnemyCombatant? target;
    if (ability.effect == AbilityEffect.damage) {
      final targetId = command.targetId;
      if (targetId == null) {
        throw _invalid('A damaging ability needs a target.');
      }
      target = state.enemyById(targetId);
      if (target == null || target.hp <= 0) {
        throw _invalid('Target "$targetId" is not a living enemy.');
      }
    }

    // Fixed RNG consumption order: power roll, then status potency, then
    // status duration — replays stay deterministic.
    final powerRoll = ability.power.sample(random);
    final consumed = assigned.take(ability.dieCost).toList();
    final isCritical = consumed.any(
      (die) => die.faceValue != null && die.faceValue == die.maxFace,
    );
    final dice = state.dice.map((die) {
      final wasConsumed = consumed.any((c) => c.dieIndex == die.dieIndex);
      return wasConsumed
          ? die.copyWith(status: DieStatus.spent, assignedAbility: null)
          : die;
    }).toList();

    final events = <CombatEvent>[];
    var enemies = state.enemies;
    var playerAfter = player;
    var victoryNow = false;

    switch (ability.effect) {
      case AbilityEffect.damage:
        final raw =
            (powerRoll + _effectiveAttack(player.attack, player.statuses)) *
            (isCritical ? 2 : 1);
        events.add(
          AbilityActivated(
            actorId: player.id,
            abilityId: ability.id,
            targetId: target!.id,
          ),
        );
        if (isCritical) {
          events.add(CriticalHit(targetId: target.id, amount: raw));
        }
        final (damaged, damageEvents, _) = _damageEnemy(target, raw);
        events.addAll(damageEvents);
        var damagedFinal = damaged;
        if (ability.statusId != null && damaged.hp > 0) {
          final (statuses, statusEvents) = _applyStatus(
            targetId: damaged.id,
            existing: damaged.statuses,
            statusId: ability.statusId!,
          );
          damagedFinal = damaged.copyWith(statuses: statuses);
          events.addAll(statusEvents);
        }
        enemies = [
          for (final enemy in enemies)
            enemy.id == damagedFinal.id ? damagedFinal : enemy,
        ];
        victoryNow = enemies.every((enemy) => enemy.hp <= 0);
      case AbilityEffect.heal:
        events.add(
          AbilityActivated(
            actorId: player.id,
            abilityId: ability.id,
            targetId: player.id,
          ),
        );
        final healed = min(powerRoll, player.maxHp - player.hp);
        playerAfter = player.copyWith(hp: player.hp + healed);
        events.add(
          HealingApplied(
            targetId: player.id,
            amount: healed,
            remainingHp: playerAfter.hp,
          ),
        );
      case AbilityEffect.shield:
        events.add(
          AbilityActivated(
            actorId: player.id,
            abilityId: ability.id,
            targetId: player.id,
          ),
        );
        playerAfter = player.copyWith(shield: player.shield + powerRoll);
        events.add(
          ShieldGained(
            targetId: player.id,
            amount: powerRoll,
            totalShield: playerAfter.shield,
          ),
        );
    }

    var newState = state.copyWith(
      dice: dice,
      player: playerAfter,
      enemies: enemies,
    );
    if (victoryNow) {
      events.add(CombatWon(turns: state.turn));
      newState = newState.copyWith(phase: CombatPhase.victory);
    }
    return (newState, events);
  }

  (CombatState, List<CombatEvent>) _endTurn(CombatState state) {
    _requirePhase(state, CombatPhase.awaitingPlayerAction, 'end the turn');
    return (
      state.copyWith(phase: CombatPhase.enemyTurn, enemyActionCursor: 0),
      const <CombatEvent>[],
    );
  }

  (CombatState, List<CombatEvent>) _enemyAct(CombatState state) {
    _requirePhase(state, CombatPhase.enemyTurn, 'act for enemies');

    var cursor = state.enemyActionCursor;
    while (cursor < state.enemies.length && state.enemies[cursor].hp <= 0) {
      cursor++;
    }
    if (cursor >= state.enemies.length) {
      return _startPlayerTurn(state);
    }

    final enemy = state.enemies[cursor];
    final events = <CombatEvent>[];

    // Start of this enemy's turn: its statuses tick first.
    final (ticked, tickEvents, diedFromStatuses) = _tickEnemyStatuses(enemy);
    events.addAll(tickEvents);
    var enemies = [
      for (final e in state.enemies) e.id == enemy.id ? ticked : e,
    ];
    if (diedFromStatuses) {
      events.add(EnemyDefeated(enemyId: enemy.id));
      if (enemies.every((e) => e.hp <= 0)) {
        events.add(CombatWon(turns: state.turn));
        return (
          state.copyWith(enemies: enemies, phase: CombatPhase.victory),
          events,
        );
      }
      return (
        state.copyWith(enemies: enemies, enemyActionCursor: cursor + 1),
        events,
      );
    }

    // Deterministic AI: strongest ability, else a basic strike.
    final ability = _chooseEnemyAbility(ticked);
    final powerRange =
        ability?.power ?? IntRange(min: 1, max: ticked.basicAttackMax);
    final powerRoll = powerRange.sample(random);
    final raw = powerRoll + _effectiveAttack(ticked.attack, ticked.statuses);
    events.add(
      AbilityActivated(
        actorId: ticked.id,
        abilityId: ability?.id,
        targetId: state.player.id,
      ),
    );

    var player = state.player;
    final (damagedPlayer, damageEvents) = _damagePlayer(player, raw);
    events.addAll(damageEvents);
    player = damagedPlayer;
    if (ability?.statusId != null && player.hp > 0) {
      final (statuses, statusEvents) = _applyStatus(
        targetId: player.id,
        existing: player.statuses,
        statusId: ability!.statusId!,
      );
      player = player.copyWith(statuses: statuses);
      events.addAll(statusEvents);
    }

    if (player.hp <= 0) {
      events.add(const PlayerDefeated());
      return (
        state.copyWith(
          enemies: enemies,
          player: player,
          phase: CombatPhase.defeat,
        ),
        events,
      );
    }

    return (
      state.copyWith(
        enemies: enemies,
        player: player,
        enemyActionCursor: cursor + 1,
      ),
      events,
    );
  }

  // ---------------------------------------------------------------------------
  // Turn transitions and shared rules
  // ---------------------------------------------------------------------------

  (CombatState, List<CombatEvent>) _startPlayerTurn(CombatState state) {
    final nextTurn = state.turn + 1;
    final events = <CombatEvent>[TurnStarted(turn: nextTurn)];
    final (player, tickEvents) = _tickPlayerStatuses(state.player);
    events.addAll(tickEvents);
    if (player.hp <= 0) {
      events.add(const PlayerDefeated());
      return (
        state.copyWith(player: player, phase: CombatPhase.defeat),
        events,
      );
    }
    return (
      state.copyWith(
        player: player,
        turn: nextTurn,
        phase: CombatPhase.rolling,
        enemyActionCursor: 0,
        rerollsUsedThisTurn: 0,
        dice: [
          for (final die in state.dice)
            die.copyWith(
              faceValue: null,
              tags: [],
              status: DieStatus.unrolled,
              assignedAbility: null,
            ),
        ],
      ),
      events,
    );
  }

  (PlayerCombatant, List<CombatEvent>) _tickPlayerStatuses(
    PlayerCombatant player,
  ) {
    final events = <CombatEvent>[];
    final remaining = <ActiveStatusEffect>[];
    var hp = player.hp;
    for (final effect in player.statuses) {
      if (effect.kind == StatusEffectKind.debuff) {
        hp -= effect.potency;
        events.add(
          DamageDealt(
            targetId: player.id,
            amount: effect.potency,
            remainingHp: hp,
            source: DamageSource.poison,
          ),
        );
      }
      if (effect.remainingTurns > 1) {
        remaining.add(
          effect.copyWith(remainingTurns: effect.remainingTurns - 1),
        );
      } else {
        events.add(
          StatusExpired(targetId: player.id, statusId: effect.statusId),
        );
      }
    }
    return (player.copyWith(hp: hp, statuses: remaining), events);
  }

  (EnemyCombatant, List<CombatEvent>, bool) _tickEnemyStatuses(
    EnemyCombatant enemy,
  ) {
    final events = <CombatEvent>[];
    final remaining = <ActiveStatusEffect>[];
    var hp = enemy.hp;
    for (final effect in enemy.statuses) {
      if (effect.kind == StatusEffectKind.debuff) {
        hp -= effect.potency;
        events.add(
          DamageDealt(
            targetId: enemy.id,
            amount: effect.potency,
            remainingHp: hp,
            source: DamageSource.poison,
          ),
        );
      }
      if (effect.remainingTurns > 1) {
        remaining.add(
          effect.copyWith(remainingTurns: effect.remainingTurns - 1),
        );
      } else {
        events.add(
          StatusExpired(targetId: enemy.id, statusId: effect.statusId),
        );
      }
    }
    return (enemy.copyWith(hp: hp, statuses: remaining), events, hp <= 0);
  }

  (EnemyCombatant, List<CombatEvent>, bool) _damageEnemy(
    EnemyCombatant enemy,
    int rawAmount,
  ) {
    final events = <CombatEvent>[];
    final net = max(1, rawAmount - enemy.defense);
    final absorbed = min(enemy.shield, net);
    final hpDamage = net - absorbed;
    final hp = enemy.hp - hpDamage;
    if (absorbed > 0) {
      events.add(ShieldAbsorbed(targetId: enemy.id, amount: absorbed));
    }
    events.add(
      DamageDealt(
        targetId: enemy.id,
        amount: hpDamage,
        remainingHp: hp,
        source: DamageSource.attack,
      ),
    );
    final defeated = hp <= 0;
    if (defeated) {
      events.add(EnemyDefeated(enemyId: enemy.id));
    }
    return (
      enemy.copyWith(hp: hp, shield: enemy.shield - absorbed),
      events,
      defeated,
    );
  }

  (PlayerCombatant, List<CombatEvent>) _damagePlayer(
    PlayerCombatant player,
    int rawAmount,
  ) {
    final events = <CombatEvent>[];
    final net = max(1, rawAmount - player.defense);
    final absorbed = min(player.shield, net);
    final hpDamage = net - absorbed;
    final hp = player.hp - hpDamage;
    if (absorbed > 0) {
      events.add(ShieldAbsorbed(targetId: player.id, amount: absorbed));
    }
    events.add(
      DamageDealt(
        targetId: player.id,
        amount: hpDamage,
        remainingHp: hp,
        source: DamageSource.attack,
      ),
    );
    return (player.copyWith(hp: hp, shield: player.shield - absorbed), events);
  }

  /// Applies a status effect, rolling potency and duration from the content
  /// data. Reapplication keeps the higher potency and the longer remaining
  /// duration. Callers only invoke this on living targets.
  (List<ActiveStatusEffect>, List<CombatEvent>) _applyStatus({
    required String targetId,
    required List<ActiveStatusEffect> existing,
    required String statusId,
  }) {
    final status = content.statusEffect(statusId);
    final potencyRoll = status.potency.sample(random);
    final durationRoll = status.durationTurns.sample(random);
    final current = existing.where((e) => e.statusId == statusId).firstOrNull;
    final effect = ActiveStatusEffect(
      statusId: statusId,
      kind: status.kind,
      potency: max(potencyRoll, current?.potency ?? potencyRoll),
      remainingTurns: max(
        durationRoll,
        current?.remainingTurns ?? durationRoll,
      ),
    );
    final updated = [
      for (final e in existing) e.statusId == statusId ? effect : e,
      if (current == null) effect,
    ];
    return (
      updated,
      [
        StatusApplied(
          targetId: targetId,
          statusId: statusId,
          potency: effect.potency,
          remainingTurns: effect.remainingTurns,
        ),
      ],
    );
  }

  AbilityData? _chooseEnemyAbility(EnemyCombatant enemy) {
    if (enemy.abilityIds.isEmpty) {
      return null;
    }
    final abilities = enemy.abilityIds.map(content.ability).toList()
      ..sort((a, b) {
        final byMax = b.power.max.compareTo(a.power.max);
        if (byMax != 0) {
          return byMax;
        }
        final byMin = b.power.min.compareTo(a.power.min);
        if (byMin != 0) {
          return byMin;
        }
        return a.id.compareTo(b.id);
      });
    return abilities.first;
  }

  DieRoll _rollOne(CombatDie die) {
    final faces = content.die(die.dieId).faces;
    if (faces == null) {
      return DieRoll(
        dieIndex: die.dieIndex,
        value: random.nextInt(die.sides) + 1,
      );
    }
    final face = faces[random.nextInt(faces.length)];
    return DieRoll(dieIndex: die.dieIndex, value: face.value, tags: face.tags);
  }

  static int _maxFace(DieData die) {
    final faces = die.faces;
    if (faces == null) {
      return die.sides;
    }
    return faces.map((face) => face.value).reduce(max);
  }

  /// Attack plus the potency of active buffs.
  static int _effectiveAttack(int attack, List<ActiveStatusEffect> statuses) {
    return attack +
        statuses
            .where((s) => s.kind == StatusEffectKind.buff)
            .fold(0, (sum, s) => sum + s.potency);
  }

  void _requirePhase(CombatState state, CombatPhase expected, String action) {
    if (state.phase != expected) {
      throw _invalid(
        'Cannot $action while phase is ${state.phase.name} '
        '(expected ${expected.name}).',
      );
    }
  }

  static DomainException _invalid(String message) =>
      DomainException(Failure.invalidOperation(message: message));
}
