import 'package:flame/components.dart';
import 'package:flame/effects.dart';
import 'package:flutter/material.dart';

import 'package:rebirth_dungeon/game/game_constants.dart';

/// The hero. Placeholder rendering until Phase 11 brings sprite atlases;
/// position and animation timers live here, never in Riverpod.
class PlayerComponent extends PositionComponent {
  PlayerComponent({required Vector2 position})
    : super(position: position, size: Vector2.all(tileSize), priority: 5);

  static final _paint = Paint()..color = const Color(0xFF5AC8E8);
  static final _paintDark = Paint()..color = const Color(0xFF2A7A96);

  @override
  void render(Canvas canvas) {
    canvas.drawRect(size.toRect(), _paintDark);
    canvas.drawRect(Rect.fromLTWH(2, 2, size.x - 4, size.y - 4), _paint);
    // A little visor stripe so the hero reads as a character.
    canvas.drawRect(
      Rect.fromLTWH(4, 5, size.x - 8, 3),
      Paint()..color = const Color(0xFFE8F4FA),
    );
  }

  void snapTo(Vector2 target) {
    position = target.clone();
  }

  /// Attack lunge: dart toward [target] and return to the starting spot.
  void lungeToward(Vector2 target) {
    final start = position.clone();
    final direction = (target - position).normalized();
    final mid = position + direction * (tileSize * 0.7);
    add(
      SequenceEffect([
        MoveEffect.to(
          mid,
          EffectController(duration: 0.08, curve: Curves.easeOut),
        ),
        MoveEffect.to(
          start,
          EffectController(duration: 0.12, curve: Curves.easeIn),
        ),
      ]),
    );
  }

  void moveTo(Vector2 target) {
    final travel = (position - target).length / (roomSpan * 3);
    final duration = travel.clamp(0.12, 0.4);
    position = position.clone();
    add(
      MoveEffect.to(
        target,
        EffectController(duration: duration, curve: Curves.easeOut),
      ),
    );
  }
}
