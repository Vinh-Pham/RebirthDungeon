import { Button, Card, Tabs } from '@heroui/react';
import { useRef, useState, useSyncExternalStore } from 'react';
import type { Immutable } from 'immer';
import type { Character } from '../domain/model';
import type { Command } from '../domain/commands';
import { chapterTitle, generationTitle, quests } from '../domain/quests/catalog';
import { questCategories, questNpcs, type QuestNpc } from '../domain/quests/types';
import {
    currentObjectives,
    objectiveCount,
    pendingCount,
    questReady,
    rewardLabels,
} from '../domain/quests/system';
import { GameWindow } from './windows/GameWindow';
import { items } from '../domain/catalog';

type Props = {
    character: Immutable<Character>;
    disabled: boolean;
    send: (command: Command) => void;
};
const statusText = {
    available: 'Available from NPC',
    active: 'In progress',
    ready: 'Ready to complete',
    completed: 'Completed',
};

function QuestObjectives({ character: c, id }: { character: Immutable<Character>; id: string }) {
    return (
        <ul className="space-y-1 text-sm text-muted">
            {currentObjectives(c, id).map((o) => {
                const pending = pendingCount(c, id, o);
                return (
                    <li key={o.id}>
                        {o.label}: {objectiveCount(c, id, o)} / {o.target}
                        {pending > 0 ? ` (+${pending} this run)` : ''}
                    </li>
                );
            })}
        </ul>
    );
}
function TrackButton({ character: c, id, disabled, send }: Props & { id: string }) {
    const tracked = c.quests.tracked.includes(id);
    const full = !tracked && c.quests.tracked.length >= 3;
    return (
        <Button
            size="sm"
            variant="secondary"
            isDisabled={disabled || full}
            aria-label={`${tracked ? 'Untrack' : 'Track'} ${quests[id].title}`}
            onPress={() => send({ type: 'TRACK_QUEST', quest: id, tracked: !tracked })}
        >
            {tracked ? 'Untrack' : full ? '3 quests tracked' : 'Track'}
        </Button>
    );
}
export function QuestJournal({
    character: c,
    disabled,
    send,
    selected,
    onSelect,
}: Props & { selected: string | null; onSelect: (id: string | null) => void }) {
    const [tab, setTab] = useState<string>(() =>
        selected ? quests[selected].category : 'Mainstream Quests',
    );
    const [completed, setCompleted] = useState(false);
    const opener = useRef<HTMLElement | null>(null);
    const entries = Object.values(quests).filter(
        (q) =>
            c.quests.records[q.id] &&
            q.category === tab &&
            (c.quests.records[q.id].status === 'completed') === completed,
    );
    const town = !c.run && !c.rp;
    const detail = selected && c.quests.records[selected] ? quests[selected] : null;
    const detailRecord = detail ? c.quests.records[detail.id] : null;
    const deliveryNpc = detail
        ? currentObjectives(c, detail.id).find((o) => o.kind === 'deliver')
        : undefined;
    return (
        <section aria-label="Quest journal" className="space-y-4">
            <div className="flex items-center justify-between gap-2">
                <div className="flex gap-1" aria-label="Quest history">
                    <Button
                        size="sm"
                        variant={!completed ? 'primary' : 'secondary'}
                        aria-pressed={!completed}
                        onPress={() => setCompleted(false)}
                    >
                        Current
                    </Button>
                    <Button
                        size="sm"
                        variant={completed ? 'primary' : 'secondary'}
                        aria-pressed={completed}
                        onPress={() => setCompleted(true)}
                    >
                        Completed
                    </Button>
                </div>
                <span className="text-xs text-muted">{c.quests.tracked.length} / 3 tracked</span>
            </div>
            <Tabs selectedKey={tab} onSelectionChange={(key) => setTab(String(key))}>
                <Tabs.ListContainer className="max-w-full overflow-x-auto">
                    <Tabs.List aria-label="Quest categories">
                        {questCategories.map((category) => (
                            <Tabs.Tab key={category} id={category} className="shrink-0 text-xs">
                                {category}
                                <Tabs.Indicator />
                            </Tabs.Tab>
                        ))}
                    </Tabs.List>
                </Tabs.ListContainer>
                {questCategories.map((category) => (
                    <Tabs.Panel id={category} key={category}>
                        {category === tab && (
                            <div className="space-y-3 pt-3">
                                {category === 'Mainstream Quests' && (
                                    <div className="text-sm">
                                        <h3>{chapterTitle}</h3>
                                        <p className="text-xs text-muted">
                                            {generationTitle}
                                            {c.quests.generations.includes('broken-seal')
                                                ? ' · Completed'
                                                : ''}
                                        </p>
                                    </div>
                                )}
                                {entries.length ? (
                                    <div role="list" aria-label="Quests" className="space-y-3">
                                        {entries.map((q) => {
                                            const record = c.quests.records[q.id];
                                            return (
                                                <Card
                                                    key={q.id}
                                                    role="listitem"
                                                    variant="secondary"
                                                    className="space-y-2 p-3"
                                                >
                                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                                        <Button
                                                            variant="ghost"
                                                            className="h-auto max-w-full justify-start whitespace-normal p-0 text-left font-semibold"
                                                            onPress={(event) => {
                                                                opener.current =
                                                                    event.target as HTMLElement;
                                                                onSelect(q.id);
                                                            }}
                                                        >
                                                            {q.title}
                                                        </Button>
                                                        <span className="text-xs text-muted">
                                                            {statusText[record.status]}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm">{q.description}</p>
                                                    {record.status === 'available' &&
                                                    q.delivery.kind === 'npc' ? (
                                                        <p className="text-xs text-muted">
                                                            Speak with {questNpcs[q.delivery.npc]}{' '}
                                                            to accept.
                                                        </p>
                                                    ) : (
                                                        <QuestObjectives character={c} id={q.id} />
                                                    )}
                                                    {['active', 'ready'].includes(
                                                        record.status,
                                                    ) && (
                                                        <TrackButton
                                                            character={c}
                                                            id={q.id}
                                                            disabled={disabled}
                                                            send={send}
                                                        />
                                                    )}
                                                </Card>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <p className="py-8 text-center text-sm text-muted">
                                        No {completed ? 'completed' : 'current'} quests in this
                                        category.
                                    </p>
                                )}
                            </div>
                        )}
                    </Tabs.Panel>
                ))}
            </Tabs>
            {c.quests.overflow.length > 0 && (
                <section aria-label="Uncollected quest rewards" className="space-y-2 border-t pt-3">
                    <h3>Uncollected rewards</h3>
                    <p className="text-xs text-muted">
                        Saved safely until there is space in your backpack.
                    </p>
                    {c.quests.overflow.map((i) => (
                        <div key={i.id} className="flex items-center justify-between gap-2">
                            <span>
                                {i.count} × {items[i.kind].name}
                            </span>
                            <Button
                                size="sm"
                                isDisabled={disabled || !town}
                                onPress={() => send({ type: 'WITHDRAW_QUEST_REWARD', id: i.id })}
                            >
                                Withdraw
                            </Button>
                        </div>
                    ))}
                </section>
            )}
            {detail && detailRecord && (
                <GameWindow
                    id="quests-detail"
                    title={detail.title}
                    open
                    onClose={() => onSelect(null)}
                    getOpener={() => opener.current}
                >
                    <div className="space-y-4 text-sm">
                        <p className="text-xs text-muted">
                            {detail.category} · {statusText[detailRecord.status]}
                            {detail.id === 'arens-expedition' ? ' · RP mission' : ''}
                        </p>
                        <p>{detail.description}</p>
                        <section aria-label="Quest notes" className="space-y-2">
                            <h3>Notes</h3>
                            <p>{detail.notes}</p>
                            <p className="text-muted">{detail.stages[detailRecord.stage].notes}</p>
                        </section>
                        <section className="space-y-2">
                            <h3>
                                Objectives · Stage {detailRecord.stage + 1} / {detail.stages.length}
                            </h3>
                            <QuestObjectives character={c} id={detail.id} />
                        </section>
                        <section aria-label="Quest rewards">
                            <h3>Rewards</h3>
                            <ul className="ml-5 list-disc space-y-1">
                                {rewardLabels(c, detail.id).map((label) => (
                                    <li key={label}>{label}</li>
                                ))}
                            </ul>
                        </section>
                        {detailRecord.status === 'available' && detail.delivery.kind === 'npc' && (
                            <p>Speak with {questNpcs[detail.delivery.npc]} to accept this quest.</p>
                        )}
                        {deliveryNpc?.kind === 'deliver' && detailRecord.status !== 'completed' && (
                            <p>
                                Complete this delivery with {questNpcs[deliveryNpc.npc]}. The listed
                                items will be consumed.
                            </p>
                        )}
                        {!town && (
                            <p className="text-muted">
                                Return to town to complete quests. Progress marked “this run” is
                                banked when you return.
                            </p>
                        )}
                        {['active', 'ready'].includes(detailRecord.status) && (
                            <div className="flex flex-wrap gap-2">
                                <TrackButton
                                    character={c}
                                    id={detail.id}
                                    disabled={disabled}
                                    send={send}
                                />
                                <Button
                                    isDisabled={
                                        disabled ||
                                        !town ||
                                        !!deliveryNpc ||
                                        !questReady(c, detail.id)
                                    }
                                    onPress={() =>
                                        send({ type: 'COMPLETE_QUEST', quest: detail.id })
                                    }
                                >
                                    Complete
                                </Button>
                            </div>
                        )}
                    </div>
                </GameWindow>
            )}
        </section>
    );
}

export function NpcQuests({
    character: c,
    disabled,
    send,
    npc,
    emptyMessage,
}: Props & { npc: string; emptyMessage?: string }) {
    if (!(npc in questNpcs))
        return emptyMessage ? <p className="text-sm text-muted">{emptyMessage}</p> : null;
    const npcId = npc as QuestNpc;
    const entries = Object.values(quests).filter((q) => {
        const r = c.quests.records[q.id];
        return (
            r &&
            r.status !== 'completed' &&
            (r.status === 'available'
                ? q.delivery.kind === 'npc' && q.delivery.npc === npc
                : currentObjectives(c, q.id).some(
                      (o) =>
                          ('npc' in o && o.npc === npc) || (o.kind === 'rp' && npc === 'Trainer'),
                  ))
        );
    });
    if (!entries.length)
        return emptyMessage ? <p className="text-sm text-muted">{emptyMessage}</p> : null;
    return (
        <section aria-label="NPC quests" className="mb-5 space-y-3 border-b pb-4">
            <h3>Quests</h3>
            {entries.map((q) => {
                const r = c.quests.records[q.id];
                const objectives = currentObjectives(c, q.id);
                return (
                    <Card key={q.id} variant="secondary" className="space-y-2 p-3">
                        <h4>{q.title}</h4>
                        <p className="text-sm">{q.stages[r.stage].notes}</p>
                        <ul className="ml-5 list-disc text-xs text-muted">
                            {rewardLabels(c, q.id).map((label) => (
                                <li key={label}>{label}</li>
                            ))}
                        </ul>
                        {r.status === 'available' ? (
                            <Button
                                size="sm"
                                isDisabled={disabled}
                                onPress={() =>
                                    send({ type: 'ACCEPT_QUEST', quest: q.id, npc: npcId })
                                }
                            >
                                Accept {q.title}
                            </Button>
                        ) : (
                            <>
                                <QuestObjectives character={c} id={q.id} />
                                {objectives
                                    .filter(
                                        (o) =>
                                            o.kind === 'talk' &&
                                            o.npc === npc &&
                                            objectiveCount(c, q.id, o) < o.target,
                                    )
                                    .map((o) => (
                                        <Button
                                            key={o.id}
                                            size="sm"
                                            isDisabled={disabled}
                                            onPress={() =>
                                                send({
                                                    type: 'QUEST_INTERACT',
                                                    quest: q.id,
                                                    step: o.id,
                                                    npc: npcId,
                                                })
                                            }
                                        >
                                            {o.label} · {q.title}
                                        </Button>
                                    ))}
                                {objectives.some((o) => o.kind === 'rp') && (
                                    <Button
                                        isDisabled={disabled || !!c.run || !!c.rp}
                                        onPress={() =>
                                            send({
                                                type: 'START_RP_MISSION',
                                                quest: q.id,
                                                npc: npcId,
                                            })
                                        }
                                    >
                                        Enter Aren’s memory
                                    </Button>
                                )}
                                <Button
                                    size="sm"
                                    isDisabled={disabled || !questReady(c, q.id)}
                                    onPress={() =>
                                        send({ type: 'COMPLETE_QUEST', quest: q.id, npc: npcId })
                                    }
                                >
                                    Complete {q.title}
                                </Button>
                            </>
                        )}
                    </Card>
                );
            })}
        </section>
    );
}

const narrowQuery = '(max-width: 640px)';
const subscribeNarrow = (notify: () => void) => {
    const media = window.matchMedia(narrowQuery);
    media.addEventListener('change', notify);
    return () => media.removeEventListener('change', notify);
};
const getNarrow = () => window.matchMedia(narrowQuery).matches;

export function QuestTracker({
    character: c,
    onOpen,
}: {
    character: Immutable<Character>;
    onOpen: (id: string) => void;
}) {
    const narrow = useSyncExternalStore(subscribeNarrow, getNarrow);
    const [expanded, setExpanded] = useState(false);
    if (!c.quests.tracked.length) return null;
    return (
        <details
            className="quest-tracker game-hud dark rounded-lg bg-overlay p-3 text-foreground"
            open={!narrow || expanded}
            onToggle={(event) => {
                if (narrow) setExpanded(event.currentTarget.open);
            }}
        >
            <summary className="cursor-pointer text-xs font-semibold">
                Tracked quests · {c.quests.tracked.length}/3
            </summary>
            <div className="mt-2 space-y-3">
                {c.quests.tracked.map((id) => (
                    <div key={id}>
                        <Button
                            size="sm"
                            variant="ghost"
                            className="h-auto max-w-full whitespace-normal p-0 text-left"
                            onPress={() => onOpen(id)}
                        >
                            {quests[id].title}
                        </Button>
                        <QuestObjectives character={c} id={id} />
                        {c.quests.records[id].status === 'ready' && (
                            <p className="text-xs text-success">Ready to complete in town</p>
                        )}
                    </div>
                ))}
            </div>
        </details>
    );
}