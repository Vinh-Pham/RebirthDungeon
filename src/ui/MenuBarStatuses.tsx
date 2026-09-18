import { Button } from '@heroui/react';
import type { Immutable } from 'immer';
import type { Character } from '../domain/model';

export function MenuBarStatuses({
    statuses,
    onOpen,
}: {
    statuses: Immutable<Character>['statuses'];
    onOpen: (opener?: EventTarget | null) => void;
}) {
    return (
        <div
            aria-label="Active effects"
            className="absolute bottom-full left-3 flex max-w-[90vw] flex-wrap gap-2 pb-2"
        >
            {statuses.map((status) => (
                <Button
                    key={status.definition.group}
                    size="sm"
                    variant="secondary"
                    aria-label={`${status.definition.name}, ${status.remaining} activations remaining`}
                    onPress={(event) => onOpen(event.target)}
                >
                    {status.definition.name} · {status.remaining}
                </Button>
            ))}
        </div>
    );
}
