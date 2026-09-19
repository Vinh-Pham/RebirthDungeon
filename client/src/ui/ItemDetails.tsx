import type { Immutable } from 'immer';
import { items } from '../domain/catalog';
import { skills } from '../domain/Skills';
import { criticalStats } from '../domain/skillSystem';
import { equippedSlot, footprint, raceReason, slotLabels } from '../domain/inventory';
import type { Character, Item } from '../domain/model';
import { statLabels } from '../domain/stats/rules';
import { statusDefinitions } from '../domain/stats/statusCatalog';
import type { StatModifier, CostModifier } from '../domain/stats/types';

const pools = { hp: 'HP', mana: 'MP', stamina: 'SP' };
const signed = (value: number) => `${value >= 0 ? '+' : ''}${value}`;
const modifier = (m: StatModifier) =>
    [
        m.flat !== undefined ? signed(m.flat) : '',
        m.percentBp !== undefined ? `${signed(m.percentBp / 100)}%` : '',
    ]
        .filter(Boolean)
        .join(', ') + ` ${statLabels[m.stat]}`;
const cost = (m: CostModifier) =>
    `${m.skill ? (skills[m.skill]?.name ?? m.skill) : 'All skills'}: ${[m.flat !== undefined ? signed(m.flat) : '', m.percentBp !== undefined ? `${signed(m.percentBp / 100)}%` : ''].filter(Boolean).join(', ')} ${pools[m.pool]} cost`;

export function ItemDetails({
    item,
    character: c,
}: {
    item: Immutable<Item>;
    character: Immutable<Character>;
}) {
    const def = items[item.kind],
        size = footprint(item.kind),
        slot = equippedSlot(c, item.id);
    const critical = criticalStats(c);
    const description =
        def.description ??
        (def.type === 'weapon'
            ? `A ${def.talent?.toLowerCase() ?? 'combat'} weapon. Its power contributes to attack damage; skills, stats and enemy defenses determine the final hit.`
            : def.type === 'consumable'
              ? 'A consumable supply. Use it from the item menu when its effects are needed.'
              : def.type === 'book'
                ? `Read this manual to learn ${skills[def.skill!]?.name ?? 'its skill'}.`
                : def.type === 'page'
                  ? 'Insert this page into the incomplete Final Hit manual.'
                  : def.type === 'collection'
                    ? 'Collect and insert all five pages to assemble the Final Hit manual.'
                    : def.type === 'material'
                      ? 'A material that can be kept for deliveries or sold to a shop.'
                      : 'Wear this equipment in a compatible slot to receive its bonuses.');
    const rows: [string, string][] = [
        ['Type', def.armorCategory ? `${def.armorCategory} armor` : def.type],
        ['Quantity', String(item.count)],
        ['Backpack size', `${size.width} × ${size.height} cells`],
        ['Stack limit', def.slots ? '1' : '99'],
        ['Location', slot ? `Equipped · ${slotLabels[slot]}` : 'Backpack'],
    ];
    if (def.power !== undefined) {
        rows.push(['Base weapon power', String(def.power)]);
        rows.push(['Critical rate (character)', `${critical.criticalChance / 100}%`]);
        rows.push([
            'Critical damage bonus (character)',
            `+${Math.round(critical.criticalBonus * 100)}%`,
        ]);
    }
    if (item.durability !== undefined)
        rows.push([
            'Durability',
            `${item.durability} / 20${item.durability === 0 ? ' · Broken: weapon power halved' : ''}`,
        ]);
    if (def.defense) rows.push(['Defense', signed(def.defense)]);
    if (def.magicDefense) rows.push(['Magic Defense', signed(def.magicDefense)]);
    if (def.talent) rows.push(['Weapon style', def.talent]);
    if (def.resource && def.restore)
        rows.push(['Restores', `${def.restore} ${pools[def.resource]}`]);
    if (def.cleanse) rows.push(['Removes', `Dispellable ${def.cleanse} effects`]);
    if (def.requiresRun) rows.push(['Use restriction', 'During a dungeon run']);
    if (def.skill) rows.push(['Teaches', skills[def.skill]?.name ?? def.skill]);
    if (def.page)
        rows.push([
            'Page',
            `${def.page} / 5${c.collection.includes(def.page) ? ' · Already inserted' : ''}`,
        ]);
    if (def.type === 'collection') rows.push(['Pages inserted', `${c.collection.length} / 5`]);
    if (def.slots) {
        rows.push(['Fits', def.slots.map((s) => slotLabels[s]).join(', ')]);
        rows.push(['Races', def.races?.join(', ') ?? 'All races']);
        rows.push(['Equip timing', 'Town only']);
    }
    rows.push(
        ['Shop price', `${def.price} gold`],
        ['Sell value', `${Math.floor(def.price / 4)} gold each`],
    );
    return (
        <div className="item-details-content">
            <h3 className="text-center text-base font-semibold">{def.name}</h3>
            <p className="mt-2 text-sm text-muted">{description}</p>
            <dl className="mt-3 space-y-1 text-xs">
                {rows.map(([label, value]) => (
                    <div key={label} className="flex justify-between gap-4">
                        <dt className="text-muted">{label}</dt>
                        <dd className="max-w-[65%] text-right">{value}</dd>
                    </div>
                ))}
            </dl>
            {def.power !== undefined && (
                <p className="mt-2 text-xs text-muted">
                    Critical values come from your Critical Hit skill, not this weapon. Off-hand
                    swords contribute half weapon power.
                </p>
            )}
            {def.hand === 'sword' && (
                <p className="mt-2 text-xs">
                    Left-hand use requires a distinct sword in the right hand.
                </p>
            )}
            {def.type === 'shield' && (
                <p className="mt-2 text-xs">
                    Requires a compatible one-handed melee weapon in the right hand.
                </p>
            )}
            {def.armorCategory === 'heavy' && (
                <p className="mt-2 text-xs">
                    Reduces Dexterity; Heavy Armor Mastery determines the penalty.
                </p>
            )}
            {def.modifiers?.map((m, i) => (
                <p className="mt-1 text-xs" key={`stat-${i}`}>
                    {modifier(m)}
                </p>
            ))}
            {def.costModifiers?.map((m, i) => (
                <p className="mt-1 text-xs" key={`cost-${i}`}>
                    {cost(m)}
                </p>
            ))}
            {def.statuses?.map((id) => {
                const status = statusDefinitions[id];
                return (
                    <section key={id} className="mt-3 border-t border-border pt-2 text-xs">
                        <h4 className="font-semibold">
                            {status.name} · {status.duration} activations
                        </h4>
                        {status.modifiers.map((m, i) => (
                            <p key={i}>{modifier(m)}</p>
                        ))}
                        {status.costs?.map((m, i) => (
                            <p key={i}>{cost(m)}</p>
                        ))}
                        {status.periodic?.map((effect, i) => (
                            <p key={i}>
                                {effect.kind === 'restore' ? 'Restores' : 'Deals'} {effect.amount}{' '}
                                {pools[effect.pool]} {effect.kind === 'damage' ? 'damage' : ''} per
                                activation
                            </p>
                        ))}
                    </section>
                );
            })}
            {raceReason(c, item.kind) && (
                <p className="mt-2 text-xs text-warning">
                    Cannot equip: {raceReason(c, item.kind)}
                </p>
            )}
        </div>
    );
}