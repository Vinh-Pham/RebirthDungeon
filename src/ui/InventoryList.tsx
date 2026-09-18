import { Button } from '@heroui/react';
import type { Immutable } from 'immer';
import type { ComponentProps, Key } from 'react';
import type { Character } from '../domain/model';
import { items, shops } from '../domain/catalog';
import type { Command } from '../domain/commands';

/**
 * The shared item rows. The inventory window shows plain actions; a service window
 * passes its `service` id to add trade actions (repair, sell, deposit).
 */
export function InventoryList({
    character: c,
    disabled,
    send,
    service = '',
}: {
    character: Immutable<Character>;
    disabled: boolean;
    send: (command: Command) => void;
    service?: string;
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
        <>
            <h3>Inventory · {c.inventory.length}/30</h3>
            <div className="mt-[15px] flex flex-col gap-[6px]">
                {c.inventory.map((i) => (
                    <div className="item" key={i.id}>
                        <span className="text-[26px]">{items[i.kind].icon}</span>
                        <div className="flex-1">
                            <strong>
                                {items[i.kind].name} ×{i.count}
                            </strong>
                            {items[i.kind].description && (
                                <p className="text-xs">{items[i.kind].description}</p>
                            )}
                            <small className="mt-[5px] block text-[10px]">
                                {c.weapon === i.id || c.offhand === i.id || c.armor === i.id
                                    ? 'Equipped · '
                                    : ''}
                                {i.durability !== undefined
                                    ? `${i.durability}/20 durability`
                                    : items[i.kind].type}
                            </small>
                        </div>
                        <div className="choices wnarrow:my-0">
                            {(items[i.kind].resource ||
                                items[i.kind].statuses ||
                                items[i.kind].cleanse) &&
                                action('Use', () => send({ type: 'USE', id: i.id }))}
                            {['weapon', 'armor', 'shield'].includes(items[i.kind].type) &&
                                action(
                                    c.weapon === i.id || c.offhand === i.id || c.armor === i.id
                                        ? 'Unequip'
                                        : 'Equip',
                                    () =>
                                        send({
                                            type: 'EQUIP',
                                            id: i.id,
                                            ...(c.offhand === i.id
                                                ? { slot: 'offhand' as const }
                                                : {}),
                                        }),
                                    { isDisabled: !!c.run },
                                )}
                            {['sword', 'steel'].includes(i.kind) &&
                                c.weapon !== i.id &&
                                action(
                                    c.offhand === i.id ? 'Unequip off-hand' : 'Equip off-hand',
                                    () => send({ type: 'EQUIP', id: i.id, slot: 'offhand' }),
                                    { isDisabled: !!c.run },
                                )}
                            {items[i.kind].type === 'book' &&
                                action('Read', () => send({ type: 'READ', id: i.id }), {
                                    isDisabled: !!c.run,
                                })}
                            {items[i.kind].type === 'page' &&
                                action(
                                    'Insert page',
                                    () => send({ type: 'INSERT_PAGE', id: i.id }),
                                    {
                                        isDisabled: !!c.run,
                                    },
                                )}
                            {service === 'Blacksmith' &&
                                i.durability !== undefined &&
                                action(`Repair · ${20 - i.durability}g`, () =>
                                    send({ type: 'REPAIR', id: i.id }),
                                )}
                            {shops[service] &&
                                action(`Sell · ${Math.floor(items[i.kind].price / 4)}g`, () =>
                                    send({ type: 'SELL', id: i.id }),
                                )}
                            {service === 'Bank' &&
                                action('Deposit', () =>
                                    send({ type: 'BANK_ITEM', id: i.id, deposit: true }),
                                )}
                        </div>
                    </div>
                ))}
            </div>
        </>
    );
}
