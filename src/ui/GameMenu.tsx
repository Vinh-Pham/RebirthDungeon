import { Button } from "@heroui/react";
import type { GameActions, GameView } from "../app/contracts";

const meterClasses = "col-start-1 row-start-1 block h-full w-full appearance-none bg-[#28353e]";
const meterReadout =
  "vital-value z-1 col-start-1 row-start-1 flex min-h-3.5 items-center px-[5px] text-white [text-shadow:0_1px_#101f24,0_-1px_#101f24,1px_0_#101f24,-1px_0_#101f24]";
const meterText = "text-surface-foreground text-[11px] leading-[1.15] tabular-nums";

export function GameMenu({ view, actions }: { view: GameView; actions: GameActions }) {
  const player = view.player;
  const maxLevel = player?.xpToAdvance === 0;
  const xpReadout = player && (maxLevel ? "Max level" : `${player.xpInLevel} / ${player.xpToAdvance}`);
  const injury = player?.deadly ? "Deadly" : player?.wounds ? "Wounded" : "";

  return (
    <footer className="game-menu flex-none border-t border-border bg-surface px-1 max-[800px]:px-3 max-[360px]:py-1">
      {player && (
        <div className={`menu-xp mb-1 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2 ${meterText}`}>
          <span className="menu-level whitespace-nowrap">Lv. {player.level}</span>
          <div className="vital-bar grid min-w-0">
            <meter
              className={`${meterClasses} [--meter-fill:#79ccec]`}
              aria-label="XP"
              aria-valuetext={xpReadout}
              value={maxLevel ? 1 : player.xpInLevel}
              max={maxLevel ? 1 : player.xpToAdvance}
            />
            <span className={`${meterReadout} justify-center`} aria-hidden="true">
              <span>{xpReadout}</span>
            </span>
          </div>
        </div>
      )}
      {player && (
        <div
          className={`game-vitals grid max-w-[22rem] gap-0.5 ${meterText}`}
          role="group"
          aria-label="Character vitals"
        >
          {(
            [
              ["HP", player.hp, player.maxHp, "[--meter-fill:#e56869]", injury],
              ["MP", player.mp, player.maxMp, "[--meter-fill:#427fce]", ""],
              ["Stamina", player.stamina, player.maxStamina, "[--meter-fill:#f2d06b]", ""],
            ] as const
          ).map(([label, value, max, fill, status]) => {
            const range = `${Math.floor(value)} / ${Math.floor(max)}`;
            return (
              <div className="vital-bar grid min-w-0" key={label}>
                <meter
                  className={`${meterClasses} ${fill}`}
                  aria-label={label}
                  aria-valuetext={status ? `${range}, ${status}` : range}
                  value={Math.max(0, value)}
                  max={max}
                />
                <span className={`${meterReadout} justify-between`} aria-hidden="true">
                  <span>{range}</span>
                  {status && <span>{status}</span>}
                </span>
              </div>
            );
          })}
        </div>
      )}
      <nav
        className="game-actions flex flex-wrap gap-2 pt-1 max-[570px]:grid max-[570px]:grid-cols-3 max-[570px]:gap-1"
        aria-label="Game panels"
      >
        {(["character", "inventory", "skills", "journal", "gates", "settings"] as const).map((panel) => (
          <Button
            className="max-[570px]:h-auto max-[570px]:min-h-8 max-[570px]:w-full max-[570px]:min-w-0 max-[570px]:p-1 max-[570px]:text-[12px] max-[570px]:whitespace-normal [@media(max-height:550px)]:text-[12px] max-[360px]:px-0.5! max-[360px]:text-[10px]!"
            variant="ghost"
            key={panel}
            onPress={() => actions.panel(panel)}
          >
            {panel[0].toUpperCase() + panel.slice(1)} [{view.settings.bindings[panel]?.toUpperCase() || "Esc"}]
          </Button>
        ))}
      </nav>
    </footer>
  );
}
