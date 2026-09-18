import type { Immutable } from 'immer';
import type { Character } from '../domain/model';
import { resolveStats } from '../domain/stats/resolve';
import { resourceState } from '../domain/stats/resources';
import { statLabels, isPercentage } from '../domain/stats/rules';
import { statIds } from '../domain/stats/types';
import { statusSummary } from '../domain/stats/statuses';
export function StatsPanel({ c }: { c: Immutable<Character> }) {
    const resolved = resolveStats(c);
    return (
        <section aria-label="Character stats" className="space-y-5">
            <p>
                {c.name} · {c.race} · {c.talent}
            </p>
            <h3>Resources</h3>
            {(['hp', 'mana', 'stamina'] as const).map((pool) => {
                const r = resourceState(c, pool);
                return (
                    <p key={pool}>
                        {pool === 'hp' ? 'HP' : pool === 'mana' ? 'MP' : 'SP'}: {r.current} /{' '}
                        {r.maximum} · {r.reserved} reserved · {r.available} available
                    </p>
                );
            })}
            <p>Shield: {c.effects.shield ?? 0}. Higher maxima do not restore resources.</p>
            <h3>Attributes and combat</h3>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                {statIds.map((id) => (
                    <div key={id} className="flex justify-between gap-3">
                        <dt>{statLabels[id]}</dt>
                        <dd>
                            {resolved.values[id]}
                            {isPercentage(id) ? '%' : ''}
                        </dd>
                    </div>
                ))}
            </dl>
            <p className="text-xs">
                Strength supplies melee attack and Defense; Intelligence supplies magic attack and
                Magic Protection; Dexterity supplies ranged attack; Will supplies Magic Defense.
                Luck has no hidden bonus.
            </p>
            <details>
                <summary>
                    Stat sources{c.run ? ' · frozen at run entry, plus active effects' : ''}
                </summary>
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
                                    {m.percentBp !== undefined ? ` ${m.percentBp / 100}%` : ''}
                                    ;{' '}
                                </span>
                            ))}
                        </p>
                        {(source.costs ?? []).map((m, i) => (
                            <p key={i}>
                                {m.pool} cost {m.skill ?? '(all skills)'}: {m.flat ?? 0} flat,{' '}
                                {(m.percentBp ?? 0) / 100}%
                            </p>
                        ))}
                    </div>
                ))}
            </details>
            <h3>Active effects</h3>
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
                <details key={status.definition.group}>
                    <summary>
                        {status.definition.icon} {statusSummary(status)}
                    </summary>
                    <p>
                        Group: {status.definition.group} · priority {status.definition.priority} ·{' '}
                        {status.definition.tags.join(', ')} ·{' '}
                        {status.definition.removable ? 'Removable' : 'Cannot be cleansed'}
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
                            .map((e) => `${e.kind} ${e.amount} ${e.pool} per completed activation`)
                            .join('; ')}
                    </p>
                    {(status.definition.costs ?? []).map((m, i) => (
                        <p key={i}>
                            {m.pool} cost {m.skill ?? '(all skills)'}: {m.flat ?? 0} flat,{' '}
                            {(m.percentBp ?? 0) / 100}%
                        </p>
                    ))}
                    <p>
                        Same effect refreshes; higher priority replaces; lower priority is ignored.
                    </p>
                    <p>
                        Duration advances after your actions in battle and pauses during
                        exploration.
                    </p>
                </details>
            ))}
        </section>
    );
}
