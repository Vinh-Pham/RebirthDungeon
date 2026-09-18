import { useState } from 'react';
import { Button, ProgressBar } from '@heroui/react';
import type { Immutable } from 'immer';
import type { Character } from '../domain/model';
import { skills, ranks, skillRank, trainingPoints } from '../domain/skillCatalog';
import { passiveDescription, requirementReason } from '../domain/skillSystem';
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
    const visibleSkills = Object.entries(skills).filter(([id]) => trainer || !!c.skills[id]);
    const selected = visibleSkills.some(([id]) => id === selection)
        ? selection
        : visibleSkills[0]?.[0];
    if (!selected) {
        return <section aria-label="Skill journal">No skills learned yet.</section>;
    }
    const skill = skills[selected],
        progress = c.skills[selected],
        rank = skillRank(selected, progress),
        index = ranks.indexOf(rank.rank);
    const points = progress ? trainingPoints(selected, progress) : 0,
        reason = requirementReason(c, selected);
    const town = !c.run;
    const effect = (r: number) =>
        skill.type === 'passive'
            ? passiveDescription(c, selected, r)
            : `${skill.effect === 'buff' ? 'Buff base' : 'Base'} ${skill.ranks[r].base} + ${skill.ranks[r].pip} per pip · ${skill.ranks[r].costs[skill.resource]} ${skill.resource} · cooldown ${skill.ranks[r].cooldown}${skill.effect === 'buff' ? ` · ${skill.ranks[r].duration} activations` : ''}`;
    const status = !progress
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
            <p>
                {c.name} · <strong>{c.ap} AP</strong> · Learn and advance in town. Earned training
                survives every dungeon outcome.
            </p>
            <div className="grid grid-cols-[180px_1fr] gap-5 narrow:grid-cols-1">
                <nav
                    aria-label="Skills"
                    className="flex max-h-96 flex-col gap-1 overflow-auto narrow:max-h-40"
                >
                    {visibleSkills.map(([id, s]) => (
                        <Button
                            key={id}
                            variant={id === selected ? 'primary' : 'secondary'}
                            className="justify-between text-xs"
                            onPress={() => setSelected(id)}
                        >
                            {s.name}
                            <span>{id === 'normal' ? 'Basic' : (c.skills[id]?.rank ?? '—')}</span>
                        </Button>
                    ))}
                </nav>
                <div className="space-y-3" data-testid="skill-detail">
                    <h3>
                        {skill.name}
                        {progress && selected !== 'normal' ? ` · Rank ${progress.rank}` : ''}
                    </h3>
                    <p className="text-xs uppercase tracking-wide">
                        {selected === 'ice' ? 'Magic' : 'Combat'} · {skill.type} · {status}
                    </p>
                    <p>{skill.description}</p>
                    <p>{effect(index)}</p>
                    {skill.type === 'passive' && progress && (
                        <p>
                            {selected === 'combatMastery' && reason
                                ? 'Max HP active; melee attack requires a melee action'
                                : reason || 'Active for eligible actions'}
                        </p>
                    )}
                    {skill.type === 'active' && (
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
                        {skill.route === 'starter'
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
