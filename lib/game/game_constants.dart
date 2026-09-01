import 'package:rebirth_dungeon/domain/dungeon/run_room.dart';

/// Pixel-art world constants (dart-game-plan.md section 11): a consistent
/// tile size, integer-aligned room grid, and a fixed logical camera
/// resolution. All world positions are whole pixel multiples.
const double tileSize = 16;
const int tilesPerRoom = 8;

/// World-space size of one room (square).
const double roomSpan = tileSize * tilesPerRoom;

/// Logical camera resolution; the camera scales this to the screen.
const double cameraWidth = 360;
const double cameraHeight = 640;

/// World center of the room at grid cell (x, y). Rooms sit edge to edge,
/// `roomSpan` apart, so centers stay on integer pixels.
(double, double) roomCenter(RunRoom room) {
  return (room.x * roomSpan + roomSpan / 2, room.y * roomSpan + roomSpan / 2);
}
