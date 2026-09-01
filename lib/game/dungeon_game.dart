import 'dart:async';

import 'package:flame/components.dart';
import 'package:flame/game.dart';

import 'package:rebirth_dungeon/domain/dungeon/dungeon_run_state.dart';
import 'package:rebirth_dungeon/domain/dungeon/run_event.dart';
import 'package:rebirth_dungeon/game/bridge/event_bridge.dart';
import 'package:rebirth_dungeon/game/bridge/presentation_event.dart';
import 'package:rebirth_dungeon/game/dungeon_world.dart';
import 'package:rebirth_dungeon/game/effects/pixel_effects.dart';
import 'package:rebirth_dungeon/game/game_constants.dart';

/// The Flame game for one dungeon run: fixed-resolution pixel camera, the
/// world synced from application state, and domain events translated into
/// presentation through the [EventBridge].
///
/// This class renders. It never decides anything: no RNG, no rules, no
/// writes back into application state. Rebuilding or replaying the
/// presentation therefore cannot change gameplay results.
class DungeonGame extends FlameGame {
  DungeonGame({
    required this.runEvents,
    required DungeonRunState initialRun,
    this.bridge = const EventBridge(),
  }) : _latestRun = initialRun,
       super(world: DungeonWorld(initialRun));

  /// The world with the concrete type (FlameGame.world stays `World`).
  DungeonWorld get dungeonWorld => world as DungeonWorld;

  final Stream<RunEvent> runEvents;
  final EventBridge bridge;

  StreamSubscription<RunEvent>? _subscription;
  Vector2? _cameraBase;
  DungeonRunState _latestRun;

  @override
  Future<void> onLoad() async {
    camera = CameraComponent.withFixedResolution(
      world: world,
      width: cameraWidth,
      height: cameraHeight,
    );
    camera.viewfinder.anchor = Anchor.center;
    await add(camera);
    dungeonWorld.rebuild(_latestRun);
    _snapCameraToHero();
    _subscription = runEvents.listen(_onDomainEvent);
  }

  @override
  void onRemove() {
    _subscription?.cancel();
    super.onRemove();
  }

  /// Authoritative structural sync from the application layer.
  void syncRun(DungeonRunState run) {
    _latestRun = run;
    dungeonWorld.rebuild(run);
    _snapCameraToHero();
  }

  void _snapCameraToHero() {
    _cameraBase =
        dungeonWorld.player?.position.clone() ??
        dungeonWorld.centerOfRoom(_latestRun.currentRoomIndex);
    camera.viewfinder.position = _cameraBase!.clone();
  }

  void _onDomainEvent(RunEvent event) {
    for (final presentation in bridge.translate(event)) {
      _apply(presentation);
    }
  }

  void _apply(PresentationEvent event) {
    final world = dungeonWorld;
    switch (event) {
      case PlayerMoved(:final roomIndex):
        world.movePlayerTo(roomIndex);
        _cameraBase = world.centerOfRoom(roomIndex);
        camera.viewfinder.position = _cameraBase!.clone();
      case AttackLunge(:final actorId, :final targetId):
        world.playAttack(actorId, targetId);
      case DamageNumber(:final targetId, :final amount, :final source):
        world.spawnDamageNumber(targetId, amount, source);
      case CriticalHitFx(:final targetId):
        world.playCritical(targetId);
      case ShieldBlockFx(:final targetId, :final amount):
        world.playShieldBlock(targetId, amount);
      case HealFx(:final targetId, :final amount):
        world.playHeal(targetId, amount);
      case ShieldGainedFx(:final targetId):
        world.playShieldGained(targetId);
      case StatusFx(:final targetId, :final statusId):
        world.playStatus(targetId, statusId);
      case MonsterDied(:final monsterId):
        world.killMonster(monsterId);
      case ScreenShake(:final intensity):
        _shake(intensity);
      case FloorChanged():
        dungeonWorld.rebuild(_latestRun);
        _snapCameraToHero();
        _cameraBase = world.player?.position.clone() ?? _cameraBase;
      case LootSparkle(:final roomIndex):
        world.playLoot(roomIndex);
    }
  }

  void _shake(double intensity) {
    final base = _cameraBase ?? camera.viewfinder.position.clone();
    add(
      ScreenShakeEffect(
        applyOffset: (offset) {
          camera.viewfinder.position = base + offset;
        },
        intensity: intensity,
      ),
    );
  }
}
