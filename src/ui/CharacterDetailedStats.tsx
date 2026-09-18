import { Accordion } from '@heroui/react';
import type { Immutable } from 'immer';
import type { Character } from '../domain/model';
import { resolveStats } from '../domain/stats/resolve';
import { statLabels } from '../domain/stats/rules';
import { statusSummary } from '../domain/stats/statuses';

export function DetailedStats({ c }: { c: Immutable<Character> }) {
    const resolved = resolveStats(c);
    return (
        <div className="space-y-4 text-sm text-foreground">
            <h3 className="font-sans text-sm font-semibold text-foreground">How Stats Work</h3>
            <p>Higher resource maxima do not restore current resources.</p>
            <p className="text-xs">
                Strength supplies melee attack and Defense; Intelligence supplies magic attack and
                Magic Protection; Dexterity supplies ranged attack; Will supplies Magic Defense.
                Luck has no hidden bonus.
            </p>
            <Accordion>
                <Accordion.Item>
                    <Accordion.Heading>
                        <Accordion.Trigger>
                            Stat sources{c.run ? ' · frozen at run entry, plus active effects' : ''}
                            <Accordion.Indicator />
                        </Accordion.Trigger>
                    </Accordion.Heading>
                    <Accordion.Panel>
                        <Accordion.Body>
                            <p className="my-2 text-sm">
                                Starting profile and current-life growth:{' '}
                                {Object.entries(resolved.base)
                                    .map(([id, value]) => `${id.toUpperCase()} ${value}`)
                                    .join(' · ')}
                            </p>
                            {resolved.sources.map((source) => (
                                <div key={source.id} className="my-3 text-sm">
                                    <strong>{source.name}</strong> · {source.kind}
                                    <p>
                                        {source.modifiers.map((m, i) => (
                                            <span key={i}>
                                                {statLabels[m.stat]}{' '}
                                                {m.flat !== undefined
                                                    ? `${m.flat >= 0 ? '+' : ''}${m.flat}`
                                                    : ''}
                                                {m.percentBp !== undefined
                                                    ? ` ${m.percentBp / 100}%`
                                                    : ''}
                                                ;{' '}
                                            </span>
                                        ))}
                                    </p>
                                    {(source.costs ?? []).map((m, i) => (
                                        <p key={i}>
                                            {m.pool} cost {m.skill ?? '(all skills)'}: {m.flat ?? 0}{' '}
                                            flat, {(m.percentBp ?? 0) / 100}%
                                        </p>
                                    ))}
                                </div>
                            ))}
                        </Accordion.Body>
                    </Accordion.Panel>
                </Accordion.Item>
            </Accordion>
            <h3 className="font-sans text-sm font-semibold">Active Effects</h3>
            {c.effects.final && (
                <p>
                    Final Hit: +{c.effects.final.magnitude} melee attack ·{' '}
                    {c.effects.final.remaining} activations remaining.
                </p>
            )}
            {c.effects.manaShield && (
                <p>
                    Mana Shield: {c.effects.manaShield.remaining} enemy responses remaining ·{' '}
                    {c.effects.manaShield.efficiency} damage absorbed per MP ·{' '}
                    {c.effects.manaShield.upkeep} MP upkeep.
                </p>
            )}
            {c.effects.counter && <p>Counterattack prepared for an incoming melee attack.</p>}
            {!c.statuses.length && <p>No timed effects.</p>}
            {c.statuses.map((status) => (
                <Accordion key={status.definition.group}>
                    <Accordion.Item>
                        <Accordion.Heading>
                            <Accordion.Trigger>
                                {statusSummary(status)}
                                <Accordion.Indicator />
                            </Accordion.Trigger>
                        </Accordion.Heading>
                        <Accordion.Panel>
                            <Accordion.Body>
                                <p>
                                    Group: {status.definition.group} · priority{' '}
                                    {status.definition.priority} ·{' '}
                                    {status.definition.tags.join(', ')} ·{' '}
                                    {status.definition.removable
                                        ? 'Removable'
                                        : 'Cannot be cleansed'}
                                </p>
                                <p>
                                    {status.definition.modifiers
                                        .map(
                                            (m) =>
                                                `${statLabels[m.stat]} ${m.flat ?? 0} flat, ${(m.percentBp ?? 0) / 100}%`,
                                        )
                                        .join('; ')}
                                </p>
                                <p>
                                    {(status.definition.periodic ?? [])
                                        .map(
                                            (e) =>
                                                `${e.kind} ${e.amount} ${e.pool} per completed activation`,
                                        )
                                        .join('; ')}
                                </p>
                                {(status.definition.costs ?? []).map((m, i) => (
                                    <p key={i}>
                                        {m.pool} cost {m.skill ?? '(all skills)'}: {m.flat ?? 0}{' '}
                                        flat, {(m.percentBp ?? 0) / 100}%
                                    </p>
                                ))}
                                <p>
                                    Same effect refreshes; higher priority replaces; lower priority
                                    is ignored.
                                </p>
                                <p>
                                    Duration advances after your actions in battle and pauses during
                                    exploration.
                                </p>
                            </Accordion.Body>
                        </Accordion.Panel>
                    </Accordion.Item>
                </Accordion>
            ))}
        </div>
    );
}
