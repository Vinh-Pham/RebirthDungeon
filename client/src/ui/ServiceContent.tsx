import { Button, Input, Label, TextField, Tabs } from '@heroui/react';
import { useState, type ComponentProps, type Key } from 'react';
import type { Immutable } from 'immer';
import type { Character } from '../domain/model';
import { raceReason } from '../domain/inventory';
import { items, shops } from '../domain/catalog';
import type { Command } from '../domain/commands';
import { NpcQuests } from './QuestJournal';
import { ItemImage } from './ItemImage';
import { InventoryList } from './InventoryList';

/**
 * The one active town-service window's content, matching the dialogue actor: healer,
 * shops, and bank each replace the previous service without touching other windows.
 */
export function ServiceContent({
    service,
    onOpenInventory,
    character: c,
    disabled,
    send,
}: {
    service: string;
    onOpenInventory: () => void;
    character: Immutable<Character>;
    disabled: boolean;
    send: (command: Command) => void;
}) {
    const [amount, setAmount] = useState('10');
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
    if (shops[service])
        return (
            <Tabs key={service} defaultSelectedKey="shop" className="w-full">
                <Tabs.ListContainer>
                    <Tabs.List aria-label="NPC services">
                        <Tabs.Tab id="shop">
                            Shop
                            <Tabs.Indicator />
                        </Tabs.Tab>
                        <Tabs.Tab id="quests">
                            Quests
                            <Tabs.Indicator />
                        </Tabs.Tab>
                    </Tabs.List>
                </Tabs.ListContainer>
                <Tabs.Panel id="shop" className="pt-4">
                    <Button variant="secondary" onPress={onOpenInventory}>
                        Your inventory
                    </Button>
                    <p className="mb-3 text-sm text-muted">
                        {c.gold} gold · Select an item in your inventory to sell it.
                    </p>

                    <p>
                        {service === 'Blacksmith'
                            ? 'Bram checks the edge of your weapon. “A good blade deserves care.”'
                            : 'Supplies for the road ahead.'}
                    </p>
                    <div className="grid gap-[7px]" data-testid="shop-catalog">
                        {shops[service].map((kind) => (
                            <article
                                key={kind}
                                className="flex items-center gap-[15px] border-b border-[#819e7c44] p-[10px]"
                            >
                                <ItemImage kind={kind} />
                                <div className="flex-1">
                                    <h3 className="text-[16px]">{items[kind].name}</h3>
                                    <small>
                                        {items[kind].description ??
                                            (items[kind].power
                                                ? `${items[kind].power} power`
                                                : items[kind].restore
                                                  ? `Restores ${items[kind].restore} ${items[kind].resource}`
                                                  : `${items[kind].defense ?? 0} defense`)}
                                    </small>
                                    {raceReason(c, kind) && (
                                        <p className="text-xs text-warning">
                                            Equip: {raceReason(c, kind)}
                                        </p>
                                    )}
                                </div>
                                {action(`Buy · ${items[kind].price}g`, () =>
                                    send({ type: 'BUY', shop: service, kind }),
                                )}
                            </article>
                        ))}
                    </div>
                </Tabs.Panel>
                <Tabs.Panel id="quests" className="pt-4">
                    <NpcQuests
                        character={c}
                        disabled={disabled}
                        send={send}
                        npc={service}
                        emptyMessage="No quests available here right now."
                    />
                </Tabs.Panel>
            </Tabs>
        );
    return (
        <div className="stack">
            {service === 'Healer' && (
                <>
                    <p>Elara smiles. “Rest a moment, traveler. The road can wait.”</p>
                    {action('Restore HP, mana & stamina · 10 gold', () => send({ type: 'HEAL' }))}
                </>
            )}
            {service === 'Bank' && (
                <>
                    <p>
                        Stored gold: {c.bankGold} · Bank slots: {c.bank.length}/60
                    </p>
                    <TextField>
                        <Label>Gold amount</Label>
                        <Input
                            type="number"
                            min="1"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                        />
                    </TextField>
                    <div className="choices">
                        {action('Deposit gold', () =>
                            send({ type: 'BANK_GOLD', amount: Number(amount), deposit: true }),
                        )}
                        {action('Withdraw gold', () =>
                            send({ type: 'BANK_GOLD', amount: Number(amount), deposit: false }),
                        )}
                    </div>
                    {c.bank.map((i) => (
                        <div className="item" key={i.id}>
                            {items[i.kind].name} ×{i.count}
                            {action('Withdraw', () =>
                                send({ type: 'BANK_ITEM', id: i.id, deposit: false }),
                            )}
                        </div>
                    ))}
                </>
            )}
            {service === 'Bank' && (
                <InventoryList character={c} disabled={disabled} send={send} service={service} />
            )}
        </div>
    );
}