import { Button, ProgressBar, Surface } from '@heroui/react';
import type { Immutable } from 'immer';
import type { Character } from '../domain/model';
import { xpNeeded } from '../domain/progression';
import { ResourceMeter } from './ResourceMeter';

const resources = [
    ['hp', 'HP'],
    ['mana', 'MP'],
    ['stamina', 'SP'],
] as const;

export function GameHud({
    character: c,
    onOpen,
}: {
    character: Immutable<Character> | undefined;
    onOpen: (panel: 'character' | 'skills' | 'inventory' | 'menu') => void;
}) {
    const held = resources
        .filter(([key]) => (c?.battle?.action?.costs[key] ?? 0) > 0)
        .map(([key, label]) => `${c!.battle!.action!.costs[key]} ${label}`);
    return (
        <Surface
            render={(props) => <footer {...props} />}
            role="contentinfo"
            aria-label="Game menu and character status"
            className="game-hud dark absolute bottom-0 left-0 h-[var(--hud-height)] w-[calc(100%/var(--hudscale,1))] origin-bottom-left scale-[var(--hudscale,1)] bg-overlay px-6 py-3 text-foreground narrow:px-3"
        >
            {!!c?.statuses.length && (
                <div
                    aria-label="Active effects"
                    className="absolute bottom-full left-3 flex max-w-[90vw] flex-wrap gap-2 pb-2"
                >
                    {c.statuses.map((status) => (
                        <Button
                            key={status.definition.group}
                            size="sm"
                            variant="secondary"
                            aria-label={`${status.definition.name}, ${status.remaining} activations remaining`}
                            onPress={() => onOpen('character')}
                        >
                            {status.definition.name} · {status.remaining}
                        </Button>
                    ))}
                </div>
            )}
            <div className="mx-auto grid h-full max-w-6xl grid-cols-[minmax(0,280px)_minmax(0,1fr)] items-center gap-8 narrow:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] narrow:gap-3">
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
                <div className="flex min-w-0 flex-col gap-3 narrow:gap-2">
                    <nav
                        aria-label="Game navigation"
                        className="grid grid-cols-4 gap-2 narrow:grid-cols-2 narrow:gap-1"
                    >
                        {(['character', 'skills', 'inventory', 'menu'] as const).map((panel) => (
                            <Button
                                key={panel}
                                variant="secondary"
                                isDisabled={!c && panel !== 'menu'}
                                onPress={() => onOpen(panel)}
                                className="w-full min-w-0 px-3 narrow:h-8 narrow:px-1 narrow:text-[11px]"
                            >
                                {panel.charAt(0).toUpperCase() + panel.slice(1)}
                            </Button>
                        ))}
                    </nav>
                    <ProgressBar
                        data-resource="XP"
                        aria-label="Experience"
                        value={c?.xp ?? 0}
                        maxValue={xpNeeded(c?.level ?? 1)}
                        size="sm"
                        className="gap-1 text-xs tabular-nums"
                    >
                        <span className="text-muted [grid-area:label] narrow:text-[10px]">
                            Level {c?.level ?? 1}
                        </span>
                        <ProgressBar.Output className="text-xs text-muted narrow:text-[10px]">
                            {c?.xp ?? 0} / {xpNeeded(c?.level ?? 1)} XP
                        </ProgressBar.Output>
                        <ProgressBar.Track>
                            <ProgressBar.Fill />
                        </ProgressBar.Track>
                    </ProgressBar>
                </div>
            </div>
        </Surface>
    );
}
