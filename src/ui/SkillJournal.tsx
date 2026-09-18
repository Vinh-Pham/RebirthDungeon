import { costDescription } from '../domain/stats/resources';
import { useState } from 'react';
import { GameModal } from './GameModal';
import { Button, Card, ProgressBar, Tabs, Select, ListBox, Tooltip } from '@heroui/react';
import type { Immutable } from 'immer';
import type { Character } from '../domain/model';
import { skills, ranks, skillRank, trainingPoints, type Skill } from '../domain/skillCatalog';
import {
    passiveDescription,
    requirementReason,
    actionCosts,
    outsideBattleReason,
} from '../domain/skillSystem';
import type { Command } from '../domain/commands';
const categories = [
    'All',
    ...['Life', 'Combat', 'Magic'].filter((value) =>
        Object.values(skills).some((s) => (s.category ?? 'Combat') === value),
    ),
];
export function SkillJournal({
    character: c,
    disabled,
    trainer = false,
    send,
}: {
    character: Immutable<Character>;
    disabled: boolean;
    trainer?: boolean;
    send: (command: Command) => void;
}) {
    const [selection, setSelected] = useState<string | null>(null);
    const [tab, setTab] = useState('All');
    const town = !c.run;
    const visibleSkills = Object.entries(skills).filter(
        ([id, skill]) =>
            // The skill window lists learned skills; the trainer keeps the full catalog browsable.
            (trainer || !!c.skills[id]) && (tab === 'All' || (skill.category ?? 'Combat') === tab),
    );
    const guarded = (
        label: string,
        reason: string,
        onPress: (() => void) | undefined,
        variant: 'primary' | 'secondary' = 'secondary',
    ) => {
        const button = (
            <Button
                variant={variant}
                size="sm"
                className="w-[76px] px-1"
                isDisabled={disabled || !!reason || !onPress}
                onPress={onPress}
            >
                {label}
            </Button>
        );
        return reason ? (
            <Tooltip>
                <Tooltip.Trigger
                    tabIndex={0}
                    aria-label={`${label}: ${reason}`}
                    className="inline-flex"
                >
                    {button}
                </Tooltip.Trigger>
                <Tooltip.Content>{reason}</Tooltip.Content>
            </Tooltip>
        ) : (
            button
        );
    };
    const row = ([id, s]: [string, Skill]) => {
        const progress = c.skills[id],
            rank = skillRank(id, progress, c.race),
            points = progress ? trainingPoints(id, progress) : 0;
        const trainable = !!progress && id !== 'normal' && ranks.indexOf(rank.rank) < 14;
        const passive = s.type === 'passive' || s.route === 'reference';
        return (
            <Card
                variant="secondary"
                key={id}
                role="listitem"
                data-testid={`skill-row-${id}`}
                className="skill-card flex flex-row items-center gap-4 p-4 narrow:flex-wrap narrow:gap-3"
            >
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto min-w-0 flex-1 justify-start p-0 text-sm narrow:basis-full"
                    aria-haspopup="dialog"
                    onPress={() => setSelected(id)}
                >
                    <span className="flex min-w-0 items-center gap-2">
                        {s.icon.startsWith('/') ? (
                            <img
                                src={s.icon}
                                alt=""
                                width={40}
                                height={40}
                                className="shrink-0 rounded"
                                loading="lazy"
                            />
                        ) : (
                            <span
                                aria-hidden="true"
                                className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-default text-sm font-semibold text-muted"
                            >
                                {s.name
                                    .split(' ')
                                    .map((word) => word[0])
                                    .join('')
                                    .slice(0, 2)}
                            </span>
                        )}
                        <span className="whitespace-normal text-left">{s.name}</span>
                    </span>
                </Button>
                {passive
                    ? guarded('Passive', 'Passive skills apply automatically.', undefined)
                    : guarded('Use', outsideBattleReason(c, id), () =>
                          send({ type: 'USE_SKILL', skill: id }),
                      )}
                <div className="flex w-32 shrink-0 flex-col items-end gap-2 text-xs tabular-nums narrow:ml-auto">
                    <span>
                        {id === 'normal'
                            ? 'Basic'
                            : progress
                              ? `Rank ${progress.rank}`
                              : 'Not learned'}
                    </span>
                    {trainable && (
                        <ProgressBar
                            aria-label={`${s.name} training`}
                            size="sm"
                            value={Math.min(100, points)}
                        >
                            <ProgressBar.Track>
                                <ProgressBar.Fill />
                            </ProgressBar.Track>
                        </ProgressBar>
                    )}
                    {trainable &&
                        points >= 100 &&
                        guarded(
                            'Advance',
                            !town
                                ? 'Return to town to advance.'
                                : c.ap < rank.ap
                                  ? `Requires ${rank.ap} AP.`
                                  : '',
                            () => send({ type: 'RANK_UP', skill: id }),
                            'primary',
                        )}
                </div>
            </Card>
        );
    };
    const browser = (
        <Tabs
            variant="secondary"
            selectedKey={tab}
            onSelectionChange={(key) => setTab(String(key))}
        >
            <Tabs.ListContainer>
                <Tabs.List aria-label="Skill groups">
                    {categories.map((value) => (
                        <Tabs.Tab key={value} id={value} className="text-xs">
                            {value}
                            <Tabs.Indicator />
                        </Tabs.Tab>
                    ))}
                </Tabs.List>
            </Tabs.ListContainer>
            {categories.map((value) => (
                <Tabs.Panel key={value} id={value}>
                    {value === tab &&
                        (visibleSkills.length ? (
                            <div
                                role="list"
                                aria-label="Skills"
                                className="flex max-h-[55dvh] flex-col gap-3 overflow-auto p-1"
                            >
                                {visibleSkills.map(row)}
                            </div>
                        ) : (
                            <p className="py-8 text-center text-sm text-muted">
                                No learned skills in this category.
                            </p>
                        ))}
                </Tabs.Panel>
            ))}
        </Tabs>
    );
    return (
        <section aria-label="Skill journal">
            {browser}
            {selection && (
                <SkillDetails
                    key={selection}
                    selected={selection}
                    character={c}
                    disabled={disabled}
                    trainer={trainer}
                    send={send}
                    onClose={() => setSelected(null)}
                />
            )}
        </section>
    );
}

