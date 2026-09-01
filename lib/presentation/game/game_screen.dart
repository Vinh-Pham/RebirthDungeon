import 'package:flame/game.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'package:rebirth_dungeon/application/combat/combat_controller.dart';
import 'package:rebirth_dungeon/application/providers/shared_providers.dart';
import 'package:rebirth_dungeon/application/run/run_controller.dart';
import 'package:rebirth_dungeon/application/run/run_event_bus.dart';
import 'package:rebirth_dungeon/domain/combat/combat_die.dart';
import 'package:rebirth_dungeon/domain/combat/combat_event.dart';
import 'package:rebirth_dungeon/domain/combat/combat_state.dart';
import 'package:rebirth_dungeon/domain/content/ability_data.dart';
import 'package:rebirth_dungeon/domain/dungeon/dungeon_run_state.dart';
import 'package:rebirth_dungeon/domain/dungeon/run_event.dart';
import 'package:rebirth_dungeon/domain/dungeon/run_room.dart';
import 'package:rebirth_dungeon/game/dungeon_game.dart';

/// Head-up view of the current run: the Flame dungeon view on top, and
/// Flutter panels for navigation, dice, abilities, and the event log below
/// (dart-game-plan.md section 9).
///
/// The [DungeonGame] receives the run snapshot for structure and the event
/// stream for animation. Selected dice and the targeted enemy are
/// intentionally *local* widget state: transient visual state stays out of
/// Riverpod.
class GameScreen extends ConsumerStatefulWidget {
  const GameScreen({required this.runId, super.key});

  final String runId;

  @override
  ConsumerState<GameScreen> createState() => _GameScreenState();
}

class _GameScreenState extends ConsumerState<GameScreen> {
  DungeonGame? _game;

  @override
  Widget build(BuildContext context) {
    final ui = ref.watch(runControllerProvider);
    final run = ui.run;

    if (run == null || run.runId != widget.runId) {
      // The router guard normally redirects; this is a safety net.
      return _NoRunScaffold(onBack: () => context.go('/dungeon'));
    }

    final game = _game ??= DungeonGame(
      runEvents: ref.read(runEventBusProvider).stream,
      initialRun: run,
    );
    // Keep the world in sync with every state change (structural data only;
    // animation arrives through the event bus).
    ref.listen(runControllerProvider, (_, next) {
      final nextRun = next.run;
      if (nextRun != null && nextRun.runId == widget.runId) {
        game.syncRun(nextRun);
      }
    });

    return Scaffold(
      appBar: AppBar(
        title: Text('Floor ${run.floorIndex + 1} of ${run.floorCount}'),
        leading: IconButton(
          icon: const Icon(Icons.close),
          onPressed: () => context.go('/home'),
        ),
      ),
      body: Column(
        children: [
          if (ui.error != null)
            Material(
              color: Theme.of(context).colorScheme.errorContainer,
              child: ListTile(
                dense: true,
                leading: const Icon(Icons.warning_amber_rounded),
                title: Text(ui.error!),
              ),
            ),
          _HeroStatusBar(run: run),
          Expanded(flex: 5, child: GameWidget(game: game)),
          if (run.status == RunStatus.victory)
            const _RunResultCard(victory: true)
          else if (run.status == RunStatus.defeat)
            const _RunResultCard(victory: false)
          else if (run.combat != null)
            Expanded(
              child: _CombatPanel(combat: run.combat!, heroId: run.heroId),
            )
          else
            Expanded(child: _RoomPanel(run: run)),
          Expanded(child: _EventLog(events: ui.lastEvents)),
        ],
      ),
    );
  }
}

class _NoRunScaffold extends StatelessWidget {
  const _NoRunScaffold({required this.onBack});

  final VoidCallback onBack;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('No active run')),
      body: Center(
        child: FilledButton(
          onPressed: onBack,
          child: const Text('Choose a dungeon'),
        ),
      ),
    );
  }
}

class _HeroStatusBar extends StatelessWidget {
  const _HeroStatusBar({required this.run});

  final DungeonRunState run;

  @override
  Widget build(BuildContext context) {
    final player = run.combat?.player;
    final hp = player?.hp ?? run.heroHp;
    final maxHp = player?.maxHp ?? run.heroMaxHp;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Row(
        children: [
          Text(run.heroId, style: Theme.of(context).textTheme.labelLarge),
          const SizedBox(width: 12),
          Expanded(
            child: LinearProgressIndicator(value: maxHp == 0 ? 0 : hp / maxHp),
          ),
          const SizedBox(width: 12),
          Text('$hp / $maxHp HP'),
          if (player != null && player.shield > 0) ...[
            const SizedBox(width: 8),
            Icon(Icons.shield, size: 16, color: Colors.blueGrey.shade200),
            Text('${player.shield}'),
          ],
        ],
      ),
    );
  }
}

class _RoomPanel extends ConsumerWidget {
  const _RoomPanel({required this.run});

