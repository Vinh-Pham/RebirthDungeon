import 'package:flame/components.dart';
import 'package:flutter/material.dart';

import 'package:rebirth_dungeon/domain/combat/combat_event.dart';
import 'package:rebirth_dungeon/domain/dungeon/dungeon_run_state.dart';
import 'package:rebirth_dungeon/domain/dungeon/run_room.dart';
import 'package:rebirth_dungeon/game/components/doorway_component.dart';
import 'package:rebirth_dungeon/game/components/monster_component.dart';
import 'package:rebirth_dungeon/game/components/player_component.dart';
import 'package:rebirth_dungeon/game/components/room_component.dart';
import 'package:rebirth_dungeon/game/effects/damage_number.dart';
import 'package:rebirth_dungeon/game/effects/pixel_effects.dart';
import 'package:rebirth_dungeon/game/game_constants.dart';

/// Where combat monsters stand around the room center, by slot.
final List<Vector2> _formationOffsets = [
  Vector2(24, -12),
  Vector2(-24, -12),
  Vector2(0, 20),
  Vector2(30, 16),
  Vector2(-30, 16),
];

/// The world: rooms, doorways, props, the hero, and combat monsters.
///
/// Structure is *synced* from application state ([rebuild]); transient
/// juice (moves, lunges, numbers, bursts) arrives exclusively through the
/// event bridge. Components own their positions and animation timers —
/// Riverpod never stores visual state.
class DungeonWorld extends World {
  DungeonWorld(this._run);

  DungeonRunState _run;

  final Map<int, RoomComponent> _rooms = {};
  final Map<String, MonsterComponent> _monsters = {};
  PlayerComponent? _player;
  String? _currentSignature;

  RunRoom get currentRoom => _run.rooms[_run.currentRoomIndex];

  PlayerComponent? get player => _player;

  Iterable<MonsterComponent> get monsters => _monsters.values;

  Vector2 centerOfRoom(int roomIndex) {
    final room = _run.rooms[roomIndex];
    final (cx, cy) = roomCenter(room);
    return Vector2(cx, cy);
  }

  /// Syncs the world with a new run snapshot. Only structural changes
  /// (floor, rooms, cleared flags, combat presence) trigger a rebuild —
  /// the hero position is event-driven so room-to-room moves animate.
  void rebuild(DungeonRunState run) {
    _run = run;
    final signature = _signatureOf(run);
    if (signature == _currentSignature) {
      _syncMonsterHp(run);
      return;
    }
    _currentSignature = signature;
    _rebuildAll(run);
  }

  static String _signatureOf(DungeonRunState run) {
    final rooms = run.rooms.map(
      (room) => '${room.index}:${room.kind}:${room.cleared}',
    );
    return '${run.runId}|${run.floorIndex}|${rooms.join(',')}|'
        '${run.combat != null}';
  }

  void _rebuildAll(DungeonRunState run) {
    _run = run;
    for (final child in children.toList()) {
      child.removeFromParent();
    }
    _rooms.clear();
    _monsters.clear();

    for (final room in run.rooms) {
      final component = RoomComponent(room: room);
      _rooms[room.index] = component;
      add(component);
    }

    // Doorways: one per pair, built from the lower index only.
    for (final room in run.rooms) {
      for (final door in room.doors) {
        if (door > room.index) {
          add(DoorwayComponent.between(a: room, b: run.rooms[door]));
        }
      }
    }

    // The hero: placed on full rebuilds; room-to-room moves are
    // event-driven so they can animate.
    _player = PlayerComponent(position: centerOfRoom(run.currentRoomIndex));
    add(_player!);

    _spawnMonsters(run);
  }

