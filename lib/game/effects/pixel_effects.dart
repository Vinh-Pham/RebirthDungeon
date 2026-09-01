import 'dart:math';

import 'package:flame/components.dart';
import 'package:flutter/material.dart';

/// Camera shake driven by presentation events only. Jitters the viewfinder
/// around a base position with decaying strength; purely cosmetic.
class ScreenShakeEffect extends Component {
  ScreenShakeEffect({
    required this.applyOffset,
    required this.intensity,
    this.duration = 0.3,
  });

  final void Function(Vector2) applyOffset;
  final double intensity;
  final double duration;

  final Random _random = Random();
  double _remaining = 0.3;

  @override
  void update(double dt) {
    _remaining -= dt;
    if (_remaining <= 0) {
      applyOffset(Vector2.zero());
      removeFromParent();
      return;
    }
    final strength = intensity * (_remaining / duration);
    applyOffset(
      Vector2(
        (_random.nextDouble() - 0.5) * 2 * strength,
        (_random.nextDouble() - 0.5) * 2 * strength,
      ),
    );
  }
}

/// A short burst of pixel sparks at a world position (hits, heals, loot).
class BurstEffect extends PositionComponent {
  BurstEffect({
    required Vector2 position,
    required this.color,
    this.particleCount = 10,
    this.speed = 40,
    this.lifetime = 0.45,
  }) : super(position: position, priority: 15);

  final Color color;
  final int particleCount;
  final double speed;
  final double lifetime;

  late final List<(double, double)> _velocities = [
    for (var i = 0; i < particleCount; i++)
      () {
        final angle = (i / particleCount) * 2 * pi;
        return (cos(angle) * speed, sin(angle) * speed);
      }(),
  ];

  double _age = 0;

  @override
  void update(double dt) {
    _age += dt;
    if (_age >= lifetime) {
      removeFromParent();
    }
  }

  @override
  void render(Canvas canvas) {
    final t = (_age / lifetime).clamp(0.0, 1.0);
    final opacity = 1 - t;
    final paint = Paint()..color = color.withValues(alpha: opacity);
    for (final (vx, vy) in _velocities) {
      final d = t * lifetime;
      final x = vx * d + speed * d * d;
      final y = vy * d + speed * d * d;
      canvas.drawRect(
        Rect.fromCenter(center: Offset(x, y), width: 3, height: 3),
        paint,
      );
    }
  }
}
