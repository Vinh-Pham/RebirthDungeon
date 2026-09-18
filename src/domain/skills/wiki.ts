import type { Race } from '../model';
import { type Skill, type RankDefinition, type WikiReference } from './types';

export function wikiValue(
    wiki: WikiReference | undefined,
    label: string,
    index: number,
    race: Race = 'Human',
): number {
    const matches =
        wiki?.rows.filter(
            (row) =>
                row.label === label ||
                row.label.startsWith(`${label} (`) ||
                row.label.startsWith(`${label} ·`) ||
                row.label.startsWith(`${label} [`) ||
                row.label.startsWith(`${label}*`),
        ) ?? [];
    const racial = matches.filter(
        (row) => !/Human|Elf|Giant/.test(row.label) || row.label.includes(race),
    );
    const nonTotals = racial.filter((row) => !row.label.includes('Total'));
    const eligible = nonTotals.length && !label.includes('Total') ? nonTotals : racial;
    const row = eligible.find((row) => row.label.includes(race)) ?? eligible[0];
    const value = row?.values[index]?.replace(/,/g, '') ?? '';
    return value === '-' ? 0 : Number.parseFloat(value) || 0;
}

interface Adaptation {
    slug: string;
    category: Skill['category'];
    damage?: string[];
    damageScale?: number;
    power?: string;
    cost?: string;
    note: string;
}

/** Wiki seconds become six-second turns; resource fractions round up. Dice/training remain game rules. */
export function withWiki(skill: Skill, wiki: WikiReference, config: Adaptation): Skill {
    skill.icon = `/assets/game/skills/${config.slug}.webp`;
    skill.category = config.category;
    skill.wiki = wiki;
    skill.adaptation = config.note;
    const build = (race: Race): RankDefinition[] =>
        skill.ranks.map((rank, index) => {
            const value = (label: string, at = index) => wikiValue(wiki, label, at, race);
            const damage = config.damage?.map((label) => value(label)) ?? [];
            return {
                ...rank,
                base: config.power ? value(config.power) : config.damage ? 0 : rank.base,
                counterMultiplier:
                    skill.effect === 'counter'
                        ? value('Damage From Opponent [%]') / 100
                        : undefined,
                attackMultiplier: damage.length
                    ? damage.reduce((sum, n) => sum + n, 0) /
                      damage.length /
                      (config.damageScale ?? 100)
                    : undefined,
                ap:
                    index === 14
                        ? 0
                        : value(
                              wiki.rows.some((row) => row.label.startsWith('Required AP'))
                                  ? 'Required AP'
                                  : 'AP Cost',
                              index + 1,
                          ),
                costs: {
                    hp: 0,
                    mana:
                        skill.resource === 'mana' ? Math.ceil(value(config.cost ?? 'Mana Use')) : 0,
                    stamina:
                        skill.resource === 'stamina'
                            ? Math.ceil(value(config.cost ?? 'Stamina Use'))
                            : 0,
                },
                cooldown: Math.ceil(value('Cooldown Time') / 6),
            };
        });
    skill.ranksByRace = { Human: build('Human'), Elf: build('Elf'), Giant: build('Giant') };
    skill.ranks = skill.ranksByRace.Human;
    return skill;
}
