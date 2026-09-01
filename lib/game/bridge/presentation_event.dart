import 'package:rebirth_dungeon/domain/combat/combat_event.dart';

/// Presentation-oriented events consumed by the Flame layer
/// (dart-game-plan.md section 8). Produced by `EventBridge` from domain
/// events; they carry exactly what a visual needs and nothing about rules.
///
/// Subclasses declare their fields in [props] to get structural equality.
sealed class PresentationEvent {
  const PresentationEvent();

  /// Fields that identify this event for equality checks.
  List<Object?> get props => const [];

  @override
  bool operator ==(Object other) =>
      other.runtimeType == runtimeType &&
      other is PresentationEvent &&
      _listEquals(other.props, props);

  @override
  int get hashCode => Object.hashAll(props);

  static bool _listEquals(List<Object?> a, List<Object?> b) {
    if (a.length != b.length) {
      return false;
    }
    for (var i = 0; i < a.length; i++) {
      if (a[i] != b[i]) {
        return false;
      }
    }
    return true;
  }
}

class PlayerMoved extends PresentationEvent {
  const PlayerMoved(this.roomIndex);

  final int roomIndex;

  @override
  List<Object?> get props => [roomIndex];
}

class AttackLunge extends PresentationEvent {
  const AttackLunge(this.actorId, this.targetId);

  final String actorId;
  final String targetId;

  @override
  List<Object?> get props => [actorId, targetId];
}

class DamageNumber extends PresentationEvent {
  const DamageNumber({
    required this.targetId,
    required this.amount,
    required this.source,
  });

  final String targetId;
  final int amount;
  final DamageSource source;

  @override
  List<Object?> get props => [targetId, amount, source];
}

class CriticalHitFx extends PresentationEvent {
  const CriticalHitFx(this.targetId);

  final String targetId;

  @override
  List<Object?> get props => [targetId];
}

class ShieldBlockFx extends PresentationEvent {
  const ShieldBlockFx(this.targetId, this.amount);

  final String targetId;
  final int amount;

  @override
  List<Object?> get props => [targetId, amount];
}

class HealFx extends PresentationEvent {
  const HealFx(this.targetId, this.amount);

  final String targetId;
  final int amount;

  @override
  List<Object?> get props => [targetId, amount];
}

class ShieldGainedFx extends PresentationEvent {
  const ShieldGainedFx(this.targetId);

  final String targetId;

  @override
  List<Object?> get props => [targetId];
}

class StatusFx extends PresentationEvent {
  const StatusFx(this.targetId, this.statusId);

  final String targetId;
  final String statusId;

  @override
  List<Object?> get props => [targetId, statusId];
}

class MonsterDied extends PresentationEvent {
  const MonsterDied(this.monsterId);

  final String monsterId;

  @override
  List<Object?> get props => [monsterId];
}

class ScreenShake extends PresentationEvent {
  const ScreenShake(this.intensity);

  final double intensity;

  @override
  List<Object?> get props => [intensity];
}

class FloorChanged extends PresentationEvent {
  const FloorChanged();
}

class LootSparkle extends PresentationEvent {
  const LootSparkle(this.roomIndex);

  final int roomIndex;

  @override
  List<Object?> get props => [roomIndex];
}
