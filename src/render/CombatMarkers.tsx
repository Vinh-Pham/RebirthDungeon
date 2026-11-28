import { useLayoutEffect, useRef } from "react";
import type { Viewport } from "pixi-viewport";
import type { GameView } from "../app/contracts";
import { key } from "../game/world/world";

export function CombatMarkers({
  encounter,
  visible,
  viewport,
  tileSize,
  onAttackEnemy,
}: {
  encounter: NonNullable<GameView["encounter"]>;
  visible?: ReadonlySet<string>;
  viewport: Viewport;
  tileSize: number;
  onAttackEnemy: (id: string) => void;
}) {
  const enemyLayer = useRef<HTMLDivElement>(null);
  const enemies = encounter.enemies.filter(({ position }) => !visible || visible.has(key(position.x, position.y)));

  useLayoutEffect(() => {
    const buttons = enemyLayer.current?.querySelectorAll("button");
    if (!buttons) return;

    const anchors = enemies.map(({ position }, index) => ({
      x: (position.x + 0.5) * tileSize,
      y: (position.y + 1) * tileSize,
      button: buttons[index],
    }));
    const placeMarkers = () => {
      const spriteHeight = tileSize * viewport.scale.y;
      const place = (marker: HTMLElement, anchor: { x: number; y: number }) => {
        const transform = `translate(${Math.round(anchor.x)}px, ${Math.round(anchor.y) + 2}px)`;
        if (marker.style.transform !== transform) marker.style.transform = transform;
        marker.hidden =
          anchor.x < 0 ||
          anchor.x >= viewport.screenWidth ||
          anchor.y <= 0 ||
          anchor.y - spriteHeight >= viewport.screenHeight;
      };
      for (const { x, y, button } of anchors) {
        const anchor = viewport.toScreen(x, y);
        place(button, anchor);
        button.style.setProperty("--enemy-sprite-height", `${spriteHeight}px`);
      }
    };
    placeMarkers();
    viewport.on("frame-end", placeMarkers);
    return () => {
      viewport.off("frame-end", placeMarkers);
    };
  }, [enemies, viewport, tileSize]);

  return (
    <div className="combat-markers pointer-events-none absolute inset-0">
      <div ref={enemyLayer} role="group" aria-label="Enemies">
        {enemies.map((enemy) => (
          <button
            type="button"
            className="combat-marker enemy-marker group pointer-events-auto absolute top-0 left-0 -translate-x-1/2 grid gap-[2px] w-12 p-[2px] border border-[#576069] bg-[#101f24] [&[hidden]]:hidden aria-pressed:border-[#f2ec8b] aria-pressed:z-1"
            key={enemy.id}
            aria-label={`Attack ${enemy.name}. ${enemy.hp} of ${enemy.maxHp} HP. Preparing ${enemy.intent}.`}
            aria-pressed={encounter.target === enemy.id}
            onClick={() => onAttackEnemy(enemy.id)}
          >
            <span className="enemy-marker-name absolute left-1/2 bottom-[calc(100%+var(--enemy-sprite-height)+3px)] -translate-x-1/2 w-max px-1 py-[2px] border border-[#344a5a] bg-[#101f24] text-[#d6dad3] font-[Departure,monospace] text-[10px] leading-[1.15] text-center group-aria-pressed:text-[#f2ec8b] group-aria-pressed:border-[#f2ec8b]">
              {enemy.name}
              <span className="enemy-marker-intent block mt-[2px] text-[#a9b2a2] text-[9px]">{enemy.intent}</span>
            </span>
            <meter
              className="enemy-hp appearance-none block w-full h-[3px] bg-[#344a5a] [--meter-fill:#e56869]"
              aria-hidden="true"
              value={enemy.hp}
              max={enemy.maxHp}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
