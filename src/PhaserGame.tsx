import { useEffect, useRef } from 'react';
import type { Game } from 'phaser';
export function PhaserGame() {
    const container = useRef<HTMLDivElement>(null);
    useEffect(() => {
        let game: Game | undefined;
        let cancelled = false;
        // Strict Mode cleans up its first mount before this frame. Starting two Phaser
        // games concurrently can leave a visible canvas with detached input handlers.
        const frame = requestAnimationFrame(() => {
            void import('./game/main').then(({ default: start }) => {
                if (!cancelled && container.current) game = start(container.current);
            });
        });
        return () => {
            cancelled = true;
            cancelAnimationFrame(frame);
            game?.destroy(true);
        };
    }, []);
    return (
        <div
            id="game-container"
            // Focusable so closing the last window can hand keyboard control back to the game.
            tabIndex={-1}
            className="absolute inset-x-0 top-0 bottom-[calc(var(--hud-height)*var(--hudscale,1))] outline-none"
            ref={container}
            aria-label="Rebirth Dungeon game world"
        />
    );
}
