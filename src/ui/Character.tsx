import { useState, type ReactNode } from 'react';
import { Button, Card, Tabs } from '@heroui/react';
import { xpNeeded } from '../domain/progression';
import type { Immutable } from 'immer';
import type { Character as CharacterModel } from '../domain/model';
import { resolveStats } from '../domain/stats/resolve';
import { resourceState } from '../domain/stats/resources';
import { statLabels, isPercentage } from '../domain/stats/rules';
import type { StatId } from '../domain/stats/types';
import { statusSummary } from '../domain/stats/statuses';
import { CharacterMeter } from './CharacterMeter';
import { DetailedStats } from './CharacterDetailedStats';

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

export function Character({ c }: { c: Immutable<CharacterModel> }) {
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
