import { Application, useApplication } from "@pixi/react";
import { Assets, Container, Sprite, Spritesheet, Texture } from "pixi.js";
import { CompositeTilemap } from "@pixi/tilemap";
import { Viewport } from "pixi-viewport";
import { gsap } from "gsap";
import { eyes, hairs, outfits, skins } from "../game/content/appearance";
import type { CharacterForm, GameView } from "../app/contracts";
import { dungeonEnemies, isWolfKind } from "../game/content/enemies";
import { townNpcSprite } from "../game/content/town-npcs";
import {
  BUSH,
  CLOSED_DUNGEON_GATE,
  DIRT_PATH,
  DUNGEON_FLOOR_GENERATOR,
  GRASS,
  WATER,
  type TownResident,
} from "../game/world/world";
import { useEffect, useRef, useState, type RefObject } from "react";
import { CombatMarkers } from "./CombatMarkers";

export interface MapPoint {
  x: number;
  y: number;
}
export interface RenderMap {
  id: string;
  generator?: string;
  gates?: Array<MapPoint & { room: number }>;
  width: number;
  height: number;
  tiles: number[];
  landmarks?: Array<MapPoint & { id?: string; name?: string }>;
  doors?: MapPoint[];
  enemies?: Array<MapPoint & { id?: string; sprite?: string; alive?: boolean; room?: number }>;
}
export interface WorldCanvasProps {
  map: RenderMap;
  townResidents: readonly TownResident[];
  player: MapPoint;
  appearance?: CharacterForm;
  visible?: ReadonlySet<string>;
  explored?: Iterable<string>;
  lighting?: ReadonlyMap<string, number[]>;
  reducedMotion?: boolean;
  combatCue?: { id: string; outcome: "hit" | "victory" };
  encounter?: GameView["encounter"];
  onTravel: (point: MapPoint) => void;
  onTarget: (id: string) => void;
}
const CELL = 24;

function terrainTexture(kind: number): Texture {
  const canvas = document.createElement("canvas");
  canvas.width = CELL;
  canvas.height = CELL;
  const context = canvas.getContext("2d")!;
  context.fillStyle = ["#172d34", "#344a5a", "#193b3b", "#293c43"][kind] ?? "#172d34";
  context.fillRect(0, 0, CELL, CELL);
  context.fillStyle = kind === 2 ? "#4d7664" : "#48616a";
  if (kind === 3) {
    context.fillRect(0, 23, 24, 1);
    context.fillRect(23, 0, 1, 24);
    context.fillRect(11, 11, 2, 2);
  } else if (kind !== 1) {
    context.fillRect(11, 11, 2, 2);
    if (kind === 2) context.fillRect(14, 8, 1, 4);
  }
  const texture = Texture.from(canvas);
  texture.source.scaleMode = "nearest";
  return texture;
}

