import { useState, type ReactNode } from 'react';
import { Accordion, Button, Card, ProgressBar, Tabs } from '@heroui/react';
import { xpNeeded } from '../domain/progression';
import type { Immutable } from 'immer';
import type { Character } from '../domain/model';
import { resolveStats } from '../domain/stats/resolve';
import { resourceState } from '../domain/stats/resources';
import { statLabels, isPercentage } from '../domain/stats/rules';
import type { StatId } from '../domain/stats/types';
import { statusSummary } from '../domain/stats/statuses';
function DetailedStats({ c }: { c: Immutable<Character> }) {
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

function InfoRow({ label, value }: { label: string; value: string | number }) {
    return (
        <div className="flex min-w-0 items-baseline justify-between gap-4 text-sm">
            <dt className="text-muted">{label}</dt>
            <dd className="min-w-0 text-right font-medium text-foreground tabular-nums break-words">
                {value}
            </dd>
        </div>
    );
}

function StatGroup({ title, children }: { title: string; children: ReactNode }) {
    return (
        <Card variant="secondary" className="min-w-0 gap-3 p-4 shadow-none">
            <Card.Header className="p-0">
                <Card.Title className="font-sans text-sm font-semibold">{title}</Card.Title>
            </Card.Header>
            <Card.Content className="space-y-3">{children}</Card.Content>
        </Card>
    );
}

function CharacterMeter({
    label,
    value,
    maximum,
    output,
    reserved = 0,
}: {
    label: string;
    value: number;
    maximum: number;
    output?: string;
    reserved?: number;
}) {
    return (
        <ProgressBar
            data-resource={label === 'Stamina' ? 'SP' : label}
            aria-label={label}
            value={value}
            maxValue={maximum || 1}
            size="sm"
            valueLabel={output ?? `${value} of ${maximum}, ${reserved} reserved`}
        >
            <span className="text-xs text-muted">{label}</span>
            <ProgressBar.Output className="text-xs text-foreground tabular-nums">
                {output ?? `${Math.ceil(value)} / ${maximum}`}
            </ProgressBar.Output>
            <ProgressBar.Track>
                <ProgressBar.Fill />
            </ProgressBar.Track>
        </ProgressBar>
    );
}

export function StatsPanel({ c }: { c: Immutable<Character> }) {
    const [tab, setTab] = useState('basic');
    const { values } = resolveStats(c);
    const stats = (ids: StatId[]) => (
        <dl className="space-y-2">
            {ids.map((id) => (
                <InfoRow
                    key={id}
                    label={statLabels[id]}
                    value={`${values[id]}${isPercentage(id) ? '%' : ''}`}
                />
            ))}
        </dl>
    );
    const panelClassName = 'max-h-[55dvh] space-y-4 overflow-auto p-1';
    return (
        <section aria-label="Character stats" className="character-stats">
            <Tabs selectedKey={tab} onSelectionChange={(key) => setTab(String(key))}>
                <Tabs.ListContainer>
                    <Tabs.List aria-label="Character information">
                        {[
                            ['basic', 'Basic Info'],
                            ['additional', 'Additional Info'],
                            ['jobs', 'Part-Time Job'],
                        ].map(([id, label]) => (
                            <Tabs.Tab key={id} id={id} className="text-xs">
                                {label}
                                <Tabs.Indicator />
                            </Tabs.Tab>
                        ))}
                    </Tabs.List>
                </Tabs.ListContainer>
                <Tabs.Panel id="basic" className={panelClassName}>
                    <div className="space-y-4">
                        <div>
                            <h3 className="font-sans text-lg font-semibold text-foreground break-words">
                                {c.name}
                            </h3>
                            <p className="text-sm">
                                {c.race} · {c.age} years old · {c.talent}
                            </p>
                        </div>
                        <dl className="grid grid-cols-2 gap-4 narrow:grid-cols-1 narrow:gap-2">
                            <InfoRow label="Title" value={c.titleModifiers.first?.name ?? 'None'} />
                            <InfoRow
                                label="Second Title"
                                value={c.titleModifiers.second?.name ?? 'None'}
                            />
                        </dl>
                    </div>
                    <div className="grid grid-cols-2 items-start gap-3 narrow:grid-cols-1">
                        <StatGroup title="Resources">
                            {(['hp', 'mana', 'stamina'] as const).map((pool) => {
                                const r = resourceState(c, pool);
                                return (
                                    <div key={pool} className="space-y-1">
                                        <CharacterMeter
                                            label={
                                                pool === 'hp'
                                                    ? 'HP'
                                                    : pool === 'mana'
                                                      ? 'MP'
                                                      : 'Stamina'
                                            }
                                            value={r.current}
                                            maximum={r.maximum}
                                            reserved={r.reserved}
                                        />
                                        {r.reserved > 0 && (
                                            <p className="text-xs tabular-nums">
                                                {r.reserved} reserved · {r.available} available
                                            </p>
                                        )}
                                    </div>
                                );
                            })}
                        </StatGroup>
                        <StatGroup title="Progression">
                            <dl className="space-y-2">
                                <InfoRow label="Level" value={c.level} />
                                <InfoRow label="Total Level" value={c.totalLevel} />
                                <InfoRow label="AP" value={c.ap} />
                            </dl>
                            <CharacterMeter
                                label="XP"
                                value={c.level >= 200 ? 1 : c.xp}
                                maximum={c.level >= 200 ? 1 : xpNeeded(c.level)}
                                output={
                                    c.level >= 200
                                        ? 'MAX'
                                        : `${((c.xp / xpNeeded(c.level)) * 100).toFixed(1)}%`
                                }
                            />
                        </StatGroup>
                        <StatGroup title="Attributes">
                            {stats(['str', 'int', 'dex', 'will', 'luck'])}
                        </StatGroup>
                        <StatGroup title="Attack">
                            {stats(['meleeAttack', 'rangedAttack', 'magicAttack', 'dualGunAttack'])}
                        </StatGroup>
                        <StatGroup title="Defense">
                            {stats(['defense', 'protection', 'magicDefense', 'magicProtection'])}
                        </StatGroup>
                        <StatGroup title="Recovery">
                            {stats(['hpRegen', 'manaRegen', 'staminaRegen'])}
                            <dl>
                                <InfoRow label="Shield" value={c.effects.shield ?? 0} />
                            </dl>
                        </StatGroup>
                    </div>
                    <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between gap-4">
                            <h3 className="font-sans text-sm font-semibold text-foreground">
                                Status Effects
                            </h3>
                            <Button size="sm" variant="ghost" onPress={() => setTab('additional')}>
                                Details
                            </Button>
                        </div>
                        {c.statuses.map((status) => (
                            <p key={status.definition.group}>{statusSummary(status)}</p>
                        ))}
                        {c.effects.final && <p>Final Hit active</p>}
                        {c.effects.manaShield && <p>Mana Shield active</p>}
                        {c.effects.counter && <p>Counterattack prepared</p>}
                        {!c.statuses.length &&
                            !c.effects.final &&
                            !c.effects.manaShield &&
                            !c.effects.counter && <p>No active effects.</p>}
                    </div>
                    <div className="space-y-2 text-sm">
                        <h3 className="font-sans text-sm font-semibold text-foreground">
                            Potential
                        </h3>
                        <p>Not yet available.</p>
                    </div>
                </Tabs.Panel>
                <Tabs.Panel id="additional" className={panelClassName}>
                    <DetailedStats c={c} />
                </Tabs.Panel>
                <Tabs.Panel id="jobs" className={panelClassName}>
                    <p className="py-8 text-center text-sm text-muted">
                        Part-time jobs are not yet available.
                    </p>
                </Tabs.Panel>
            </Tabs>
        </section>
    );
}
