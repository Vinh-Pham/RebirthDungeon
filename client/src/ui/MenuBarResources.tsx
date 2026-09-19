import type { Immutable } from 'immer';
import type { Character } from '../domain/model';
import { ResourceMeter } from './ResourceMeter';

const resources = [
    ['hp', 'HP'],
    ['mana', 'MP'],
    ['stamina', 'SP'],
] as const;

export function MenuBarResources({
    character: c,
}: {
    character: Immutable<Character> | undefined;
}) {
    const held = resources
        .filter(([key]) => (c?.battle?.action?.costs[key] ?? 0) > 0)
        .map(([key, label]) => `${c!.battle!.action!.costs[key]} ${label}`);
    return (
        <section aria-label="Character resources" className="min-w-0">
            <div data-testid="hud-identity" className="mb-2 flex min-w-0 flex-col gap-0.5">
                <strong className="truncate text-sm font-semibold" title={c?.name}>
                    {c?.name || 'A story unwritten'}
                </strong>
                <span className="text-xs text-muted narrow:text-[10px]">
                    {c ? `${c.race} · ${c.talent}` : 'Rebirth Dungeon'}
                </span>
            </div>
            <div className="flex flex-col gap-1">
                {resources.map(([key, label]) => (
                    <ResourceMeter
                        key={key}
                        label={label}
                        value={c?.[key] ?? 0}
                        max={c?.stats[key] ?? 0}
                        reserved={c?.battle?.action?.costs[key] ?? 0}
                        empty={!c}
                    />
                ))}
            </div>
            {!!held.length && (
                <div className="mt-1 text-[10px] text-muted tabular-nums">
                    Held: {held.join(' · ')}
                </div>
            )}
        </section>
    );
}