  void _spawnMonsters(DungeonRunState run) {
    final combat = run.combat;
    if (combat == null) {
      return;
    }
    final center = centerOfRoom(run.currentRoomIndex);
    final roomIsBoss = run.rooms[run.currentRoomIndex].kind == RoomKind.boss;
    var slot = 0;
    for (final enemy in combat.enemies) {
      if (enemy.hp <= 0) {
        continue;
      }
      final component = MonsterComponent(
        monsterId: enemy.id,
        contentId: enemy.contentId,
        position: center + _formationOffsets[slot % _formationOffsets.length],
        isBoss: roomIsBoss,
        hp: enemy.hp,
        maxHp: enemy.maxHp,
      );
      _monsters[enemy.id] = component;
      add(component);
      slot++;
    }
  }

  void _syncMonsterHp(DungeonRunState run) {
    final combat = run.combat;
    if (combat == null) {
      return;
    }
    for (final component in _monsters.values) {
      if (component.dying) {
        continue;
      }
      final enemy = combat.enemies
          .where((enemy) => enemy.id == component.monsterId)
          .firstOrNull;
      if (enemy != null) {
        component.updateHp(enemy.hp);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Presentation event handlers (invoked by DungeonGame)
  // ---------------------------------------------------------------------------

  void movePlayerTo(int roomIndex) {
    _player?.moveTo(centerOfRoom(roomIndex));
  }

  /// World position of a combatant, or null when unknown ('player' and the
  /// hero's content id both resolve to the hero component).
  Vector2? positionOf(String id) {
    if (id == 'player' || id == _run.heroId) {
      return _player?.position;
    }
    return _monsters[id]?.position;
  }

  void playAttack(String actorId, String targetId) {
    final targetPosition = positionOf(targetId);
    if (targetPosition == null) {
      return;
    }
    if (actorId == 'player' || actorId == _run.heroId) {
      _player?.lungeToward(targetPosition);
      return;
    }
    if (targetId == 'player' || targetId == _run.heroId) {
      _monsters[actorId]?.wiggle();
      return;
    }
    _monsters[actorId]?.lunge(targetPosition);
  }

  void spawnDamageNumber(String targetId, int amount, DamageSource source) {
    final position = positionOf(targetId);
    if (position == null || amount <= 0) {
      return;
    }
    final color = switch (source) {
      DamageSource.attack => Colors.red.shade300,
      DamageSource.poison => Colors.purple.shade300,
    };
    add(
      DamageNumber(
        position: position + Vector2(0, -12),
        text: '$amount',
        color: color,
      ),
    );
  }

  void playCritical(String targetId) {
    _monsters[targetId]?.flash();
    add(
      BurstEffect(
        position: positionOf(targetId) ?? Vector2.zero(),
        color: Colors.amber.shade200,
      ),
    );
  }

  void playShieldBlock(String targetId, int amount) {
    final position = positionOf(targetId);
    if (position == null) {
      return;
    }
    add(
      DamageNumber(
        position: position + Vector2(0, -20),
        text: '+$amount',
        color: Colors.blueGrey.shade200,
      ),
    );
  }

  void playHeal(String targetId, int amount) {
    final position = positionOf(targetId);
    if (position == null || amount <= 0) {
      return;
    }
    add(
      BurstEffect(
        position: position,
        color: Colors.green.shade300,
        particleCount: 8,
      ),
    );
    add(
      DamageNumber(
        position: position + Vector2(0, -14),
        text: '+$amount',
        color: Colors.green.shade300,
      ),
    );
  }

  void playShieldGained(String targetId) {
    final position = positionOf(targetId);
    if (position == null) {
      return;
    }
    add(BurstEffect(position: position, color: Colors.blueGrey.shade200));
  }

  void playStatus(String targetId, String statusId) {
    final position = positionOf(targetId);
    if (position == null) {
      return;
    }
    add(
      BurstEffect(
        position: position,
        color: Colors.purple.shade300,
        particleCount: 6,
      ),
    );
  }

  void killMonster(String monsterId) => _monsters[monsterId]?.playDeath();

  void playLoot(int roomIndex) {
    final room = _rooms[roomIndex];
    if (room == null) {
      return;
    }
    add(
      BurstEffect(
        position: room.position + room.size / 2,
        color: Colors.amber.shade300,
      ),
    );
  }
}