function Scene({
  map,
  townResidents,
  player,
  appearance,
  visible,
  explored,
  lighting,
  reducedMotion,
  combatCue,
  encounter,
  onTravel,
  onTarget,
  onViewport,
  actor,
  resizeTarget,
}: WorldCanvasProps & {
  onViewport: (viewport: Viewport | null) => void;
  actor: RefObject<Container | null>;
  resizeTarget: HTMLElement;
}) {
  const { app, isInitialised } = useApplication();
  const continuous = map.generator === DUNGEON_FLOOR_GENERATOR;
  const camera = useRef<Viewport | null>(null);
  const terrain = useRef<Container | null>(null);
  const residentLayer = useRef<Container | null>(null);
  const residentSprites = useRef<Map<string, Sprite>>(null);
  const textures = useRef<Texture[] | null>(null);
  const input = useRef({ onTravel, onTarget, encounter, visible });
  input.current = { onTravel, onTarget, encounter, visible };
  const livingEnemyIds = encounter?.enemies.map(({ id }) => id).join(",");
  const enemyRoom = encounter?.enemyRoom;
  const enemyId = encounter?.enemyId;
  const [sheet, setSheet] = useState<Spritesheet | null>(null);
  useEffect(() => {
    let active = true;
    Assets.load<Spritesheet>(`${import.meta.env.BASE_URL}assets/game-atlas.json`)
      .then((value) => {
        for (const texture of Object.values(value.textures)) texture.source.scaleMode = "nearest";
        if (active) setSheet(value);
      })
      .catch((error) => console.error("Game atlas failed to load", error));
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    const { ticker, renderer } = app;
    if (!isInitialised || !ticker || !renderer) return;
    ticker.maxFPS = 30;
    ticker.minFPS = 10;
    const viewport = new Viewport({
      screenWidth: app.screen.width,
      screenHeight: app.screen.height,
      worldWidth: map.width * CELL,
      worldHeight: map.height * CELL,
      events: renderer.events,
    });
    camera.current = viewport;
    onViewport(viewport);
    app.stage.addChild(viewport);
    if (!continuous)
      viewport
        .drag({ mouseButtons: "middle-right" })
        .pinch()
        .wheel()
        .clampZoom({ minScale: 1, maxScale: 3 })
        .clamp({ direction: "all" });
    const layer = new Container();
    terrain.current = layer;
    viewport.addChild(layer);
    const residents = new Container({ eventMode: "none" });
    const sprites = new Map<string, Sprite>();
    residentLayer.current = residents;
    residentSprites.current = sprites;
    viewport.addChild(residents);
    const figure = new Container();
    figure.position.set(player.x * CELL, player.y * CELL);
    actor.current = figure;
    viewport.addChild(figure);
    const fitFloor = () => {
      const scale = Math.min(viewport.screenWidth / (map.width * CELL), viewport.screenHeight / (map.height * CELL));
      viewport.setZoom(scale, false);
      viewport.moveCenter((map.width * CELL) / 2, (map.height * CELL) / 2);
    };
    if (continuous) fitFloor();
    else viewport.moveCenter(player.x * CELL, player.y * CELL);
    viewport.on("clicked", (event) => {
      if ("button" in event.event && event.event.button === 2) return;
      const point = {
        x: Math.floor(event.world.x / CELL),
        y: Math.floor(event.world.y / CELL),
      };
      const { encounter, visible, onTarget, onTravel } = input.current;
      if (!encounter) {
        onTravel(point);
        return;
      }
      const enemy = encounter.enemies.find(({ position }) => position.x === point.x && position.y === point.y);
      if (enemy && (!visible || visible.has(`${point.x},${point.y}`))) onTarget(enemy.id);
    });
    const resize = () => {
      const center = viewport.center;
      const playerX = figure.x + CELL / 2;
      const playerY = figure.y + CELL / 2;
      const playerWasVisible = viewport.getVisibleBounds().contains(playerX, playerY);
      viewport.resize(app.screen.width, app.screen.height);
      if (continuous) {
        fitFloor();
        return;
      }
      viewport.moveCenter(center);
      if (playerWasVisible && !viewport.getVisibleBounds().contains(playerX, playerY)) {
        viewport.moveCenter(playerX, playerY);
      }
    };
    renderer.on("resize", resize);
    // The map can resize when the HUD reflows, even if the browser window stays the same size.
    const observer = new ResizeObserver(() => {
      const { clientWidth, clientHeight } = resizeTarget;
      if (clientWidth && clientHeight && (clientWidth !== app.screen.width || clientHeight !== app.screen.height)) {
        app.queueResize();
      }
    });
    observer.observe(resizeTarget);
    return () => {
      observer.disconnect();
      gsap.killTweensOf(figure.position);
      for (const sprite of sprites.values()) gsap.killTweensOf(sprite.position);
      residentLayer.current = null;
      residentSprites.current = null;
      renderer.off("resize", resize);
      if (!viewport.destroyed) viewport.destroy({ children: true });
      onViewport(null);
      actor.current = null;
      camera.current = null;
    };
  }, [actor, app, isInitialised, map.width, map.height, onViewport, resizeTarget, continuous]);
  useEffect(() => {
    const layer = terrain.current;
    if (!layer) return;
    layer.removeChildren().forEach((child) => child.destroy({ children: true }));
    const tiles = new CompositeTilemap();
    layer.addChild(tiles);
    const terrainTextures = (textures.current ??= [0, 1, 2, 3].map(terrainTexture));
    const authoredTerrain: Record<number, Texture | undefined> = {
      1: sheet?.textures.stone_wall,
      [WATER]: sheet?.textures.town_water,
      [GRASS]: sheet?.textures.town_grass,
      [BUSH]: sheet?.textures.town_bush,
      [DIRT_PATH]: sheet?.textures.town_dirt_path,
    };
    const seen = visible ? new Set(visible) : null;
    const known = explored ? new Set(explored) : null;
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        const key = `${x},${y}`;
        if (known && !known.has(key) && !seen?.has(key)) continue;
        const kind = map.tiles[y * map.width + x];
        const texture =
          authoredTerrain[kind] ?? terrainTextures[kind === CLOSED_DUNGEON_GATE ? 0 : kind] ?? terrainTextures[0];
        tiles.tile(texture, x * CELL, y * CELL, {
          tileWidth: CELL,
          tileHeight: CELL,
          alpha: seen && !seen.has(key) ? 0.25 : lighting ? 0.63 + (lighting.get(key)?.[1] ?? 0) / 560 : 1,
        });
      }
    }
    const art = (id: string, x: number, y: number) => {
      const texture = sheet?.textures[id];
      if (!texture) return;
      const sprite = new Sprite(texture);
      const light = lighting?.get(`${x},${y}`);
      if (light)
        sprite.tint =
          (Math.min(255, light[0] ?? 255) << 16) |
          (Math.min(255, light[1] ?? 255) << 8) |
          Math.min(255, light[2] ?? 255);
      sprite.position.set(x * CELL + 4, y * CELL);
      sprite.width = 16;
      sprite.height = 24;
      layer.addChild(sprite);
      return sprite;
    };
    for (const landmark of map.landmarks ?? []) {
      if (known && !known.has(`${landmark.x},${landmark.y}`) && !seen?.has(`${landmark.x},${landmark.y}`)) continue;
      const id = landmark.id;
      const ids: Record<string, string> = {
        gate: "town_atlas_9",
        tree: "town_tree",
        oven: "town_amenities_0",
        loom: "town_amenities_1",
        spinning_wheel: "town_amenities_2",
        windmill: "town_amenities_3",
        rack: "item_short_sword",
        practice: "town_amenities_2",
        treasure: "gold_pouch_large",
        fishing: "town_amenities_4",
        magic_school_bookshelf: "magic_school_bookshelf",
        magic_school_focus: "magic_school_focus",
        magic_school_chart: "magic_school_chart",
        magic_school_sign: "magic_school_sign",
        lantern_notice_board: "lantern_notice_board",
        lantern_anvil: "lantern_anvil",
        lantern_smith_forge: "town_amenities_0",
        lantern_training_shelf: "magic_school_bookshelf",
        lantern_shrine: "lantern_shrine",
        lantern_grocery_display: "lantern_grocery_display",
        lantern_healer_cot: "lantern_healer_cot",
        lantern_healer_cot_east: "lantern_healer_cot",
        lantern_shop_rack: "lantern_shop_rack",
        lantern_bank_safe: "lantern_bank_safe",
        dungeon: "dungeon_entrance",
        return: "dungeon_entrance",
        "far-exit": "dungeon_entrance",
      };
      if (id === "exit" || (id === "return" && !continuous && map.id !== "threshold-1")) continue;
      const npc = townNpcSprite(map.id, id ?? "");
      const frame = id?.startsWith("chest-") ? "gold_pouch_small" : (npc ?? ids[id ?? ""] ?? "town_atlas_1");
      art(frame, landmark.x, landmark.y);
    }
    for (const door of map.doors ?? []) {
      const key = `${door.x},${door.y}`;
      if (!known || known.has(key) || seen?.has(key)) art("town_atlas_9", door.x, door.y);
    }
    for (const gate of map.gates ?? []) {
      if (map.tiles[gate.y * map.width + gate.x] !== CLOSED_DUNGEON_GATE) continue;
      const cell = `${gate.x},${gate.y}`;
      if (known && !known.has(cell) && !seen?.has(cell)) continue;
      const sprite = art("dungeon_entrance", gate.x, gate.y);
      if (sprite) {
        sprite.tint = 0xffffff;
        sprite.alpha = seen && !seen.has(cell) ? 0.35 : 1;
      }
    }
    const aliveInBattle = livingEnemyIds === undefined ? undefined : new Set(livingEnemyIds.split(","));
    let battleIndex = 0;
    for (const enemy of map.enemies ?? []) {
      if (aliveInBattle && (enemyId ? enemy.id === enemyId : !continuous || enemy.room === enemyRoom)) {
        const id = String(battleIndex++);
        if (!aliveInBattle.has(id)) continue;
      }
      if (enemy.alive === false || (seen && !seen.has(`${enemy.x},${enemy.y}`))) continue;
      const sprite = enemy.sprite ?? "glass_mite";
      const frame = isWolfKind(sprite) ? sprite : `spider_atlas_${dungeonEnemies[sprite]?.sprite ?? 16}`;
      art(frame, enemy.x, enemy.y);
    }
    return () => {
      layer.removeChildren().forEach((child) => child.destroy({ children: true }));
    };
  }, [app, isInitialised, map, visible, explored, sheet, lighting, livingEnemyIds, continuous, enemyRoom, enemyId]);
  useEffect(() => {
    const layer = residentLayer.current;
    const sprites = residentSprites.current;
    if (!layer || !sprites || !sheet) return;
    const active = new Set(townResidents.map(({ id }) => id));
    for (const [id, sprite] of sprites) {
      if (active.has(id)) continue;
      gsap.killTweensOf(sprite.position);
      sprite.destroy();
      sprites.delete(id);
    }
    const duration = reducedMotion || matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 0.24;
    for (const resident of townResidents) {
      const x = resident.x * CELL + 4;
      const y = resident.y * CELL;
      const sprite = sprites.get(resident.id);
      if (sprite) {
        if (sprite.x !== x || sprite.y !== y) gsap.to(sprite.position, { x, y, duration, overwrite: true });
        continue;
      }
      const texture = sheet.textures[resident.id];
      if (!texture) continue;
      const figure = new Sprite(texture);
      figure.position.set(x, y);
      sprites.set(resident.id, figure);
      layer.addChild(figure);
    }
  }, [app, isInitialised, map.width, map.height, continuous, townResidents, sheet, reducedMotion]);
  useEffect(() => {
    const figure = actor.current;
    if (!figure) return;
    figure.removeChildren().forEach((child) => child.destroy());
    const art = (id: string, tint?: string) => {
      const texture = sheet?.textures[id];
      if (!texture) return;
      const sprite = new Sprite(texture);
      sprite.position.set(4, 0);
      sprite.width = 16;
      sprite.height = 24;
      if (tint) sprite.tint = tint;
      figure.addChild(sprite);
    };
    const body = `body_${appearance?.body ?? 1}_${appearance?.face ?? 0}_${appearance?.eyes ?? 0}`;
    art(`${body}_base`);
    art(`${body}_outfit`, outfits[appearance?.race ?? 0]);
    art(`${body}_skin`, skins[appearance?.skin ?? 1]);
    art(`${body}_eyes`, eyes[appearance?.eyeColor ?? 0]);
    art(`hair_mask_${appearance?.hair ?? 0}`, hairs[appearance?.hairColor ?? 0]);
  }, [actor, sheet, appearance, map.width, map.height]);
  useEffect(() => {
    if (!actor.current) return;
    const duration = reducedMotion || matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 0.12;
    gsap.to(actor.current.position, {
      x: player.x * CELL,
      y: player.y * CELL,
      duration,
      overwrite: true,
    });
    if (!continuous) camera.current?.moveCenter(player.x * CELL + CELL / 2, player.y * CELL + CELL / 2);
  }, [actor, player.x, player.y, reducedMotion, continuous]);
  useEffect(() => {
    const figure = actor.current;
    if (!figure || !combatCue) return;
    const quiet = reducedMotion || matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (quiet) return;
    const timeline = gsap.timeline();
    timeline.to(figure, { alpha: 0.35, duration: 0.08 });
    timeline.to(figure, { alpha: 1, duration: 0.12 });
    if (combatCue.outcome === "victory") {
      timeline.to(figure.scale, { x: 1.15, y: 1.15, duration: 0.12 });
      timeline.to(figure.scale, { x: 1, y: 1, duration: 0.15 });
    }
    return () => {
      timeline.kill();
      figure.alpha = 1;
      figure.scale.set(1);
    };
  }, [actor, combatCue?.id, reducedMotion]);
  return null;
}

export function WorldCanvas(props: WorldCanvasProps) {
  const actor = useRef<Container | null>(null);
  const [element, setElement] = useState<HTMLDivElement | null>(null);
  const [viewport, setViewport] = useState<Viewport | null>(null);
  return (
    <div
      ref={setElement}
      className="world-canvas relative"
      role="group"
      aria-label="World view. Use arrow keys to move or select a destination."
      style={{
        width: "100%",
        height: "100%",
        overflow: "hidden",
      }}
    >
      {element && (
        <Application
          resizeTo={element}
          background={0x10252c}
          antialias={false}
          roundPixels
          preference="webgl"
          resolution={1}
          autoDensity={false}
        >
          <Scene {...props} actor={actor} onViewport={setViewport} resizeTarget={element} />
        </Application>
      )}
      {viewport && props.encounter && (
        <CombatMarkers
          encounter={props.encounter}
          actor={actor}
          visible={props.visible}
          viewport={viewport}
          tileSize={CELL}
          onTarget={props.onTarget}
        />
      )}
    </div>
  );
}
