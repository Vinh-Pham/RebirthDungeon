import 'package:flame/components.dart';
import 'package:flame/effects.dart';
import 'package:flutter/material.dart';

import 'package:rebirth_dungeon/game/game_constants.dart';

/// One enemy in the world. Placeholder rendering with a tiny HP bar. Death
/// fades and hit flashes are presentation-only — the run state already
/// decided the outcome.
class MonsterComponent extends PositionComponent {
  MonsterComponent({
    required this.monsterId,
    required this.contentId,
    required Vector2 position,
    this.isBoss = false,
    required this.hp,
    required this.maxHp,
  }) : _home = position.clone(),
       super(
         position: position,
         size: Vector2.all(isBoss ? tileSize * 1.5 : tileSize),
         priority: 4,
       );

  final String monsterId;
  final String contentId;
  final bool isBoss;

  final Vector2 _home;
  int hp;
  final int maxHp;
  bool _dying = false;
  double _fade = 1;
  double _flashSeconds = 0;

  bool get dying => _dying;

  @override
  void update(double dt) {
    if (_dying) {
      _fade -= dt / 0.5;
      if (_fade <= 0) {
        removeFromParent();
      }
      return;
    }
    if (_flashSeconds > 0) {
      _flashSeconds -= dt;
    }
  }

  @override
  void render(Canvas canvas) {
    final body = isBoss ? const Color(0xFF9B3AB0) : const Color(0xFFD85858);
    final dark = isBoss ? const Color(0xFF4E1E5C) : const Color(0xFF7A2626);
    final opacity = _fade.clamp(0.0, 1.0);

    canvas.drawRect(
      size.toRect(),
      Paint()..color = dark.withValues(alpha: opacity),
    );
    canvas.drawRect(
      Rect.fromLTWH(2, 2, size.x - 4, size.y - 4),
      Paint()..color = body.withValues(alpha: opacity),
    );
    final eye = Paint()
      ..color = const Color(0xFF101014).withValues(alpha: opacity);
    canvas.drawRect(Rect.fromLTWH(3, 5, 3, 3), eye);
    canvas.drawRect(Rect.fromLTWH(size.x - 6, 5, 3, 3), eye);

    if (_flashSeconds > 0) {
      canvas.drawRect(
        size.toRect(),
        Paint()..color = Colors.white.withValues(alpha: opacity * 0.8),
      );
    }

    if (maxHp > 0) {
      final barWidth = size.x;
      canvas.drawRect(
        Rect.fromLTWH(0, -4, barWidth, 2),
        Paint()..color = const Color(0xFF141018).withValues(alpha: opacity),
      );
      canvas.drawRect(
        Rect.fromLTWH(0, -4, barWidth * (hp / maxHp).clamp(0.0, 1.0), 2),
        Paint()..color = const Color(0xFFE05050).withValues(alpha: opacity),
      );
    }
  }

  /// Updates the HP bar (presentation sync — never decides outcomes).
  void updateHp(int hp) => this.hp = hp;

  /// Plays the death fade, then removes itself from the world.
  void playDeath() => _dying = true;

  /// White hit flash.
  void flash() => _flashSeconds = 0.1;

  /// Lunge toward [target] and back home.
  void lunge(Vector2 target) {
    final direction = (target - position).normalized();
    final mid = position + direction * (tileSize * 0.6);
    add(
      SequenceEffect([
        MoveEffect.to(
          mid,
          EffectController(duration: 0.09, curve: Curves.easeOut),
        ),
        MoveEffect.to(
          _home.clone(),
          EffectController(duration: 0.14, curve: Curves.easeIn),
        ),
      ]),
    );
  }

  /// Wiggle in place (used when this monster attacks the player).
  void wiggle() {
    add(
      SequenceEffect([
        MoveEffect.by(Vector2(3, 0), EffectController(duration: 0.07)),
        MoveEffect.by(Vector2(-3, 0), EffectController(duration: 0.12)),
      ]),
    );
  }
}
