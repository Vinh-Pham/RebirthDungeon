import { useEffect, useRef } from "react";
import type { MapView } from "../game/core/session";
import { BUSH, CLOSED_DUNGEON_GATE, DIRT_PATH, GRASS, WATER, key } from "../game/world/world";

const cellSize = 4;
const terrainColors: Record<number, string> = {
  1: "#788a87",
  [WATER]: "#508da0",
  [GRASS]: "#a9b2a2",
  [BUSH]: "#576069",
  [DIRT_PATH]: "#997f73",
};

export function WorldMinimap({ view, location }: { view: MapView; location: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { map, position, visible, explored } = view;
  const size = (Math.max(map.width, map.height) + 4) * cellSize;

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const known = explored && new Set(explored);
    const offsetX = (size - map.width * cellSize) / 2;
    const offsetY = (size - map.height * cellSize) / 2;

    ctx.clearRect(0, 0, size, size);
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        const cell = key(x, y);
        const inSight = visible ? visible.has(cell) : !known;
        if (!inSight && !known?.has(cell)) continue;
        const kind = map.tiles[y * map.width + x];
        ctx.fillStyle = inSight ? (terrainColors[kind] ?? "#407080") : kind === 1 ? "#344a5a" : "#28353e";
        ctx.fillRect(offsetX + x * cellSize, offsetY + y * cellSize, cellSize, cellSize);
      }
    }
    const closedGates = (map.gates ?? []).filter(({ x, y }) => map.tiles[y * map.width + x] === CLOSED_DUNGEON_GATE);
    for (const marker of [...map.landmarks, ...(map.doors ?? []), ...closedGates]) {
      const cell = key(marker.x, marker.y);
      if (visible && !visible.has(cell) && !known?.has(cell)) continue;
      ctx.fillStyle = "id" in marker && marker.id !== "gate" ? "#b0a987" : "#5bbfc5";
      ctx.fillRect(offsetX + marker.x * cellSize, offsetY + marker.y * cellSize, cellSize, cellSize);
    }

    const x = offsetX + position.x * cellSize;
    const y = offsetY + position.y * cellSize;
    ctx.fillStyle = "#28353e";
    ctx.fillRect(x - 2, y - 2, cellSize + 4, cellSize + 4);
    ctx.fillStyle = "#f2ec8b";
    ctx.fillRect(x - 1, y - 1, cellSize + 2, cellSize + 2);
  }, [map, position, visible, explored, size]);

  return (
    <canvas
      ref={canvasRef}
      className="world-minimap"
      width={size}
      height={size}
      role="img"
      aria-label={`Minimap of ${location}`}
    />
  );
}
