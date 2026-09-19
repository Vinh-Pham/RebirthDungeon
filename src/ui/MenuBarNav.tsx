import { Button, ProgressBar } from '@heroui/react';
import type { Immutable } from 'immer';
import type { Character } from '../domain/model';
import { windowShortcuts } from './useWindowHotkeys';
import { xpNeeded } from '../domain/progression';

export function MenuBarNav({
    character: c,
    onOpen,
}: {
    character: Immutable<Character> | undefined;
    onOpen: (
        panel: 'character' | 'skills' | 'quests' | 'inventory' | 'menu',
        opener?: EventTarget | null,
    ) => void;
}) {
    return (
        <div className="flex min-w-0 flex-col gap-3 narrow:gap-2">
            <nav
                aria-label="Game navigation"
                className="grid grid-cols-5 gap-2 narrow:grid-cols-2 narrow:gap-1"
            >
                {(['character', 'skills', 'quests', 'inventory', 'menu'] as const).map((panel) => (
                    <Button
                        key={panel}
                        aria-keyshortcuts={
                            Object.entries(windowShortcuts).find(
                                ([, window]) => window === panel,
                            )?.[0]
                        }
                        variant="secondary"
                        isDisabled={!c && panel !== 'menu'}
                        onPress={(event) => onOpen(panel, event.target)}
                        className="w-full min-w-0 px-3 narrow:h-7 narrow:px-1 narrow:text-[11px]"
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
    );
}
