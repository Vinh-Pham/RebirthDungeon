import 'package:flame/components.dart';
import 'package:flutter/material.dart';

import 'package:rebirth_dungeon/domain/dungeon/run_room.dart';
import 'package:rebirth_dungeon/game/game_constants.dart';

/// Floor tint per room kind (placeholder palette until the sprite atlases
/// of Phase 11).
Color floorColor(RoomKind kind) => switch (kind) {
  RoomKind.entry => const Color(0xFF2E4A2E),
  RoomKind.combat => const Color(0xFF3A3A44),
  RoomKind.treasure => const Color(0xFF4A422A),
  RoomKind.event => const Color(0xFF3E2E4A),
  RoomKind.boss => const Color(0xFF4A2424),
};

/// Renders one room: a checkered tile floor, a dark wall frame, and — for
/// unresolved special rooms — a prop marker (chest, shrine). Cleared rooms
/// lose their props; the world rebuilds rooms when cleared flags change.
class RoomComponent extends PositionComponent {
  RoomComponent({required this.room})
    : super(
        position: Vector2(room.x * roomSpan, room.y * roomSpan),
        size: Vector2.all(roomSpan),
        priority: -10,
      );

  final RunRoom room;

  @override
  void render(Canvas canvas) {
    final base = floorColor(room.kind);

    // Checkerboard tiles.
    for (var ty = 0; ty < tilesPerRoom; ty++) {
      for (var tx = 0; tx < tilesPerRoom; tx++) {
        final even = (tx + ty) % 2 == 0;
        canvas.drawRect(
          Rect.fromLTWH(tx * tileSize, ty * tileSize, tileSize, tileSize),
          Paint()..color = even ? base : base.withValues(alpha: 0.82),
        );
      }
    }

    // Walls: dark frame around the floor.
    final wall = Paint()..color = const Color(0xFF141018);
    const wallThickness = 3.0;
    canvas.drawRect(Rect.fromLTWH(0, 0, size.x, wallThickness), wall);
    canvas.drawRect(
      Rect.fromLTWH(0, size.y - wallThickness, size.x, wallThickness),
      wall,
    );
    canvas.drawRect(Rect.fromLTWH(0, 0, wallThickness, size.y), wall);
    canvas.drawRect(
      Rect.fromLTWH(size.x - wallThickness, 0, wallThickness, size.y),
      wall,
    );

    // Prop markers for unresolved rooms.
    if (!room.cleared && room.kind == RoomKind.treasure) {
      _drawChest(canvas);
    }
    if (!room.cleared && room.kind == RoomKind.event) {
      _drawShrine(canvas);
    }
    if (room.kind == RoomKind.boss) {
      canvas.drawRect(
        Rect.fromLTWH(4, 4, size.x - 8, size.y - 8),
        Paint()
          ..style = PaintingStyle.stroke
          ..strokeWidth = 1
          ..color = const Color(0xFFB03A3A),
      );
    }
  }

  void _drawChest(Canvas canvas) {
    const propSize = tileSize - 4;
    final center = Offset(size.x / 2, size.y / 2);
    final paint = Paint()..color = const Color(0xFFE8C34A);
    canvas.drawRect(
      Rect.fromCenter(center: center, width: propSize, height: propSize - 4),
      paint,
    );
    canvas.drawRect(
      Rect.fromCenter(
        center: center.translate(0, -3),
        width: propSize,
        height: 3,
      ),
      paint,
    );
  }

  void _drawShrine(Canvas canvas) {
    const propSize = tileSize - 4;
    final center = Offset(size.x / 2, size.y / 2);
    canvas.drawCircle(
      center,
      propSize / 2,
      Paint()..color = const Color(0xFFB478E8),
    );
    canvas.drawCircle(
      center,
      propSize / 2 - 3,
      Paint()..color = const Color(0xFFB478E8).withValues(alpha: 0.4),
    );
  }
}
