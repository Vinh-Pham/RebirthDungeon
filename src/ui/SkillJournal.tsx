import { useState } from 'react';
import { Button, ProgressBar } from '@heroui/react';
import type { Immutable } from 'immer';
import type { Character } from '../domain/model';
import { skills, ranks, skillRank, trainingPoints } from '../domain/skillCatalog';
import { passiveDescription, requirementReason, actionCosts } from '../domain/skillSystem';
import type { Command } from '../domain/commands';
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
    const [selection, setSelected] = useState('smash');
    const [query, setQuery] = useState('');
    const [category, setCategory] = useState('All');
    const [inspectedRank, setInspectedRank] = useState('F');
    const visibleSkills = Object.entries(skills).filter(
        ([, skill]) =>
            (category === 'All' || (skill.category ?? 'Combat') === category) &&
            skill.name.toLowerCase().includes(query.trim().toLowerCase()),
    );
    const selected = visibleSkills.some(([id]) => id === selection)
        ? selection
        : visibleSkills[0]?.[0];
    const filters = (
        <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-1 flex-col gap-1 text-sm">
                Search skills
                <input
                    className="rounded border p-2"
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Find a skill…"
                />
            </label>
            <label className="flex flex-col gap-1 text-sm">
                Category
                <select
                    className="rounded border p-2"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                >
                    {['All', 'Combat', 'Magic', 'Life'].map((value) => (
                        <option key={value}>{value}</option>
                    ))}
                </select>
            </label>
            <span className="text-xs">
                {visibleSkills.length} / {Object.keys(skills).length} skills
            </span>
        </div>
    );
    if (!selected)
        return (
            <section aria-label="Skill journal" className="space-y-4">
                {filters}
                <p>No skills match your search.</p>
            </section>
        );
    const skill = skills[selected],
        progress = c.skills[selected],
        rank = skillRank(selected, progress, c.race),
        index = ranks.indexOf(rank.rank);
    const points = progress ? trainingPoints(selected, progress) : 0,
        reason = requirementReason(c, selected);
    const town = !c.run;
    const effect = (r: number) => {
        const value = skillRank(selected, { rank: ranks[r] }, c.race);
        const costs = actionCosts(c, selected, value);
        if (skill.route === 'reference') return skill.adaptation;
        if (skill.type === 'passive') return passiveDescription(c, selected, r);
        const power =
            skill.effect === 'attack' || skill.effect === 'counter'
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
        return `${power} · ${costs[skill.resource]} ${skill.resource} · cooldown ${value.cooldown} turns`;
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
        <section aria-label="Skill journal" className="space-y-4">
            {filters}
            <p>
                {c.name} · <strong>{c.ap} AP</strong> · Learn and advance in town. Earned training
                survives every dungeon outcome.
            </p>
            <div className="grid grid-cols-[220px_minmax(0,1fr)] gap-5 narrow:grid-cols-1">
                <nav
                    aria-label="Skills"
                    className="flex max-h-96 flex-col gap-1 overflow-auto narrow:max-h-40"
                >
                    {visibleSkills.map(([id, s]) => (
                        <Button
                            key={id}
                            variant={id === selected ? 'primary' : 'secondary'}
                            className="h-auto min-h-12 justify-between px-2 py-2 text-xs"
                            aria-pressed={id === selected}
                            onPress={() => setSelected(id)}
                        >
                            <span className="flex items-center gap-2 text-left">
                                {s.icon.startsWith('/') ? (
                                    <img
                                        src={s.icon}
                                        alt=""
                                        width={32}
                                        height={32}
                                        className="shrink-0 rounded"
                                        loading="lazy"
                                    />
                                ) : (
                                    <span aria-hidden="true">{s.icon}</span>
                                )}
                                {s.name}
                            </span>
                            <span>{id === 'normal' ? 'Basic' : (c.skills[id]?.rank ?? '—')}</span>
                        </Button>
                    ))}
                </nav>
                <div className="space-y-3" data-testid="skill-detail">
                    <h3 className="flex items-center gap-3">
                        {skill.icon.startsWith('/') && (
                            <img
                                src={skill.icon}
                                alt=""
                                data-testid="skill-icon"
                                width={56}
                                height={56}
                                className="rounded"
                            />
                        )}
                        {skill.name}
                        {progress && selected !== 'normal' ? ` · Rank ${progress.rank}` : ''}
                    </h3>
                    <p className="text-xs uppercase tracking-wide">
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
                        <section
                            aria-label="Wiki rank statistics"
                            className="space-y-2 rounded border p-3"
                        >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <h4>Mabinogi Wiki stats</h4>
                                {!skill.wiki.unavailable && (
                                    <label className="text-sm">
                                        Inspect rank{' '}
                                        <select
                                            aria-label="Inspect wiki rank"
                                            className="rounded border p-1"
                                            value={inspectedRank}
                                            onChange={(e) => setInspectedRank(e.target.value)}
                                        >
                                            {ranks.map((value) => (
                                                <option key={value}>{value}</option>
                                            ))}
                                        </select>
                                    </label>
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
                                        Original wiki values, including race differences. AP shown
                                        here is the cost to reach the inspected rank. Seconds and
                                        percentages retain their wiki units.
                                    </p>
                                    <div className="max-h-72 overflow-auto">
                                        <table className="w-full text-left text-xs">
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
                                                    <tr
                                                        key={`${row.label}-${i}`}
                                                        className="border-t"
                                                    >
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
                            <ProgressBar
                                aria-label="Training progress"
                                value={Math.min(100, points)}
                            >
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
                                Missing pages: Alby encounter rewards or General Shop. Insert pages
                                from Inventory while in town.
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
            </div>
        </section>
    );
}
