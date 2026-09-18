import { enemyDamage } from './behavior';
import { produce, type Immutable } from 'immer';
import { items, skills, shops, talentSkill, talentWeapon } from './catalog';
import { attackDamage, nextRandom, roll } from './dice';
import { generateDungeon } from './dungeon';
import { applyAging, gainXp, rebirth, startingStats } from './progression';
import {
    initialData,
    races,
    talents,
    zeroStats,
    type Character,
    type CreateInput,
    type Item,
    type Reward,
    type SaveData,
    type Settings,
} from './model';
export type Command =
    | { type: 'NAV'; screen: 'Title' | 'CharacterSelect' | 'NewCharacter' }
    | { type: 'CREATE'; input: CreateInput; id: string; now: number }
    | { type: 'PLAY'; id: string; now: number }
    | { type: 'ENTER'; seed: number }
    | { type: 'ENCOUNTER'; room: number; x?: number; y?: number }
    | { type: 'POSITION'; x: number; y: number }
    | { type: 'ROLL'; skill: string; target: string }
    | { type: 'HOLD'; index: number }
    | { type: 'REROLL' }
    | { type: 'ATTACK' }
    | { type: 'RECOVER' }
    | { type: 'CLAIM'; ids: string[]; gold: boolean }
    | { type: 'LEAVE_REWARD' }
    | { type: 'CHEST'; index: number }
    | { type: 'CONTINUE' }
    | { type: 'ABANDON' }
    | { type: 'BUY'; shop: string; kind: string }
    | { type: 'SELL'; id: string }
    | { type: 'EQUIP'; id: string }
    | { type: 'USE'; id: string }
    | { type: 'REPAIR'; id: string }
    | { type: 'HEAL' }
    | { type: 'BANK_GOLD'; amount: number; deposit: boolean }
    | { type: 'BANK_ITEM'; id: string; deposit: boolean }
    | { type: 'REBIRTH'; id: string; talent: CreateInput['talent']; age: number; now: number }
    | { type: 'SETTINGS'; settings: Partial<Settings> };