  final DungeonRunState run;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final room = run.currentRoom;
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Card(
          child: ListTile(
            leading: Icon(_roomIcon(room.kind)),
            title: Text('Room ${room.index + 1} — ${room.kind.name}'),
            subtitle: Text(room.cleared ? 'Cleared' : _roomHint(room.kind)),
          ),
        ),
        if (room.kind == RoomKind.boss && room.cleared)
          Padding(
            padding: const EdgeInsets.only(top: 8),
            child: FilledButton.icon(
              icon: const Icon(Icons.stairs),
              label: Text(
                run.floorIndex + 1 < run.floorCount
                    ? 'Descend to floor ${run.floorIndex + 2}'
                    : 'Complete the run',
              ),
              onPressed: () =>
                  ref.read(runControllerProvider.notifier).descend(),
            ),
          ),
        const SizedBox(height: 16),
        Text('Doors', style: Theme.of(context).textTheme.titleSmall),
        for (final door in room.doors)
          ListTile(
            leading: Icon(_roomIcon(run.rooms[door].kind)),
            title: Text('Room ${door + 1} — ${run.rooms[door].kind.name}'),
            subtitle: Text(run.rooms[door].cleared ? 'Cleared' : 'Unexplored'),
            trailing: const Icon(Icons.meeting_room),
            onTap: () =>
                ref.read(runControllerProvider.notifier).enterRoom(door),
          ),
      ],
    );
  }

  static IconData _roomIcon(RoomKind kind) => switch (kind) {
    RoomKind.entry => Icons.flag,
    RoomKind.combat => Icons.flash_on,
    RoomKind.treasure => Icons.redeem,
    RoomKind.event => Icons.auto_fix_high,
    RoomKind.boss => Icons.dangerous,
  };

  static String _roomHint(RoomKind kind) => switch (kind) {
    RoomKind.entry => 'The way in.',
    RoomKind.combat => 'Something stirs here...',
    RoomKind.treasure => 'You spot a chest.',
    RoomKind.event => 'A strange shrine hums softly.',
    RoomKind.boss => 'A powerful presence awaits.',
  };
}

class _CombatPanel extends ConsumerStatefulWidget {
  const _CombatPanel({required this.combat, required this.heroId});

  final CombatState combat;
  final String heroId;

  @override
  ConsumerState<_CombatPanel> createState() => _CombatPanelState();
}

class _CombatPanelState extends ConsumerState<_CombatPanel> {
  final Set<int> _selectedDice = <int>{};
  String? _targetId;

  @override
  Widget build(BuildContext context) {
    final combat = widget.combat;
    final content = ref.watch(contentProvider).value;
    if (content == null) {
      return const Center(child: CircularProgressIndicator());
    }
    final controller = ref.read(combatControllerProvider);
    final hero = content.hero(widget.heroId);
    final phase = combat.phase;

    final livingEnemies = combat.enemies
        .where((enemy) => enemy.hp > 0)
        .toList();
    final targetId = livingEnemies.any((enemy) => enemy.id == _targetId)
        ? _targetId
        : combat.firstLivingEnemy?.id;

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text(
          'Phase: ${phase.name}',
          style: Theme.of(context).textTheme.labelLarge,
        ),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          children: [
            for (final enemy in combat.enemies)
              ChoiceChip(
                label: Text(
                  '${enemy.name} ${enemy.hp}/${enemy.maxHp}'
                  '${enemy.shield > 0 ? ' (+${enemy.shield})' : ''}',
                ),
                selected: enemy.hp > 0 && enemy.id == targetId,
                onSelected: enemy.hp > 0
                    ? (_) => setState(() => _targetId = enemy.id)
                    : null,
              ),
          ],
        ),
        const SizedBox(height: 12),
        Wrap(
          spacing: 8,
          children: [
            for (final die in combat.dice)
              FilterChip(
                label: Text(
                  die.status == DieStatus.unrolled
                      ? '🎲—'
                      : '🎲${die.faceValue}'
                            '${die.status == DieStatus.spent ? ' (spent)' : ''}',
                ),
                selected: _selectedDice.contains(die.dieIndex),
                onSelected: die.status == DieStatus.available
                    ? (selected) => setState(() {
                        selected
                            ? _selectedDice.add(die.dieIndex)
                            : _selectedDice.remove(die.dieIndex);
                      })
                    : null,
              ),
          ],
        ),
        const SizedBox(height: 12),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            for (final abilityId in hero.abilityIds)
              FilledButton.tonal(
                onPressed:
                    phase == CombatPhase.awaitingPlayerAction &&
                        _selectedDice.length ==
                            content.ability(abilityId).dieCost
                    ? () => _useAbility(
                        controller,
                        content.ability(abilityId),
                        targetId,
                      )
                    : null,
                child: Text(
                  '${content.ability(abilityId).name} '
                  '(${content.ability(abilityId).dieCost} dice)',
                ),
              ),
          ],
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            if (phase == CombatPhase.rolling)
              FilledButton(
                onPressed: () {
                  setState(_selectedDice.clear);
                  controller.rollDice();
                },
                child: const Text('Roll dice'),
              ),
            if (phase == CombatPhase.awaitingPlayerAction)
              OutlinedButton(
                onPressed: () {
                  setState(_selectedDice.clear);
                  controller.endTurn();
                },
                child: const Text('End turn'),
              ),
            if (phase == CombatPhase.enemyTurn)
              FilledButton.tonal(
                onPressed: controller.enemyAct,
                child: const Text('Enemy action'),
              ),
          ],
        ),
      ],
    );
  }

  void _useAbility(
    CombatController controller,
    AbilityData ability,
    String? targetId,
  ) {
    final needsTarget = ability.effect == AbilityEffect.damage;
    if (needsTarget && targetId == null) {
      return;
    }
    for (final dieIndex in _selectedDice) {
      controller.assignDie(dieIndex: dieIndex, abilityId: ability.id);
    }
    controller.useAbility(abilityId: ability.id, targetId: targetId);
    setState(_selectedDice.clear);
  }
}

