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
      className={`character-bar character-bar-${tone}`}
      size="sm"
      value={Math.max(0, Math.min(value, max))}
      maxValue={Math.max(1, max)}
      valueLabel={text}
    >
      <Label>{label}</Label>
      <ProgressBar.Output />
      <ProgressBar.Track>
        <ProgressBar.Fill />
      </ProgressBar.Track>
    </ProgressBar>
  );
}

function StatGroup({ title, stats }: CharacterStatGroup) {
  return (
    <section className="character-stat-group character-block">
      <h3>{title}</h3>
      <dl>
        {stats.map(({ label, value }) => (
          <div className="character-stat-row" key={label}>
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
    <div className="character-sheet">
      <div className="character-identity">
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
      <div className="character-summary character-pair">
        <section className="character-block">
          <h3>Vitals</h3>
          <CharacterBar label="HP" tone="life" value={player.hp} max={player.maxHp} />
          <CharacterBar label="MP" tone="mana" value={player.mp} max={player.maxMp} />
          <CharacterBar label="Stamina" tone="stamina" value={player.stamina} max={player.maxStamina} />
          {player.deadly || (player.wounds ?? 0) > 0 ? (
            <p className="character-injury">
              {player.deadly ? "Deadly" : null}
              {player.deadly && player.wounds ? " · " : null}
              {player.wounds ? `${number.format(player.wounds)} wounded HP` : null}
            </p>
          ) : null}
        </section>
        <section className="character-block">
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
            <div className="character-stat-row">
              <dt>AP</dt>
              <dd>{number.format(sheet.ap)}</dd>
            </div>
            <div className="character-stat-row">
              <dt>Total XP</dt>
              <dd>{number.format(sheet.totalXp)}</dd>
            </div>
          </dl>
        </section>
      </div>
      <div className="character-stat-groups character-pair">
        <div className="character-stat-column">
          <StatGroup {...groups.attributes} />
          <StatGroup {...groups.defense} />
          <StatGroup {...groups.gathering} />
        </div>
        <div className="character-stat-column">
          <StatGroup {...groups.combat} />
          <StatGroup {...groups.magic} />
        </div>
      </div>
    </div>
  );
}