export const blankSave = (): SaveData => ({
    version: 1,
    data: initialData(),
    checkpoint: { version: 1, screen: 'Title', phase: 'exploring' },
});
export function active(save: Immutable<SaveData>): Immutable<Character> | undefined {
    return save.data.characters.find((c) => c.id === save.data.activeId);
}
export function addItem(list: Item[], item: Item, limit: number) {
    const def = items[item.kind];
    if (!def || !Number.isInteger(item.count) || item.count < 1) throw new Error('Invalid item.');
    let remaining = item.count;
    if (def.type === 'weapon' || def.type === 'armor') {
        if (list.length + remaining > limit) throw new Error('Not enough inventory space.');
        for (let i = 0; i < remaining; i++)
            list.push({ ...item, id: i ? `${item.id}-${i}` : item.id, count: 1 });
        return;
    }
    for (const row of list.filter((i) => i.kind === item.kind)) {
        const n = Math.min(99 - row.count, remaining);
        row.count += n;
        remaining -= n;
    }
    while (remaining > 0) {
        if (list.length >= limit) throw new Error('Not enough inventory space.');
        const n = Math.min(99, remaining);
        list.push({ ...item, id: `${item.id}-${remaining}`, count: n });
        remaining -= n;
    }
}
function consume(list: Item[], id: string) {
    const i = list.findIndex((i) => i.id === id);
    if (i < 0) throw new Error('Item not found.');
    if (--list[i].count === 0) list.splice(i, 1);
}
function compatible(c: Character, kind: string) {
    return !(c.race === 'Giant' && items[kind].talent === 'Archery');
}
function requireCharacter(s: SaveData): Character {
    const c = s.data.characters.find((c) => c.id === s.data.activeId);
    if (!c) throw new Error('Select a character first.');
    return c;
}
function makeReward(s: SaveData, id: string, boss = false): Reward {
    let value;
    [s.data.rng, value] = nextRandom(s.data.rng);
    return {
        id,
        gold: boss ? 100 + Math.floor(value * 60) : 15 + Math.floor(value * 20),
        boss,
        claimed: [],
        items: [
            { id: `${id}-silk`, kind: boss ? 'gem' : 'silk', count: boss ? 2 : 1 },
            {
                id: `${id}-potion`,
                kind: value < 0.33 ? 'hp' : value < 0.66 ? 'mana' : 'stamina',
                count: 1,
            },
        ],
    };
}
function enemiesAct(c: Character) {
    const b = c.battle!;
    const armor = c.inventory.find((i) => i.id === c.armor);
    const defense = armor ? items[armor.kind].defense || 0 : 0;
    for (const e of b.enemies.filter((e) => e.hp > 0)) {
        const hit = enemyDamage(e.attack, defense, e.hp);
        c.hp = Math.max(0, c.hp - hit);
        b.log.push(`${e.name} deals ${hit} damage.`);
        if (!c.hp) break;
    }
    b.turn++;
    b.dice = [];
    b.held = [false, false, false, false, false];
    b.rerolls = 2;
    b.skill = '';
    b.log = b.log.slice(-5);
}
export function allowed(save: Immutable<SaveData>, cmd: Command): boolean {
    const screen = save.checkpoint.screen,
        phase = save.checkpoint.phase;
    if (cmd.type === 'NAV' || cmd.type === 'SETTINGS') return true;
    if (cmd.type === 'CREATE') return screen === 'NewCharacter';
    if (cmd.type === 'PLAY' || cmd.type === 'REBIRTH') return screen === 'CharacterSelect';
    if (cmd.type === 'ENTER') return screen === 'Town1';
    if (['POSITION', 'ENCOUNTER'].includes(cmd.type)) return screen === 'Alby';
    if (cmd.type === 'ABANDON') return !!active(save)?.run;
    if (cmd.type === 'CHEST') return screen === 'TreasureRoom' && phase === 'treasure';
    if (cmd.type === 'CONTINUE') return screen === 'TreasureRoom' && phase === 'reward';
    if (cmd.type === 'CLAIM' || cmd.type === 'LEAVE_REWARD') return phase === 'reward';
    if (cmd.type === 'ROLL' || cmd.type === 'RECOVER')
        return screen === 'Battle' && phase === 'selecting';
    if (['HOLD', 'REROLL', 'ATTACK'].includes(cmd.type))
        return screen === 'Battle' && phase === 'choosingDice';
    if (cmd.type === 'USE')
        return ['Town1', 'Alby'].includes(screen) || (screen === 'Battle' && phase === 'selecting');
    if (cmd.type === 'EQUIP') return ['Town1', 'Alby'].includes(screen);
    return screen === 'Town1';
}
export function reduceCommand(
    save: Immutable<SaveData>,
    cmd: Command,
    operationId: string,
): Immutable<SaveData> {
    if (save.data.operations.includes(operationId)) return save;
    if (!allowed(save, cmd)) throw new Error('That action is not available right now.');
    return produce(save, (d) => {
        const s = d as SaveData;
        if (cmd.type === 'NAV') {
            s.checkpoint.screen = cmd.screen;
            s.checkpoint.phase = 'exploring';
        } else if (cmd.type === 'SETTINGS') {
            const settings = { ...s.data.settings, ...cmd.settings };
            for (const k of ['music', 'effects'] as const)
                if (!Number.isFinite(settings[k]) || settings[k] < 0 || settings[k] > 1)
                    throw new Error('Invalid volume.');
            if (
                !Number.isFinite(settings.hudScale) ||
                settings.hudScale < 0.8 ||
                settings.hudScale > 1.3
            )
                throw new Error('Invalid HUD size.');
            s.data.settings = settings;
        } else if (cmd.type === 'CREATE') {
            const { race, talent, age } = cmd.input,
                name = cmd.input.name.trim();
            if (s.data.characters.length >= 20)
                throw new Error('All 20 character slots are occupied.');
            if (
                name.length < 2 ||
                name.length > 24 ||
                s.data.characters.some((c) => c.name.toLowerCase() === name.toLowerCase())
            )
                throw new Error('Use a unique name between 2 and 24 characters.');
            if (
                !races.includes(race) ||
                !talents.includes(talent) ||
                !Number.isInteger(age) ||
                age < 10 ||
                age > 17 ||
                (race === 'Giant' && talent === 'Archery')
            )
                throw new Error('Choose a valid race, age and talent.');
            if (s.data.characters.some((c) => c.id === cmd.id))
                throw new Error('Character already exists.');
            const stats = startingStats(talent);
            const weapon =
                talent === 'Close Combat' && race === 'Elf' ? 'mace' : talentWeapon[talent];
            const c: Character = {
                id: cmd.id,
                name,
                race,
                talent,
                age,
                level: 1,
                xp: 0,
                totalLevel: 1,
                ap: 5,
                base: { ...stats },
                growth: zeroStats(),
                stats: { ...stats },
                hp: stats.hp,
                mana: stats.mana,
                stamina: stats.stamina,
                gold: 100,
                bankGold: 0,
                inventory: [
                    { id: `${cmd.id}-weapon`, kind: weapon, count: 1, durability: 20 },
                    { id: `${cmd.id}-hp`, kind: 'hp', count: 3 },
                    { id: `${cmd.id}-stamina`, kind: 'stamina', count: 3 },
                ],
                bank: [],
                weapon: `${cmd.id}-weapon`,
                armor: null,
                skills: ['normal', talentSkill[talent]],
                createdAt: cmd.now,
                rebornAt: cmd.now,
                agedAt: cmd.now,
                run: null,
                battle: null,
                reward: null,
                checkpoint: 'exploring',
                tutorial: 0,
            };
            s.data.characters.push(c);
            s.data.activeId = c.id;
            s.checkpoint = { version: 1, screen: 'Town1', phase: 'exploring' };
        } else if (cmd.type === 'PLAY' || cmd.type === 'REBIRTH') {
            const c = s.data.characters.find((c) => c.id === cmd.id);
            if (!c) throw new Error('Character not found.');
            s.data.activeId = c.id;
            if (cmd.type === 'REBIRTH') {
                if (!talents.includes(cmd.talent)) throw new Error('Unknown talent.');
                rebirth(c, cmd.talent, cmd.age, cmd.now);
                const skill = talentSkill[cmd.talent];
                if (!c.skills.includes(skill)) c.skills.push(skill);
            } else {
                applyAging(c, cmd.now);
                s.checkpoint = {
                    version: 1,
                    screen:
                        c.run?.chosen !== null && c.run?.chests.length
                            ? 'TreasureRoom'
                            : c.checkpoint === 'treasure'
                              ? 'TreasureRoom'
                              : c.battle
                                ? 'Battle'
                                : c.run
                                  ? 'Alby'
                                  : 'Town1',
                    phase: c.checkpoint,
                };
            }
        } else {
            const c = requireCharacter(s);
            switch (cmd.type) {
                case 'ENTER':
                    c.run = generateDungeon(cmd.seed);
                    c.run.id = `${c.run.id}-${operationId}`;
                    c.battle = null;
                    c.reward = null;
                    c.tutorial = Math.max(c.tutorial, 1);
                    s.checkpoint = { version: 1, screen: 'Alby', phase: 'exploring' };
                    break;
                case 'POSITION':
                    if (
                        c.run &&
                        Number.isFinite(cmd.x) &&
                        Number.isFinite(cmd.y) &&
                        c.run.tiles[Math.floor(cmd.y / 32)]?.[Math.floor(cmd.x / 32)]
                    ) {
                        c.run.x = cmd.x;
                        c.run.y = cmd.y;
                    }
                    break;
                case 'ENCOUNTER': {
                    if (
                        c.run &&
                        cmd.x !== undefined &&
                        cmd.y !== undefined &&
                        c.run.tiles[Math.floor(cmd.y / 32)]?.[Math.floor(cmd.x / 32)]
                    ) {
                        c.run.x = cmd.x;
                        c.run.y = cmd.y;
                    }
                    const r = c.run?.rooms.find((r) => r.id === cmd.room);
                    if (!r || r.kind === 'entry' || c.run!.cleared.includes(r.id))
                        throw new Error('This room is already clear.');
                    if (
                        r.kind === 'boss' &&
                        c.run!.rooms.some((r) => r.required && !c.run!.cleared.includes(r.id))
                    )
                        throw new Error(
                            'Clear the three sealed rooms before opening the boss gate.',
                        );
                    if (r.kind === 'supplies') {
                        c.run!.cleared.push(r.id);
                        c.reward = makeReward(s, `${c.run!.id}-supplies`);
                        s.checkpoint.phase = 'reward';
                        break;
                    }
                    const count = r.kind === 'boss' ? 3 : r.id === 1 ? 1 : r.id === 2 ? 2 : 3;
                    c.battle = {
                        room: r.id,
                        enemies: Array.from({ length: count }, (_, i) => {
                            const boss = r.kind === 'boss' && i === 0;
                            return {
                                id: `enemy-${i}`,
                                name: boss
                                    ? 'Giant Spider'
                                    : r.id > 2
                                      ? 'Red Spider'
                                      : 'White Spider',
                                hp: boss ? 115 : r.id > 2 ? 30 : 24,
                                maxHp: boss ? 115 : r.id > 2 ? 30 : 24,
                                attack: boss ? 9 : 4,
                                defense: boss ? 2 : 0,
                                boss,
                            };
                        }),
                        dice: [],
                        held: Array(5).fill(false),
                        rerolls: 2,
                        skill: '',
                        target: 'enemy-0',
                        turn: 1,
                        log: ['Choose a skill to roll your dice.'],
                    };
                    s.checkpoint = { version: 1, screen: 'Battle', phase: 'selecting' };
                    break;
                }
                case 'ROLL': {
                    const b = c.battle!,
                        skill = skills[cmd.skill],
                        weapon = c.inventory.find((i) => i.id === c.weapon);
                    if (
                        !skill ||
                        !c.skills.includes(cmd.skill) ||
                        c[skill.resource] < skill.cost ||
                        (skill.talent && items[weapon?.kind || '']?.talent !== skill.talent)
                    )
                        throw new Error('You need the matching weapon and enough resources.');
                    if (!b.enemies.some((e) => e.id === cmd.target && e.hp > 0))
                        throw new Error('Choose a living enemy.');
                    const rolled = roll(s.data.rng);
                    s.data.rng = rolled.seed;
                    b.dice = rolled.dice;
                    b.skill = cmd.skill;
                    b.target = cmd.target;
                    b.rerolls = 2;
                    b.held = Array(5).fill(false);
                    s.checkpoint.phase = 'choosingDice';
                    break;
                }
                case 'HOLD':
                    if (!Number.isInteger(cmd.index) || cmd.index < 0 || cmd.index > 4)
                        throw new Error('Invalid die.');
                    c.battle!.held[cmd.index] = !c.battle!.held[cmd.index];
                    break;
                case 'REROLL': {
                    const b = c.battle!;
                    if (b.rerolls <= 0 || b.held.every(Boolean))
                        throw new Error('No dice available to reroll.');
                    const rolled = roll(s.data.rng, b.dice, b.held);
                    s.data.rng = rolled.seed;
                    b.dice = rolled.dice;
                    b.rerolls--;
                    break;
                }
                case 'ATTACK': {
                    const b = c.battle!,
                        skill = skills[b.skill],
                        enemy = b.enemies.find((e) => e.id === b.target && e.hp > 0);
                    if (!enemy || !skill || c[skill.resource] < skill.cost)
                        throw new Error('Invalid attack.');
                    const damage = attackDamage(c, enemy, b.skill, b.dice);
                    c[skill.resource] -= skill.cost;
                    enemy.hp = Math.max(0, enemy.hp - damage);
                    const w = c.inventory.find((i) => i.id === c.weapon);
                    if (w) w.durability = Math.max(0, (w.durability ?? 20) - 1);
                    b.log.push(`${skill.name} hits ${enemy.name} for ${damage}.`);
                    if (b.enemies.every((e) => e.hp === 0)) {
                        const boss = b.enemies.some((e) => e.boss);
                        c.run!.cleared.push(b.room);
                        gainXp(c, boss ? 400 : 100);
                        c.tutorial = Math.max(c.tutorial, boss ? 3 : 2);
                        c.reward = makeReward(s, `${c.run!.id}-room-${b.room}`, boss);
                        s.checkpoint.phase = 'reward';
                    } else {
                        enemiesAct(c);
                        s.checkpoint.phase = 'selecting';
                    }
                    break;
                }
                case 'RECOVER':
                    c.mana = Math.min(c.stats.mana, c.mana + 10);
                    c.stamina = Math.min(c.stats.stamina, c.stamina + 20);
                    enemiesAct(c);
                    break;
                case 'CLAIM': {
                    const r = c.reward;
                    if (!r) throw new Error('No rewards available.');
                    for (const id of new Set(cmd.ids)) {
                        const item = r.items.find((i) => i.id === id);
                        if (!item || r.claimed.includes(id)) continue;
                        addItem(c.inventory, { ...item }, 30);
                        r.claimed.push(id);
                    }
                    if (cmd.gold && !r.claimed.includes('gold')) {
                        c.gold += r.gold;
                        r.claimed.push('gold');
                    }
                    break;
                }
                case 'LEAVE_REWARD': {
                    if (!c.reward) throw new Error('No reward to leave.');
                    const boss = c.reward.boss;
                    c.reward = null;
                    c.battle = null;
                    if (boss) {
                        c.run!.chests = Array.from({ length: 5 }, (_, i) =>
                            makeReward(s, `${c.run!.id}-chest-${i}`, true),
                        );
                        s.checkpoint = { version: 1, screen: 'TreasureRoom', phase: 'treasure' };
                    } else s.checkpoint = { version: 1, screen: 'Alby', phase: 'exploring' };
                    break;
                }
                case 'CHEST':
                    if (
                        !c.run ||
                        c.run.chosen !== null ||
                        !Number.isInteger(cmd.index) ||
                        cmd.index < 0 ||
                        cmd.index > 4
                    )
                        throw new Error('Choose one unopened chest.');
                    c.run.chosen = cmd.index;
                    c.reward = {
                        ...c.run.chests[cmd.index],
                        items: c.run.chests[cmd.index].items.map((i) => ({ ...i })),
                        claimed: [],
                    };
                    c.tutorial = 4;
                    s.checkpoint.phase = 'reward';
                    break;
                case 'CONTINUE':
                case 'ABANDON':
                    c.run = null;
                    c.battle = null;
                    c.reward = null;
                    s.checkpoint = { version: 1, screen: 'Town1', phase: 'exploring' };
                    break;
                case 'BUY': {
                    const def = items[cmd.kind];
                    if (!def || !shops[cmd.shop]?.includes(cmd.kind) || !compatible(c, cmd.kind))
                        throw new Error('This item is not available.');
                    if (c.gold < def.price) throw new Error('Not enough gold.');
                    addItem(
                        c.inventory,
                        {
                            id: operationId,
                            kind: cmd.kind,
                            count: 1,
                            ...(def.type === 'weapon' ? { durability: 20 } : {}),
                        },
                        30,
                    );
                    c.gold -= def.price;
                    break;
                }
                case 'SELL': {
                    const item = c.inventory.find((i) => i.id === cmd.id);
                    if (!item) throw new Error('Item not found.');
                    if (c.weapon === item.id || c.armor === item.id)
                        throw new Error('Unequip the item before selling.');
                    c.gold += Math.floor(items[item.kind].price / 4);
                    consume(c.inventory, item.id);
                    break;
                }
                case 'EQUIP': {
                    const item = c.inventory.find((i) => i.id === cmd.id);
                    if (!item || !compatible(c, item.kind))
                        throw new Error('You cannot equip this item.');
                    const def = items[item.kind];
                    if (def.type === 'weapon') c.weapon = c.weapon === item.id ? null : item.id;
                    else if (def.type === 'armor') c.armor = c.armor === item.id ? null : item.id;
                    else throw new Error('This item cannot be equipped.');
                    break;
                }
                case 'USE': {
                    const item = c.inventory.find((i) => i.id === cmd.id),
                        def = item && items[item.kind];
                    if (!item || !def?.resource) throw new Error('Choose a consumable.');
                    c[def.resource] = Math.min(
                        c.stats[def.resource],
                        c[def.resource] + def.restore!,
                    );
                    consume(c.inventory, item.id);
                    if (s.checkpoint.screen === 'Battle') enemiesAct(c);
                    break;
                }
                case 'REPAIR': {
                    const item = c.inventory.find((i) => i.id === cmd.id);
                    if (!item || items[item.kind].type !== 'weapon')
                        throw new Error('Choose a weapon.');
                    const price = 20 - (item.durability ?? 20);
                    if (c.gold < price) throw new Error('Not enough gold.');
                    c.gold -= price;
                    item.durability = 20;
                    break;
                }
                case 'HEAL':
                    if (c.gold < 10) throw new Error('Not enough gold.');
                    c.gold -= 10;
                    c.hp = c.stats.hp;
                    c.mana = c.stats.mana;
                    c.stamina = c.stats.stamina;
                    break;
                case 'BANK_GOLD': {
                    if (!Number.isSafeInteger(cmd.amount) || cmd.amount <= 0)
                        throw new Error('Enter a positive whole amount.');
                    const source = cmd.deposit ? 'gold' : 'bankGold',
                        target = cmd.deposit ? 'bankGold' : 'gold';
                    if (c[source] < cmd.amount) throw new Error('Not enough gold.');
                    c[source] -= cmd.amount;
                    c[target] += cmd.amount;
                    break;
                }
                case 'BANK_ITEM': {
                    const source = cmd.deposit ? c.inventory : c.bank,
                        target = cmd.deposit ? c.bank : c.inventory,
                        item = source.find((i) => i.id === cmd.id);
                    if (!item) throw new Error('Item not found.');
                    if (cmd.deposit && (c.weapon === item.id || c.armor === item.id))
                        throw new Error('Unequip this item first.');
                    addItem(target, { ...item, id: operationId }, cmd.deposit ? 60 : 30);
                    source.splice(source.indexOf(item), 1);
                    break;
                }
            }
            if (c.hp <= 0) {
                c.run = null;
                c.battle = null;
                c.reward = null;
                c.hp = c.stats.hp;
                c.mana = c.stats.mana;
                c.stamina = c.stats.stamina;
                s.checkpoint = { version: 1, screen: 'Town1', phase: 'exploring' };
            }
            c.checkpoint = s.checkpoint.phase;
        }
        s.data.revision++;
        s.data.operations.push(operationId);
        if (s.data.operations.length > 256) s.data.operations.shift();
    });
}
