import 'package:flutter_test/flutter_test.dart';
import 'package:rebirth_dungeon/domain/combat/combat_event.dart';
import 'package:rebirth_dungeon/domain/dungeon/run_event.dart';
import 'package:rebirth_dungeon/domain/dungeon/run_room.dart';
import 'package:rebirth_dungeon/game/bridge/event_bridge.dart';
import 'package:rebirth_dungeon/game/bridge/presentation_event.dart';

void main() {
  const bridge = EventBridge();

  test('combat events translate to presentation effects', () {
    expect(
      bridge.translate(
        const CombatHappened(
          AbilityActivated(
            actorId: 'hero_knight',
            abilityId: 'slash',
            targetId: 'goblin_01',
          ),
        ),
      ),
      equals([const AttackLunge('hero_knight', 'goblin_01')]),
    );

    expect(
      bridge.translate(
        const CombatHappened(CriticalHit(targetId: 'goblin_01', amount: 12)),
      ),
      equals([const CriticalHitFx('goblin_01'), const ScreenShake(5)]),
    );

    expect(
      bridge.translate(
        const CombatHappened(
          DamageDealt(
            targetId: 'goblin_01',
            amount: 6,
            remainingHp: 12,
            source: DamageSource.attack,
          ),
        ),
      ),
      equals([
        const DamageNumber(
          targetId: 'goblin_01',
          amount: 6,
          source: DamageSource.attack,
        ),
      ]),
    );

    expect(
      bridge.translate(
        const CombatHappened(
          DamageDealt(
            targetId: 'hero_knight',
            amount: 0,
            remainingHp: 30,
            source: DamageSource.poison,
          ),
        ),
      ),
      isEmpty,
      reason: 'zero-damage events produce no number',
    );

    expect(
      bridge.translate(
        const CombatHappened(EnemyDefeated(enemyId: 'goblin_01')),
      ),
      equals([const MonsterDied('goblin_01')]),
    );

    expect(
      bridge.translate(CombatHappened(const TurnStarted(turn: 3))),
      isEmpty,
      reason: 'bookkeeping events carry no world effects',
    );
  });

  test('run events translate to movement and floor signals', () {
    expect(
      bridge.translate(
        const RoomEntered(roomIndex: 2, roomKind: RoomKind.boss),
      ),
      equals([const PlayerMoved(2)]),
    );
    expect(
      bridge.translate(const FloorDescended(floorIndex: 1)),
      equals([const FloorChanged()]),
    );
    expect(
      bridge.translate(const RunStarted(runId: 'r', dungeonId: 'd', seed: 1)),
      equals([const FloorChanged()]),
    );
  });

  test('translation is pure: replaying events yields identical types', () {
    final events = <RunEvent>[
      const RunStarted(runId: 'r', dungeonId: 'd', seed: 1),
      const RoomEntered(roomIndex: 1, roomKind: RoomKind.combat),
      const CombatHappened(CombatStarted(playerId: 'hero', enemyIds: ['x'])),
      const CombatHappened(DiceRolled(rolls: [])),
      const CombatHappened(
        AbilityActivated(actorId: 'hero', abilityId: 'slash', targetId: 'x'),
      ),
      const CombatHappened(CriticalHit(targetId: 'x', amount: 9)),
      const CombatHappened(
        DamageDealt(
          targetId: 'x',
          amount: 9,
          remainingHp: 1,
          source: DamageSource.attack,
        ),
      ),
      const CombatHappened(EnemyDefeated(enemyId: 'x')),
      const CombatHappened(CombatWon(turns: 2)),
      const CombatVictory(roomIndex: 1),
      const FloorDescended(floorIndex: 1),
    ];

    List<Type> types(List<PresentationEvent> events) =>
        events.map((event) => event.runtimeType).toList();

    final first = [for (final event in events) ...bridge.translate(event)];
    final second = [for (final event in events) ...bridge.translate(event)];

    expect(types(first), types(second));
  });
}