class _RunResultCard extends StatelessWidget {
  const _RunResultCard({required this.victory});

  final bool victory;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.all(16),
      color: victory ? Colors.green.shade900 : Colors.red.shade900,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Icon(victory ? Icons.emoji_events : Icons.heart_broken, size: 40),
            const SizedBox(height: 8),
            Text(
              victory ? 'Run complete!' : 'You have fallen...',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 8),
            OutlinedButton(
              onPressed: () => context.go('/home'),
              child: const Text('Return home'),
            ),
          ],
        ),
      ),
    );
  }
}

class _EventLog extends StatelessWidget {
  const _EventLog({required this.events});

  final List<RunEvent> events;

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Theme.of(context).colorScheme.surfaceContainerHighest,
      child: ListView(
        padding: const EdgeInsets.all(12),
        children: [
          Text('Log', style: Theme.of(context).textTheme.labelLarge),
          for (final event in events.reversed)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 2),
              child: Text(
                '• ${_describe(event)}',
                style: Theme.of(context).textTheme.bodySmall,
              ),
            ),
        ],
      ),
    );
  }

  static String _describe(RunEvent event) => switch (event) {
    RunStarted(:final dungeonId, :final seed) =>
      'Entered $dungeonId (seed $seed).',
    RoomEntered(:final roomIndex, :final roomKind) =>
      'Entered room ${roomIndex + 1} (${roomKind.name}).',
    RoomCleared(:final roomIndex) => 'Room ${roomIndex + 1} cleared.',
    LootGained(:final entries) =>
      'Loot: ${entries.map((e) => '${e.quantity}x ${e.itemId}').join(', ')}',
    ShrineHealed(:final healed, :final remainingHp) =>
      healed > 0
          ? 'The shrine restores $healed HP ($remainingHp left).'
          : 'The shrine hums; you are already at full health.',
    FloorDescended(:final floorIndex) =>
      'Descended to floor ${floorIndex + 1}.',
    RunCompleted() => 'The dungeon is conquered!',
    RunFailed() => 'Your run ends here.',
    CombatVictory(:final roomIndex) => 'Victory in room ${roomIndex + 1}!',
    CombatDefeat() => 'Defeated...',
    CombatHappened(:final event) => switch (event) {
      DiceRolled(:final rolls) =>
        'Rolled ${rolls.map((roll) => roll.value).join(", ")}.',
      DieAssigned(:final dieIndex, :final abilityId) =>
        'Die $dieIndex readied for $abilityId.',
      AbilityActivated(:final actorId, :final abilityId, :final targetId) =>
        abilityId == null
            ? '$actorId strikes at $targetId.'
            : '$actorId uses $abilityId on $targetId.',
      CriticalHit(:final targetId, :final amount) =>
        'Critical hit on $targetId ($amount)!',
      DamageDealt(:final targetId, :final amount, :final source) =>
        amount > 0
            ? '$targetId takes $amount ${source.name} damage.'
            : '$targetId shrugs off the blow.',
      ShieldAbsorbed(:final targetId, :final amount) =>
        '$targetId\'s shield absorbs $amount.',
      HealingApplied(:final targetId, :final amount) =>
        '$targetId heals $amount.',
      ShieldGained(:final targetId, :final amount) =>
        '$targetId gains a shield of $amount.',
      StatusApplied(:final targetId, :final statusId) =>
        '$targetId is afflicted with $statusId.',
      StatusExpired(:final targetId, :final statusId) =>
        '$statusId wears off $targetId.',
      EnemyDefeated(:final enemyId) => '$enemyId is defeated!',
      PlayerDefeated() => 'The hero falls!',
      CombatWon() => 'Combat won!',
      TurnStarted(:final turn) => '— turn $turn —',
      CombatStarted(:final enemyIds) =>
        'Combat begins: ${enemyIds.join(", ")}.',
    },
  };
}
