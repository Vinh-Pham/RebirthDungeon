import { Surface } from '@heroui/react';
import type { Immutable } from 'immer';
import type { Character } from '../domain/model';
import { MenuBarNav } from './MenuBarNav';
import { MenuBarResources } from './MenuBarResources';
import { MenuBarStatuses } from './MenuBarStatuses';

export function MenuBar({
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
        <Surface
            render={(props) => <footer {...props} />}
            role="contentinfo"
            aria-label="Game menu and character status"
            className="game-hud dark absolute bottom-0 left-0 h-[var(--hud-height)] w-[calc(100%/var(--hudscale,1))] origin-bottom-left scale-[var(--hudscale,1)] bg-overlay px-6 py-3 text-foreground narrow:px-3"
        >
            {!!c?.statuses.length && (
                <MenuBarStatuses
                    statuses={c.statuses}
                    onOpen={(opener) => onOpen('character', opener)}
                />
            )}
            <div className="mx-auto grid h-full max-w-6xl grid-cols-[minmax(0,280px)_minmax(0,1fr)] items-center gap-8 narrow:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] narrow:gap-3">
                <MenuBarResources character={c} />
                <MenuBarNav character={c} onOpen={onOpen} />
            </div>
        </Surface>
    );
}
