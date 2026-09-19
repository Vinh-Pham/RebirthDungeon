import { useEffect, useState } from 'react';
import { Button, Card, ScrollShadow } from '@heroui/react';
import type { Immutable } from 'immer';
import type { Character } from '../domain/model';
import type { Command } from '../domain/commands';
import { skills } from '../domain/Skills';
import { items } from '../domain/catalog';
import { actionCosts, actionRank, learned, usableReason } from '../domain/skillSystem';
import { previewDamage } from '../domain/combat';
import { canWait, currentActor, playerTurn } from '../domain/battle/engine';
import { consumableReason } from '../domain/battle/items';
import { costDescription } from '../domain/stats/resources';
import { setBattleTarget } from '../game/battleTarget';

export function BattlePanel({
    c,
    disabled,
    send,
}: {
    c: Immutable<Character>;
    disabled: boolean;
    send: (command: Command) => void;
}) {
    const b = c.battle!;
    const [menu, setMenu] = useState<'attack' | 'skills' | 'items' | 'defend'>('attack');
    const [chosen, setChosen] = useState('');
    const [selected, setSelected] = useState('');
    const target =
        b.enemies.find((e) => e.id === selected && e.hp > 0) ?? b.enemies.find((e) => e.hp > 0);
    const skill = menu === 'attack' ? 'normal' : menu === 'defend' ? 'defense' : chosen;
    const ready = playerTurn(c) && !disabled;
    const identity = { actorId: c.id, turnId: b.turnId };
    const actor = currentActor(c);
    const reason = skill && skills[skill] ? usableReason(c, skill) : 'Choose a skill';
    const availableSkills = Object.keys(learned(c)).filter(
        (id) =>
            !['normal', 'defense'].includes(id) &&
            skills[id]?.type === 'active' &&
            skills[id].route !== 'reference',
    );
    useEffect(() => {
        setBattleTarget(target?.id ?? '');
        return () => setBattleTarget('');
    }, [target?.id]);
    return (
        <section
            aria-label="Battle controls"
            className="absolute inset-x-2 bottom-[calc(var(--hud-height)*var(--hudscale,1)+8px)] z-10 mx-auto max-w-4xl sm:inset-x-6"
        >
            <Card className="max-h-[min(60dvh,calc(100dvh-var(--hud-height)*var(--hudscale,1)-150px))] gap-3 overflow-hidden border border-border bg-surface/95 p-3 shadow-surface sm:p-4">
                <Card.Header className="shrink-0 flex-row items-center justify-between gap-2 p-0">
                    <div>
                        <Card.Title className="font-sans text-base">Round {b.round}</Card.Title>
                        <p role="status" className="text-xs text-muted">
                            {ready
                                ? 'Your turn · choose a main action'
                                : `${actor?.name ?? 'Battle'} · resolving turn`}
                        </p>
                    </div>
                    <span className="text-xs text-muted">
                        {b.itemUsed ? 'Item used' : 'Item available'}
                    </span>
                </Card.Header>
                <ScrollShadow orientation="horizontal" className="shrink-0 overflow-x-auto pb-1">
                    <ol aria-label="Turn order" className="flex w-max gap-2">
                        {b.order.map((id) => {
                            const a = id === c.id ? c : b.enemies.find((e) => e.id === id)!;
                            return (
                                <li
                                    key={id}
                                    aria-current={actor?.id === id ? 'step' : undefined}
                                    className={`rounded-lg border px-3 py-1 text-xs ${actor?.id === id ? 'border-accent bg-accent/10 text-foreground' : 'border-border text-muted'} ${a.hp <= 0 ? 'line-through opacity-50' : ''}`}
                                >
                                    {a.name} · {b.speeds[id]} Speed
                                </li>
                            );
                        })}
                    </ol>
                </ScrollShadow>
                <Card.Content className="min-h-0 space-y-3 overflow-y-auto">
                    <div role="group" aria-label="Enemy targets" className="flex flex-wrap gap-2">
                        {b.enemies.map((e) => (
                            <Button
                                key={e.id}
                                size="sm"
                                variant={target?.id === e.id ? 'secondary' : 'outline'}
                                aria-pressed={target?.id === e.id}
                                isDisabled={e.hp <= 0 || !ready}
                                onPress={() => setSelected(e.id)}
                                className="h-auto min-h-10 flex-1 whitespace-normal px-2 py-1 text-xs"
                            >
                                {e.name} · {e.hp}/{e.maxHp} HP
                            </Button>
                        ))}
                    </div>
                    <div
                        role="group"
                        aria-label="Battle actions"
                        className="grid grid-cols-4 gap-1 sm:gap-2"
                    >
                        {(['attack', 'skills', 'items', 'defend'] as const).map((id) => (
                            <Button
                                key={id}
                                variant={menu === id ? 'primary' : 'secondary'}
                                aria-pressed={menu === id}
                                onPress={() => setMenu(id)}
                                className="min-w-0 px-1 text-xs capitalize sm:text-sm"
                            >
                                {id}
                            </Button>
                        ))}
                    </div>
                    {menu === 'skills' && (
                        <ScrollShadow className="max-h-32 overflow-y-auto">
                            <div
                                aria-label="Learned battle skills"
                                className="grid grid-cols-1 gap-2 sm:grid-cols-2"
                            >
                                {availableSkills.length === 0 && (
                                    <p className="text-sm text-muted">
                                        Learn more skills from the instructor in town.
                                    </p>
                                )}
                                {availableSkills.map((id) => (
                                    <Button
                                        key={id}
                                        variant={chosen === id ? 'secondary' : 'outline'}
                                        aria-pressed={chosen === id}
                                        onPress={() => setChosen(id)}
                                        className="h-auto justify-start whitespace-normal px-3 py-2 text-left text-xs"
                                    >
                                        {skills[id].icon.startsWith('/') && (
                                            <img
                                                src={skills[id].icon}
                                                alt=""
                                                className="size-7 shrink-0"
                                            />
                                        )}
                                        <span>
                                            {skills[id].name} · {actionRank(c, id).rank}
                                            <br />
                                            {costDescription(actionCosts(c, id))}
                                            {usableReason(c, id) ? ` · ${usableReason(c, id)}` : ''}
                                        </span>
                                    </Button>
                                ))}
                            </div>
                        </ScrollShadow>
                    )}
                    {menu === 'items' ? (
                        <ScrollShadow className="max-h-32 overflow-y-auto">
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                {c.inventory
                                    .filter((i) => items[i.kind]?.type === 'consumable')
                                    .map((item) => {
                                        const reason = consumableReason(c, item.id);
                                        return (
                                            <div key={item.id}>
                                                <Button
                                                    fullWidth
                                                    variant="secondary"
                                                    isDisabled={!ready || b.itemUsed || !!reason}
                                                    onPress={() =>
                                                        send({
                                                            type: 'BATTLE_ITEM',
                                                            id: item.id,
                                                            ...identity,
                                                        })
                                                    }
                                                    className="text-xs"
                                                >
                                                    {items[item.kind].name} ×{item.count}
                                                </Button>
                                                {reason && (
                                                    <p className="mt-1 text-xs text-muted">
                                                        {reason}
                                                    </p>
                                                )}
                                            </div>
                                        );
                                    })}
                            </div>
                            <p className="mt-2 text-xs text-muted">
                                Use up to one item, then take your main action.
                            </p>
                        </ScrollShadow>
                    ) : (
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="min-w-0 text-xs text-muted">
                                {skill && skills[skill] && (
                                    <p>
                                        {skills[skill].name} ·{' '}
                                        {costDescription(actionCosts(c, skill))}
                                    </p>
                                )}
                                {skill && skills[skill]?.effect === 'attack' && target && (
                                    <p>
                                        {previewDamage(c, target, skill)} damage · critical{' '}
                                        {previewDamage(c, target, skill, true)}
                                    </p>
                                )}
                                <p id="battle-action-reason">
                                    {reason ||
                                        (menu === 'defend'
                                            ? 'Guard until your next turn.'
                                            : 'Confirm to end your turn.')}
                                </p>
                            </div>
                            <Button
                                isDisabled={!ready || !!reason}
                                aria-describedby="battle-action-reason"
                                onPress={() =>
                                    send({
                                        type: 'BATTLE_ACTION',
                                        action: menu === 'skills' ? 'skill' : menu,
                                        skill: menu === 'skills' ? skill : undefined,
                                        target: target?.id,
                                        ...identity,
                                    })
                                }
                            >
                                {menu === 'attack'
                                    ? 'Confirm Attack'
                                    : menu === 'defend'
                                      ? 'Confirm Defend'
                                      : 'Use Skill'}
                            </Button>
                        </div>
                    )}
                    {canWait(c) && (
                        <Button
                            fullWidth
                            variant="outline"
                            isDisabled={!ready}
                            onPress={() =>
                                send({ type: 'BATTLE_ACTION', action: 'wait', ...identity })
                            }
                        >
                            Wait · no affordable main action
                        </Button>
                    )}
                </Card.Content>
                <Card.Footer className="block shrink-0 border-t border-border pt-2">
                    <ScrollShadow className="max-h-12 overflow-y-auto">
                        <ol aria-label="Battle log" className="space-y-1 text-xs text-muted">
                            {b.events.slice(-4).map((event) => (
                                <li key={event.id}>{event.text}</li>
                            ))}
                        </ol>
                    </ScrollShadow>
                </Card.Footer>
            </Card>
        </section>
    );
}