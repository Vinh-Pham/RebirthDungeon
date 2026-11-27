import { useEffect, useRef } from "react";
import { townNpcSprite } from "../game/content/town-npcs";
import type { MapView } from "../game/core/session";
import { BUSH, CLOSED_DUNGEON_GATE, DIRT_PATH, GRASS, WATER, key, type Point } from "../game/world/world";

const cellSize = 4;
const npcMarkerSize = 8;
const npcMarkerColor = "#83b9ff";
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
  const size = map.height * cellSize;

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const known = explored && new Set(explored);
    const mapWidth = map.width * cellSize;
    const playerCenterX = (position.x + 0.5) * cellSize;
    const offsetX =
      mapWidth <= size ? (size - mapWidth) / 2 : -Math.max(0, Math.min(mapWidth - size, playerCenterX - size / 2));
    const startX = Math.max(0, Math.floor(-offsetX / cellSize));
    const endX = Math.min(map.width, Math.ceil((size - offsetX) / cellSize));

    ctx.clearRect(0, 0, size, size);
    for (let y = 0; y < map.height; y++) {
      for (let x = startX; x < endX; x++) {
        const cell = key(x, y);
        const inSight = visible ? visible.has(cell) : !known;
        if (!inSight && !known?.has(cell)) continue;
        const kind = map.tiles[y * map.width + x];
        ctx.fillStyle = inSight ? (terrainColors[kind] ?? "#407080") : kind === 1 ? "#344a5a" : "#28353e";
        ctx.fillRect(offsetX + x * cellSize, y * cellSize, cellSize, cellSize);
      }
    }
    const closedGates = (map.gates ?? []).filter(({ x, y }) => map.tiles[y * map.width + x] === CLOSED_DUNGEON_GATE);
    const npcMarkers: Point[] = [];
    for (const marker of [...map.landmarks, ...(map.doors ?? []), ...closedGates]) {
      const cell = key(marker.x, marker.y);
      if (visible && !visible.has(cell) && !known?.has(cell)) continue;
      if ("id" in marker && townNpcSprite(map.id, marker.id)) {
        npcMarkers.push(marker);
        continue;
      }
      ctx.fillStyle = "id" in marker && marker.id !== "gate" ? "#b0a987" : "#5bbfc5";
      ctx.fillRect(offsetX + marker.x * cellSize, marker.y * cellSize, cellSize, cellSize);
    }
    const npcInset = (cellSize - npcMarkerSize) / 2;
    ctx.fillStyle = npcMarkerColor;
    for (const { x, y } of npcMarkers) {
      ctx.fillRect(offsetX + x * cellSize + npcInset, y * cellSize + npcInset, npcMarkerSize, npcMarkerSize);
    }

    const x = offsetX + position.x * cellSize;
    const y = position.y * cellSize;
    ctx.fillStyle = "#28353e";
    ctx.fillRect(x - 2, y - 2, cellSize + 4, cellSize + 4);
    ctx.fillStyle = "#f2ec8b";
    ctx.fillRect(x - 1, y - 1, cellSize + 2, cellSize + 2);
  }, [map, position, visible, explored, size]);

  return (
    <canvas
      ref={canvasRef}
      className="world-minimap pointer-events-none absolute top-3 right-3 z-1 aspect-square h-auto w-[var(--minimap-size)] border border-[#3b5556] bg-black/35 [image-rendering:pixelated] max-[360px]:right-2"
      width={size}
      height={size}
      role="img"
      aria-label={`Minimap of ${location}`}
    />
  );
}
