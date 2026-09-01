import 'dart:math';

import 'package:flame/components.dart';
import 'package:flutter/material.dart';

/// Floating number above a target: damage (red), heal (green), or shield
/// block (blue). Rises and fades, then removes itself. Presentation only.
class DamageNumber extends PositionComponent {
  DamageNumber({
    required Vector2 position,
    required String text,
    required this.color,
    bool critical = false,
  }) : _text = (critical ? '★' : '') + text,
       _critical = critical,
       super(
         position: position,
         size: Vector2(48, 16),
         priority: 20,
         anchor: Anchor.center,
       );

  final String _text;
  final Color color;
  final bool _critical;

  final Random _jitter = Random();
  double _age = 0;
  late final double _drift = (_jitter.nextDouble() - 0.5) * 12;

  static const _lifetime = 0.9;

  @override
  void update(double dt) {
    _age += dt;
    if (_age >= _lifetime) {
      removeFromParent();
    }
  }

  @override
  void render(Canvas canvas) {
    final t = (_age / _lifetime).clamp(0.0, 1.0);
    final opacity = 1 - t;
    final rise = -14 * t;
    final style = TextStyle(
      color: color.withValues(alpha: opacity),
      fontSize: _critical ? 14 : 11,
      fontWeight: _critical ? FontWeight.w900 : FontWeight.w700,
    );
    final painter = TextPainter(
      text: TextSpan(text: _text, style: style),
      textDirection: TextDirection.ltr,
    )..layout();
    painter.paint(
      canvas,
      Offset(-painter.width / 2 + _drift * t, rise - painter.height / 2),
    );
  }
}