function SkillDetails({
    selected,
    character: c,
    disabled,
    trainer,
    send,
    onClose,
}: {
    selected: string;
    character: Immutable<Character>;
    disabled: boolean;
    trainer: boolean;
    send: (command: Command) => void;
    onClose: () => void;
}) {
    const [inspectedRank, setInspectedRank] = useState('F');
    const town = !c.run;
    const skill = skills[selected],
        progress = c.skills[selected],
        rank = skillRank(selected, progress, c.race),
        index = ranks.indexOf(rank.rank);
    const points = progress ? trainingPoints(selected, progress) : 0,
        reason = requirementReason(c, selected);
    const effect = (r: number) => {
        const value = skillRank(selected, { rank: ranks[r] }, c.race);
        const costs = actionCosts(c, selected, value);
        if (skill.route === 'reference') return skill.adaptation;
        if (skill.type === 'passive') return passiveDescription(c, selected, r);
        const power =
            skill.effect === 'status'
                ? skill.description
                : skill.effect === 'attack' || skill.effect === 'counter'
                  ? `${value.attackMultiplier !== undefined ? `${(value.attackMultiplier * 100).toFixed(1)}% attack · ` : ''}Base ${value.base} + ${value.pip} per pip`
                  : skill.effect === 'heal'
                    ? `Restore at least ${value.base * 5} HP, multiplied by the dice combination`
                    : skill.effect === 'restoreMana'
                      ? `Restore ${value.base}% maximum mana`
                      : skill.effect === 'defend'
                        ? `+${value.base} defense for the next enemy response`
                        : skill.effect === 'manaShield'
                          ? `${value.base} damage absorbed per MP · 3 enemy responses`
                          : `Buff base ${value.base} + ${value.pip} per pip · ${value.duration} activations`;
        return `${power} · ${costDescription(costs)} · cooldown ${value.cooldown} turns`;
    };
    const status =
        skill.route === 'reference'
            ? skill.wiki?.unavailable
                ? 'Unverified'
                : 'Reference only'
            : !progress
              ? 'Not learned'
              : selected === 'normal'
                ? 'Always available'
                : index === 14
                  ? 'Max Rank'
                  : points < 100
                    ? 'Training in progress'
                    : c.ap < rank.ap
                      ? 'Training complete, insufficient AP'
                      : 'Ready to advance';
    return (
        <GameModal
            onClose={onClose}
            title={
                <span className="flex items-center gap-3">
                    {skill.icon.startsWith('/') && (
                        <img
                            src={skill.icon}
                            alt=""
                            data-testid="skill-icon"
                            width={48}
                            height={48}
                            className="rounded-lg"
                        />
                    )}
                    <span>
                        {skill.name}
                        {progress && selected !== 'normal' ? ` · Rank ${progress.rank}` : ''}
                    </span>
                </span>
            }
        >
            <div className="space-y-4 text-sm" data-testid="skill-detail">
                <p className="text-xs text-muted">
                    {skill.category ?? 'Combat'} ·{' '}
                    {skill.route === 'reference' ? 'Catalog' : skill.type} · {status}
                </p>
                <p>{skill.description}</p>
                <p>{effect(index)}</p>
                {skill.adaptation && skill.route !== 'reference' && (
                    <p className="text-xs">
                        <strong>In this game:</strong> {skill.adaptation}
                    </p>
                )}
                {skill.wiki && (
                    <section aria-label="Wiki rank statistics" className="space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <h4>Mabinogi Wiki stats</h4>
                            {!skill.wiki.unavailable && (
                                <Select
                                    aria-label="Inspect wiki rank"
                                    className="w-32"
                                    variant="secondary"
                                    value={inspectedRank}
                                    onChange={(value) => setInspectedRank(String(value))}
                                >
                                    <Select.Trigger>
                                        <Select.Value />
                                        <Select.Indicator />
                                    </Select.Trigger>
                                    <Select.Popover className="dark">
                                        <ListBox>
                                            {ranks.map((value) => (
                                                <ListBox.Item
                                                    key={value}
                                                    id={value}
                                                    textValue={`Rank ${value}`}
                                                >
                                                    Rank {value}
                                                    <ListBox.ItemIndicator />
                                                </ListBox.Item>
                                            ))}
                                        </ListBox>
                                    </Select.Popover>
                                </Select>
                            )}
                        </div>
                        <p className="text-xs">
                            <a
                                href={skill.wiki.url}
                                target="_blank"
                                rel="noreferrer"
                                className="underline"
                            >
                                Source: Mabinogi World Wiki
                            </a>{' '}
                            · Retrieved {skill.wiki.retrievedAt}
                            {skill.wiki.additionalUrls?.map((url) => (
                                <a
                                    className="ml-2 underline"
                                    key={url}
                                    href={url}
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    Elf reference
                                </a>
                            ))}
                        </p>
                        {skill.wiki.unavailable ? (
                            <p>{skill.wiki.unavailable}</p>
                        ) : (
                            <>
                                <p className="text-xs">
                                    Original wiki values, including race differences. AP shown here
                                    is the cost to reach the inspected rank. Seconds and percentages
                                    retain their wiki units.
                                </p>
                                <div className="max-h-72 overflow-auto">
                                    <table className="w-full text-left text-xs tabular-nums">
                                        <caption className="sr-only">
                                            {skill.name} · Wiki rank {inspectedRank}
                                        </caption>
                                        <thead>
                                            <tr>
                                                <th className="p-2">Stat</th>
                                                <th className="p-2">Rank {inspectedRank}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {skill.wiki.rows.map((row, i) => (
                                                <tr key={`${row.label}-${i}`} className="border-t">
                                                    <th scope="row" className="p-2 font-normal">
                                                        {row.label}
                                                    </th>
                                                    <td className="p-2">
                                                        {
                                                            row.values[
                                                                ranks.indexOf(
                                                                    inspectedRank as (typeof ranks)[number],
                                                                )
                                                            ]
                                                        }
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}
                    </section>
                )}
                {skill.type === 'passive' && progress && (
                    <p>
                        {selected === 'combatMastery' && reason
                            ? 'Max HP active; melee attack requires a melee action'
                            : reason || 'Active for eligible actions'}
                    </p>
                )}
                {skill.type === 'active' && skill.route !== 'reference' && (
                    <p className="text-xs">
                        Faces 1–6:{' '}
                        {rank.weights
                            .map(
                                (w) =>
                                    `${((100 * w) / rank.weights.reduce((a, b) => a + b, 0)).toFixed(1)}%`,
                            )
                            .join(' / ')}
                        . {reason}
                    </p>
                )}
                <p className="text-sm">
                    {skill.route === 'reference'
                        ? 'Catalog reference only; learning and gameplay are unavailable.'
                        : skill.route === 'starter'
                          ? 'Known at creation'
                          : skill.route === 'lesson'
                            ? 'Free lesson from the trainer beside the Blacksmith'
                            : skill.route === 'book'
                              ? 'Read the Critical Hit manual · General Shop · 60 gold'
                              : 'Assemble five Final Hit pages in the incomplete manual, then read it. Book and pages: General Shop, 30 gold each; pages also drop from Alby encounters.'}
                </p>
                {!progress &&
                    skill.route === 'lesson' &&
                    (trainer ? (
                        <Button
                            isDisabled={disabled || !town || !!reason}
                            onPress={() => send({ type: 'LEARN', skill: selected })}
                        >
                            Learn {skill.name}
                        </Button>
                    ) : (
                        <p>Visit the trainer to learn this skill.</p>
                    ))}
                {progress && selected !== 'normal' && index < 14 && (
                    <>
                        <ProgressBar aria-label="Training progress" value={Math.min(100, points)}>
                            <ProgressBar.Track>
                                <ProgressBar.Fill />
                            </ProgressBar.Track>
                        </ProgressBar>
                        <p>{points} / 100 training points</p>
                        <ul className="space-y-1 text-sm">
                            {rank.objectives.map((o) => (
                                <li key={o.id}>
                                    {o.label}: {progress.counts[o.id] ?? 0}/{o.cap} · {o.points}{' '}
                                    points each
                                </li>
                            ))}
                        </ul>
                        <p>
                            Next: Rank {ranks[index + 1]} · {rank.ap} AP
                            <br />
                            {effect(index + 1)}
                        </p>
                        <Button
                            isDisabled={disabled || !town || points < 100 || c.ap < rank.ap}
                            onPress={() => send({ type: 'RANK_UP', skill: selected })}
                        >
                            Rank up {skill.name}
                        </Button>
                    </>
                )}
                {selected === 'final' && (
                    <div className="space-y-2">
                        <p>Collection: {c.collection.length}/5 pages inserted</p>
                        <div className="flex gap-2">
                            {[1, 2, 3, 4, 5].map((p) => (
                                <span className="rounded border p-2" key={p}>
                                    {c.collection.includes(p) ? '✓' : p}
                                </span>
                            ))}
                        </div>
                        <p className="text-xs">
                            Missing pages: Alby encounter rewards or General Shop. Insert pages from
                            Inventory while in town.
                        </p>
                    </div>
                )}
                {!town && (
                    <p>
                        Return to town to learn, read, assemble, or advance. This run keeps its
                        starting ranks and equipment.
                    </p>
                )}
            </div>
        </GameModal>
    );
}
