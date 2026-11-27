import { Label, ProgressBar } from "@heroui/react";
import type { CharacterSheet, CharacterStatGroup, GameView } from "../app/contracts";

const number = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });
const rangeText = (value: number, max: number) => `${number.format(value)} / ${number.format(max)}`;

interface CharacterBarProps {
  label: string;
  tone: "life" | "mana" | "stamina" | "level" | "xp";
  value: number;
  max: number;
  text?: string;
}

function CharacterBar({ label, tone, value, max, text = rangeText(value, max) }: CharacterBarProps) {
  return (
    <ProgressBar
      className={`character-bar character-bar-${tone} mb-1.5 grid! w-full grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-1.5 gap-y-[3px] ${
        {
          life: "[--character-bar-fill:#ed7979]",
          mana: "[--character-bar-fill:#80abed]",
          stamina: "[--character-bar-fill:#e7c464]",
          level: "[--character-bar-fill:#b0cc7e]",
          xp: "[--character-bar-fill:#77d2dc]",
        }[tone]
      }`}
      size="sm"
      value={Math.max(0, Math.min(value, max))}
      maxValue={Math.max(1, max)}
      valueLabel={text}
    >
      <Label className="text-inherit! text-[length:inherit]! leading-[inherit]!">{label}</Label>
      <ProgressBar.Output className="text-inherit! text-xs! leading-[inherit]! text-right whitespace-nowrap max-[540px]:text-[10px]!" />
      <ProgressBar.Track className="col-span-full h-[3px]! rounded-none! bg-[#30454c]!">
        <ProgressBar.Fill className="rounded-none! bg-[var(--character-bar-fill)]!" />
      </ProgressBar.Track>
    </ProgressBar>
  );
}

const statBlockClasses =
  "character-block min-w-0 border-t border-[#45676b] bg-[#14282c] px-3 py-2 max-[540px]:px-[7px] max-[540px]:py-1.5 [&_h3]:mt-0 [&_h3]:mb-1.5 [&_h3]:text-[13px] [&_h3]:text-[#b3d6ce]";

const statRowClasses =
  "character-stat-row grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-1.5 py-0.5 max-[540px]:grid-cols-[minmax(0,1fr)_minmax(0,auto)] [&_dt]:text-[#a6bcba] [&_dt]:[overflow-wrap:anywhere] [&_dd]:m-0 [&_dd]:text-right [&_dd]:[overflow-wrap:anywhere] max-[540px]:[&_dd]:max-w-[68px]";

function StatGroup({ title, stats }: CharacterStatGroup) {
  return (
    <section className={`character-stat-group ${statBlockClasses}`}>
      <h3>{title}</h3>
      <dl>
        {stats.map(({ label, value }) => (
          <div className={statRowClasses} key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function CharacterPanel({ player, sheet }: { player: NonNullable<GameView["player"]>; sheet: CharacterSheet }) {
  const { groups } = sheet;
  const capped = player.xpToAdvance === 0;
  return (
    <div className="character-sheet grid gap-[10px] text-[13px] leading-[1.4] tabular-nums max-[540px]:gap-1.5 max-[540px]:text-[11px] [&_dl]:m-0">
      <div className="character-identity grid grid-cols-[minmax(0,1fr)_minmax(0,0.7fr)] items-center gap-2 border-s-[3px] border-accent bg-[#233b3e] px-3 py-2 max-[540px]:px-[7px] max-[540px]:py-1.5 [&_h3]:m-0 [&_h3]:text-[19px] [&_h3]:leading-[1.2] [&_h3]:[overflow-wrap:anywhere] max-[540px]:[&_h3]:text-base [&_p]:mt-0.5 [&_p]:text-[#a6bcba] [&_dt]:mt-0.5 [&_dt]:text-[#a6bcba] [&_dl]:text-right [&_dl]:[overflow-wrap:anywhere] [&_dd]:m-0">
        <div>
          <h3>{player.name}</h3>
          <p>
            {sheet.race} · {sheet.age}
          </p>
        </div>
        <dl>
          <dt>Active Talent</dt>
          <dd>{sheet.talent}</dd>
        </dl>
      </div>
      <div className="character-summary character-pair grid grid-cols-2 gap-[10px] max-[540px]:gap-1.5">
        <section className={statBlockClasses}>
          <h3>Vitals</h3>
          <CharacterBar label="HP" tone="life" value={player.hp} max={player.maxHp} />
          <CharacterBar label="MP" tone="mana" value={player.mp} max={player.maxMp} />
          <CharacterBar label="Stamina" tone="stamina" value={player.stamina} max={player.maxStamina} />
          {player.deadly || (player.wounds ?? 0) > 0 ? (
            <p className="character-injury mt-1 mb-0 text-[#f69b9b]">
              {player.deadly ? "Deadly" : null}
              {player.deadly && player.wounds ? " · " : null}
              {player.wounds ? `${number.format(player.wounds)} wounded HP` : null}
            </p>
          ) : null}
        </section>
        <section className={statBlockClasses}>
          <h3>Progression</h3>
          <CharacterBar label="Level" tone="level" value={player.level} max={sheet.levelCap} />
          <CharacterBar
            label="XP"
            tone="xp"
            value={capped ? 1 : player.xpInLevel}
            max={capped ? 1 : player.xpToAdvance}
            text={capped ? "Max level" : undefined}
          />
          <dl className="character-progression-details">
            <div className={statRowClasses}>
              <dt>AP</dt>
              <dd>{number.format(sheet.ap)}</dd>
            </div>
            <div className={statRowClasses}>
              <dt>Total XP</dt>
              <dd>{number.format(sheet.totalXp)}</dd>
            </div>
          </dl>
        </section>
      </div>
      <div className="character-stat-groups character-pair grid grid-cols-2 gap-[10px] max-[540px]:gap-1.5">
        <div className="character-stat-column grid content-start gap-[10px] max-[540px]:gap-1.5">
          <StatGroup {...groups.attributes} />
          <StatGroup {...groups.defense} />
          <StatGroup {...groups.gathering} />
        </div>
        <div className="character-stat-column grid content-start gap-[10px] max-[540px]:gap-1.5">
          <StatGroup {...groups.combat} />
          <StatGroup {...groups.magic} />
        </div>
      </div>
    </div>
  );
}
