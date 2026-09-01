import 'dart:math';

import 'package:flame/components.dart';
import 'package:flutter/material.dart';

import 'package:rebirth_dungeon/domain/dungeon/run_room.dart';
import 'package:rebirth_dungeon/game/game_constants.dart';

/// A doorway tile bridging two grid-adjacent rooms, centered on their
/// shared wall.
class DoorwayComponent extends PositionComponent {
  DoorwayComponent.between({required RunRoom a, required RunRoom b})
    : super(
        position: _positionBetween(a, b),
        size: Vector2.all(tileSize),
        priority: -9,
      );

  static Vector2 _positionBetween(RunRoom a, RunRoom b) {
    final horizontal = a.y == b.y;
    if (horizontal) {
      final edgeX = max(a.x, b.x) * roomSpan;
      final top = min(a.y, b.y) * roomSpan + roomSpan / 2 - tileSize / 2;
      return Vector2(edgeX - tileSize / 2, top);
    }
    final edgeY = max(a.y, b.y) * roomSpan;
    final left = min(a.x, b.x) * roomSpan + roomSpan / 2 - tileSize / 2;
    return Vector2(left, edgeY - tileSize / 2);
  }

  @override
  void render(Canvas canvas) {
    canvas.drawRect(size.toRect(), Paint()..color = const Color(0xFF544A3A));
  }
}
