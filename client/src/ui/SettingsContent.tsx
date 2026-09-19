import { Button, Input, Label, TextField } from '@heroui/react';
import type { ComponentProps, Key } from 'react';
import type { Immutable } from 'immer';
import type { SaveData } from '../domain/model';
import type { Command } from '../domain/commands';

/** Settings window content: volumes, HUD scale, controls reminder, reduced motion. */
export function SettingsContent({
    save,
    disabled,
    send,
}: {
    save: Immutable<SaveData>;
    disabled: boolean;
    send: (command: Command) => void;
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
            {(['music', 'effects'] as const).map((key) => (
                <TextField key={key}>
                    <Label>{key === 'music' ? 'Music volume' : 'Effects volume'} (0–100)</Label>
                    <Input
                        type="number"
                        min="0"
                        max="100"
                        value={String(Math.round(save.data.settings[key] * 100))}
                        onChange={(e) =>
                            send({
                                type: 'SETTINGS',
                                settings: { [key]: Number(e.target.value) / 100 },
                            })
                        }
                    />
                </TextField>
            ))}
            <TextField>
                <Label>HUD scale (80–130%)</Label>
                <Input
                    type="number"
                    min="80"
                    max="130"
                    step="10"
                    value={String(Math.round(save.data.settings.hudScale * 100))}
                    onChange={(e) =>
                        send({
                            type: 'SETTINGS',
                            settings: { hudScale: Number(e.target.value) / 100 },
                        })
                    }
                />
            </TextField>
            <p>
                WASD / arrows: walk · Click: move or select
                <br />
                C: Character · Z: Skills · Q: Quests · I: Inventory
                <br />
                E: interact · Hold dice, then reroll up to twice.
            </p>
            {action(`Reduced motion: ${save.data.settings.reducedMotion ? 'On' : 'Off'}`, () =>
                send({
                    type: 'SETTINGS',
                    settings: { reducedMotion: !save.data.settings.reducedMotion },
                }),
            )}
        </div>
    );
}