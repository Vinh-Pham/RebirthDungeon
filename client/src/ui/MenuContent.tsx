import { Button } from '@heroui/react';
import type { ComponentProps, Key } from 'react';
import type { Command } from '../domain/commands';

/** Adventure menu content. Settings opens its own independent window. */
export function MenuContent({
    disabled,
    send,
    onOpenSettings,
}: {
    disabled: boolean;
    send: (command: Command) => void;
    onOpenSettings: () => void;
}) {
    const action = (
        label: string,
        onPress: () => void,
        extra: ComponentProps<typeof Button> & { key?: Key } = {},
    ) => {
        const { key, ...props } = extra;
        return (
            <Button key={key} isDisabled={disabled} onPress={onPress} {...props}>
                {label}
            </Button>
        );
    };
    return (
        <div className="stack">
            {action('Settings', onOpenSettings)}
            {action('Title Screen', () => send({ type: 'NAV', screen: 'Title' }))}
            <div className="mt-2 space-y-2">
                <span className="text-xs text-muted">Coming Later</span>
                <div className="flex flex-wrap gap-2">
                    {['Talent', 'Pets'].map((name) => (
                        <Button key={name} variant="secondary" isDisabled>
                            {name}
                        </Button>
                    ))}
                </div>
            </div>
        </div>
    );
}