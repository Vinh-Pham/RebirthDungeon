import { validateBattleContent } from './battle/content';
import {
    acceptQuest,
    bankRunQuests,
    completeQuest,
    currentObjectives,
    interactQuest,
    reconcileQuests,
    recordDefeats,
    refreshQuests,
    snapshotQuests,
    trackQuest,
    withdrawQuestReward,
} from './quests/system';
import { emptyJournal, type QuestNpc } from './quests/types';
import { createMemory, controlledCharacter } from './quests/roleplay';
import {
    addItem,
    addInventoryItem,
    consumeInventoryItem,
    initializeInventory,
    equippedSlot,
    equipItem,
    moveItem,
} from './inventory';
export { addItem } from './inventory';
import { createStatSnapshot } from './stats/resolve';
import {
    learn,
    advance,
    refreshStats,
    progressionStats,
    requirementReason,
    train,
    useOutsideBattle,
} from './skillSystem';
import {
    applyBattleCommand,
    encounterBattle,
    playerTurn,
    turnIdentity,
    type BattleCommand,
} from './battle/engine';
import { consumeItem } from './battle/items';
import { enemyProfile } from './battle/profiles';
import { produce, type Immutable } from 'immer';
import { items, skills, shops, talentWeapon } from './catalog';
import { nextRandom } from './rng';
import { generateDungeon, bossUnlocked, dungeonGrid, pendingEncounter } from './dungeon';
import { applyAging, gainXp, rebirth, startingStats } from './progression';
import {
    initialData,
    emptyEquipment,
    type EquipmentSlot,
    type InventoryAnchor,
    races,
    talents,
    zeroStats,
    type Character,
    type CreateInput,
    type Reward,
    type SaveData,
    type Settings,
} from './model';
export type Command =
    | BattleCommand
    | { type: 'ACCEPT_QUEST'; quest: string; npc: QuestNpc }
    | { type: 'QUEST_INTERACT'; quest: string; step: string; npc: QuestNpc }
    | { type: 'COMPLETE_QUEST'; quest: string; npc?: QuestNpc }
    | { type: 'TRACK_QUEST'; quest: string; tracked: boolean }
    | { type: 'WITHDRAW_QUEST_REWARD'; id: string }
    | { type: 'START_RP_MISSION'; quest: string; npc: QuestNpc }
    | { type: 'EXIT_RP_MISSION' }
    | { type: 'NAV'; screen: 'Title' | 'CharacterSelect' | 'NewCharacter' }
    | { type: 'CREATE'; input: CreateInput; id: string; now: number }
    | { type: 'PLAY'; id: string; now: number }
    | { type: 'ENTER'; seed: number }
    | { type: 'ENCOUNTER'; room: number; x?: number; y?: number }
    | { type: 'POSITION'; x: number; y: number }
    | { type: 'LEARN'; skill: string }
    | { type: 'RANK_UP'; skill: string }
    | { type: 'USE_SKILL'; skill: string }
    | { type: 'READ'; id: string }
    | { type: 'INSERT_PAGE'; id: string }
    | { type: 'DISMISS_MIGRATION' }
    | { type: 'CLAIM'; ids: string[]; gold: boolean; advance?: boolean }
    | { type: 'LEAVE_REWARD' }
    | { type: 'CHEST'; index: number }
    | { type: 'CONTINUE' }
    | { type: 'ABANDON' }
    | { type: 'BUY'; shop: string; kind: string }
    | { type: 'SELL'; id: string }
    | { type: 'EQUIP'; id: string; slot?: EquipmentSlot }
    | { type: 'UNEQUIP'; id: string; anchor?: InventoryAnchor }
    | { type: 'MOVE_ITEM'; id: string; anchor: InventoryAnchor }
    | { type: 'DROP_ITEM'; id: string; quantity: number }
    | { type: 'WITHDRAW_RECOVERY'; id: string }
    | { type: 'USE'; id: string; turnId?: string }
    | { type: 'REPAIR'; id: string }
    | { type: 'HEAL' }
    | { type: 'BANK_GOLD'; amount: number; deposit: boolean }
    | { type: 'BANK_ITEM'; id: string; deposit: boolean }
    | { type: 'REBIRTH'; id: string; talent: CreateInput['talent']; age: number; now: number }
    | { type: 'SETTINGS'; settings: Partial<Settings> };
export const blankSave = (): SaveData => ({
    version: 5,
    data: initialData(),
    checkpoint: { version: 1, screen: 'Title', phase: 'exploring' },
});
export function active(save: Immutable<SaveData>): Immutable<Character> | undefined {
    return save.data.characters.find((c) => c.id === save.data.activeId);
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

function leaveReward(s: SaveData, c: Character) {
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
}

function finishRun(s: SaveData, c: Character, completed: boolean) {
    bankRunQuests(c, completed);
    c.run = null;
    c.effects = {};
    c.statuses = [];
    c.cooldowns = {};
    c.battle = null;
    c.reward = null;
    s.checkpoint = { version: 1, screen: 'Town1', phase: 'exploring' };
}
function finishActivation(s: SaveData, c: Character) {
    const b = c.battle!;
    recordDefeats(c);
    if (c.role && c.hp > 0 && b.enemies.every((e) => e.hp === 0)) {
        c.run!.cleared.push(b.room);
        c.battle = null;
        c.effects = {};
        s.checkpoint = { version: 1, screen: 'Alby', phase: 'exploring' };
        return;
    }
    if (c.hp > 0 && b.enemies.every((e) => e.hp === 0)) {
        const boss = b.enemies.some((e) => e.boss);
        if (!c.run!.cleared.includes(b.room)) {
            c.run!.cleared.push(b.room);
            gainXp(c, boss ? 400 : 100);
            c.reward = makeReward(s, `${c.run!.id}-room-${b.room}`, boss);
            if ((c.run!.pageRewards ?? 0) < 5) {
                const page = [1, 2, 3, 4, 5].find(
                    (p) =>
                        !c.collection.includes(p) &&
                        ![...c.inventory, ...c.bank].some((i) => i.kind === `finalPage${p}`),
                );
                if (page && !c.skills.final)
                    c.reward.items.push({
                        id: `${c.reward.id}-page`,
                        kind: `finalPage${page}`,
                        count: 1,
                    });
                c.run!.pageRewards = (c.run!.pageRewards ?? 0) + 1;
            }
            for (const id of ['shieldMastery', 'lightMastery', 'heavyMastery'])
                if (!requirementReason(c, id)) train(c, id, 'survive');
        }
        delete c.effects.counter;
        delete c.effects.defense;
        delete c.effects.manaShield;
        c.tutorial = Math.max(c.tutorial, boss ? 3 : 2);
        s.checkpoint.phase = 'reward';
    } else s.checkpoint.phase = b.started ? 'selecting' : 'turnStart';
}
export function allowed(save: Immutable<SaveData>, cmd: Command): boolean {
    const screen = save.checkpoint.screen,
        phase = save.checkpoint.phase;
    if (cmd.type === 'NAV' || cmd.type === 'SETTINGS' || cmd.type === 'DISMISS_MIGRATION')
        return true;
    const hero = active(save);
    if (cmd.type === 'TRACK_QUEST')
        return !!hero && ['Town1', 'Alby', 'Battle', 'TreasureRoom'].includes(screen);
    if (cmd.type === 'EXIT_RP_MISSION') return !!hero?.rp;
    if (
        hero?.rp &&
        ![
            'PLAY',
            'POSITION',
            'ENCOUNTER',
            'BATTLE_ACTION',
            'BATTLE_ITEM',
            'BEGIN_TURN',
            'ENEMY_TURN',
            'USE',
            'USE_SKILL',
            'MOVE_ITEM',
            'DROP_ITEM',
        ].includes(cmd.type)
    )
        return false;
    if (
        [
            'ACCEPT_QUEST',
            'QUEST_INTERACT',
            'COMPLETE_QUEST',
            'WITHDRAW_QUEST_REWARD',
            'START_RP_MISSION',
        ].includes(cmd.type)
    )
        return screen === 'Town1' && !!hero && !hero.run && !hero.rp;
    if (cmd.type === 'REBIRTH' && save.data.characters.find((c) => c.id === cmd.id)?.rp)
        return false;
    if (cmd.type === 'CREATE') return screen === 'NewCharacter';
    if (cmd.type === 'PLAY' || cmd.type === 'REBIRTH') return screen === 'CharacterSelect';
    if (cmd.type === 'ENTER') return screen === 'Town1';
    if (['POSITION', 'ENCOUNTER'].includes(cmd.type)) return screen === 'Alby';
    if (cmd.type === 'ABANDON') return !!active(save)?.run;
    if (cmd.type === 'CHEST') return screen === 'TreasureRoom' && phase === 'treasure';
    if (cmd.type === 'CONTINUE') return screen === 'TreasureRoom' && phase === 'reward';
    if (cmd.type === 'CLAIM' || cmd.type === 'LEAVE_REWARD') return phase === 'reward';
    if (['BATTLE_ACTION', 'BATTLE_ITEM', 'BEGIN_TURN', 'ENEMY_TURN'].includes(cmd.type)) {
        const c = controlledCharacter(save);
        if (screen !== 'Battle' || !c?.battle || c.battle.winner) return false;
        if (cmd.type === 'BEGIN_TURN') return !c.battle.started;
        if (cmd.type === 'ENEMY_TURN')
            return c.battle.started && c.battle.order[c.battle.cursor] !== c.id;
        return playerTurn(c);
    }
    if (['MOVE_ITEM', 'DROP_ITEM'].includes(cmd.type))
        return (
            (['Town1', 'Alby'].includes(screen) && phase === 'exploring') ||
            (screen === 'Battle' && phase === 'selecting')
        );
    if (['UNEQUIP', 'WITHDRAW_RECOVERY'].includes(cmd.type))
        return screen === 'Town1' && !active(save)?.run && !active(save)?.rp;
    if (cmd.type === 'USE')
        return (
            ['Town1', 'Alby'].includes(screen) ||
            (screen === 'Battle' &&
                !!controlledCharacter(save) &&
                playerTurn(controlledCharacter(save)!))
        );
    if (cmd.type === 'USE_SKILL')
        return ['Town1', 'Alby'].includes(screen) && phase === 'exploring';
    if (['EQUIP', 'LEARN', 'RANK_UP', 'READ', 'INSERT_PAGE'].includes(cmd.type))
        return screen === 'Town1' && !active(save)?.run;
    return screen === 'Town1';
}
export function reduceCommand(
    save: Immutable<SaveData>,
    cmd: Command,
    operationId: string,
): Immutable<SaveData> {
    validateBattleContent();
    if (!operationId) throw new Error('Missing operation identity.');
    if (save.data.operations.includes(operationId)) return save;
    if (!allowed(save, cmd)) throw new Error('That action is not available right now.');
    if (cmd.type === 'POSITION') {
        const character = controlledCharacter(save);
        const room = character?.run && pendingEncounter(character.run, cmd.x, cmd.y);
        if (room) cmd = { type: 'ENCOUNTER', room: room.id, x: cmd.x, y: cmd.y };
    }
    return produce(save, (d) => {
        const s = d as SaveData;
        const owner = s.data.characters.find((c) => c.id === s.data.activeId);
        if (
            owner?.rp &&
            !['NAV', 'SETTINGS', 'DISMISS_MIGRATION', 'PLAY', 'TRACK_QUEST'].includes(cmd.type)
        ) {
            const rp = owner.rp;
            const room =
                cmd.type === 'ENCOUNTER'
                    ? rp.actor.run?.rooms.find((r) => r.id === cmd.room)
                    : undefined;
            if (cmd.type === 'EXIT_RP_MISSION') {
                owner.rp = null;
                owner.checkpoint = 'exploring';
                s.checkpoint = { version: 1, screen: 'Town1', phase: 'exploring' };
            } else if (room?.kind === 'exit') {
                const run = rp.actor.run!;
                const x = cmd.type === 'ENCOUNTER' ? (cmd.x ?? run.x) : run.x;
                const y = cmd.type === 'ENCOUNTER' ? (cmd.y ?? run.y) : run.y;
                if (
                    !Number.isFinite(x) ||
                    !Number.isFinite(y) ||
                    Math.hypot(x - room.x * 32, y - room.y * 32) >= 150 ||
                    run.rooms.some((r) => r.required && !run.cleared.includes(r.id))
                )
                    throw new Error('Clear both chambers and reach the memory exit.');
                owner.quests.records['arens-expedition'].counts['aren-memory'] = 1;
                owner.rp = null;
                owner.checkpoint = 'exploring';
                s.checkpoint = { version: 1, screen: 'Town1', phase: 'exploring' };
                refreshQuests(owner);
            } else {
                const simulation: SaveData = {
                    ...s,
                    data: {
                        ...s.data,
                        rng: rp.rng,
                        activeId: rp.actor.id,
                        characters: [rp.actor],
                        operations: [],
                    },
                };
                const next = reduceCommand(simulation, cmd, operationId);
                s.battleEvents = JSON.parse(JSON.stringify(next.battleEvents ?? []));
                const npc = next.data.characters[0];
                if (!npc.run) owner.rp = null;
                else {
                    rp.actor = JSON.parse(JSON.stringify(npc));
                    rp.rng = JSON.parse(JSON.stringify(next.data.rng));
                }
                s.checkpoint = { ...next.checkpoint };
                owner.checkpoint = next.checkpoint.phase;
            }
        } else if (cmd.type === 'DISMISS_MIGRATION') {
            s.migrationNotice = false;
        } else if (cmd.type === 'NAV') {
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
                quests: emptyJournal(),
                rp: null,
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
                equipment: { ...emptyEquipment(), main: `${cmd.id}-weapon` },
                placements: {},
                inventoryRecovery: [],
                skills: {
                    normal: { rank: 'F', counts: {} },
                    combatMastery: { rank: 'F', counts: {} },
                    defense: { rank: 'F', counts: {} },
                },
                collection: [],
                cooldowns: {},
                effects: {},
                createdAt: cmd.now,
                rebornAt: cmd.now,
                agedAt: cmd.now,
                run: null,
                battle: null,
                reward: null,
                checkpoint: 'exploring',
                tutorial: 0,
                statuses: [],
                titleModifiers: {},
            };
            initializeInventory(c);
            refreshStats(c);
            c.hp = c.stats.hp;
            c.mana = c.stats.mana;
            c.stamina = c.stats.stamina;
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
                c.quests.rebirths.push({ id: operationId, talent: cmd.talent });
                refreshStats(c);
            } else {
                applyAging(c, cmd.now);
                const played = c.rp?.actor ?? c;
                s.checkpoint = {
                    version: 1,
                    screen:
                        played.run?.chosen !== null && played.run?.chests.length
                            ? 'TreasureRoom'
                            : played.checkpoint === 'treasure'
                              ? 'TreasureRoom'
                              : played.battle
                                ? 'Battle'
                                : played.run
                                  ? 'Alby'
                                  : 'Town1',
                    phase: played.checkpoint,
                };
            }
        } else {
            const c = requireCharacter(s);
            switch (cmd.type) {
                case 'ACCEPT_QUEST':
                    acceptQuest(c, cmd.quest, cmd.npc);
                    break;
                case 'QUEST_INTERACT':
                    interactQuest(c, cmd.quest, cmd.step, cmd.npc);
                    break;
                case 'COMPLETE_QUEST':
                    completeQuest(c, cmd.quest, cmd.npc);
                    break;
                case 'TRACK_QUEST':
                    trackQuest(c, cmd.quest, cmd.tracked);
                    break;
                case 'WITHDRAW_QUEST_REWARD':
                    withdrawQuestReward(c, cmd.id);
                    break;
                case 'START_RP_MISSION': {
                    if (
                        cmd.npc !== 'Trainer' ||
                        cmd.quest !== 'arens-expedition' ||
                        c.quests.records[cmd.quest]?.status !== 'active' ||
                        !currentObjectives(c, cmd.quest).some((o) => o.kind === 'rp')
                    )
                        throw new Error('This memory is not available.');
                    c.rp = createMemory(operationId);
                    s.checkpoint = { version: 1, screen: 'Alby', phase: 'exploring' };
                    break;
                }
                case 'EXIT_RP_MISSION':
                    throw new Error('No memory is active.');
                case 'ENTER':
                    c.run = generateDungeon(cmd.seed);
                    c.run.id = `${c.run.id}-${operationId}`;
                    c.run.baseline = {
                        contentVersion: 2,
                        skills: JSON.parse(JSON.stringify(c.skills)),
                        stats: progressionStats(c),
                        equipment: { ...c.equipment },
                    };
                    c.run.baseline.statSnapshot = createStatSnapshot(c);
                    c.run.pageRewards = 0;
                    c.run.quests = snapshotQuests(c);
                    c.effects = {};
                    c.statuses = [];
                    c.cooldowns = {};
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
                        dungeonGrid(c)[Math.floor(cmd.y / 32)]?.[Math.floor(cmd.x / 32)]
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
                        dungeonGrid(c)[Math.floor(cmd.y / 32)]?.[Math.floor(cmd.x / 32)]
                    ) {
                        c.run.x = cmd.x;
                        c.run.y = cmd.y;
                    }
                    const r = c.run?.rooms.find((r) => r.id === cmd.room);
                    if (!r || r.kind === 'entry' || c.run!.cleared.includes(r.id))
                        throw new Error('This room is already clear.');
                    if (r.kind === 'boss' && !bossUnlocked(c.run!))
                        throw new Error(
                            'Defeat all enemies in non-boss rooms before opening the boss gate.',
                        );
                    if (
                        c.role &&
                        c.run!.rooms.some(
                            (room) =>
                                room.required &&
                                room.id < r.id &&
                                !c.run!.cleared.includes(room.id),
                        )
                    )
                        throw new Error('Clear the previous chamber first.');
                    if (r.kind === 'supplies') {
                        c.run!.cleared.push(r.id);
                        c.reward = makeReward(s, `${c.run!.id}-supplies`);
                        s.checkpoint.phase = 'reward';
                        break;
                    }
                    const count = r.kind === 'boss' ? 3 : r.id === 1 ? 1 : r.id === 2 ? 2 : 3;
                    const enemies = Array.from({ length: count }, (_, i) => {
                        const boss = r.kind === 'boss' && i === 0;
                        return {
                            id: `enemy-${i}`,
                            species: 'spider' as const,
                            name: boss ? 'Giant Spider' : r.id > 2 ? 'Red Spider' : 'White Spider',
                            hp: boss ? 115 : r.id > 2 ? 30 : 24,
                            maxHp: boss ? 115 : r.id > 2 ? 30 : 24,
                            attack: boss ? 9 : 4,
                            defense: boss ? 2 : 0,
                            boss,
                            ...enemyProfile({
                                name: r.id > 2 ? 'Red Spider' : 'White Spider',
                                boss,
                            }),
                        };
                    });
                    s.data.rng = encounterBattle(c, r.id, enemies, s.data.rng);
                    s.checkpoint = { version: 1, screen: 'Battle', phase: 'turnStart' };
                    break;
                }
                case 'BEGIN_TURN':
                case 'ENEMY_TURN':
                case 'BATTLE_ACTION':
                case 'BATTLE_ITEM':
                    applyBattleCommand(c, cmd, operationId);
                    s.battleEvents = c.battle!.events.filter(
                        (event) => event.operationId === operationId,
                    );
                    finishActivation(s, c);
                    break;
                case 'LEARN':
                    if (skills[cmd.skill]?.route !== 'lesson')
                        throw new Error('This skill requires a book.');
                    learn(c, cmd.skill);
                    break;
                case 'RANK_UP':
                    advance(c, cmd.skill);
                    break;
                case 'USE_SKILL':
                    useOutsideBattle(c, cmd.skill);
                    break;
                case 'READ': {
                    const item = c.inventory.find((i) => i.id === cmd.id),
                        def = item && items[item.kind];
                    if (!def?.skill) throw new Error('Choose a complete skill book.');
                    learn(c, def.skill);
                    consumeInventoryItem(c, cmd.id);
                    break;
                }
                case 'INSERT_PAGE': {
                    const item = c.inventory.find((i) => i.id === cmd.id),
                        page = item && items[item.kind].page;
                    const book = c.inventory.find((i) => i.kind === 'finalCollection');
                    if (!page || !book || c.skills.final || c.collection.includes(page))
                        throw new Error('Requires an incomplete book and a missing page.');
                    c.collection.push(page);
                    c.collection.sort();
                    consumeInventoryItem(c, cmd.id);
                    if (c.collection.length === 5) {
                        consumeInventoryItem(c, book.id);
                        addInventoryItem(c, { id: operationId, kind: 'finalBook', count: 1 });
                    }
                    break;
                }
                case 'CLAIM': {
                    const r = c.reward;
                    if (!r) throw new Error('No rewards available.');
                    for (const id of new Set(cmd.ids)) {
                        const item = r.items.find((i) => i.id === id);
                        if (!item || r.claimed.includes(id)) continue;
                        addInventoryItem(c, { ...item });
                        r.claimed.push(id);
                    }
                    if (cmd.gold && !r.claimed.includes('gold')) {
                        c.gold += r.gold;
                        r.claimed.push('gold');
                    }
                    if (cmd.advance) {
                        if (s.checkpoint.screen === 'TreasureRoom') finishRun(s, c, true);
                        else leaveReward(s, c);
                    }
                    break;
                }
                case 'LEAVE_REWARD': {
                    leaveReward(s, c);
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
                    finishRun(s, c, cmd.type === 'CONTINUE');
                    break;
                case 'BUY': {
                    const def = items[cmd.kind];
                    if (!def || !shops[cmd.shop]?.includes(cmd.kind))
                        throw new Error('This item is not available.');
                    if (c.gold < def.price) throw new Error('Not enough gold.');
                    addInventoryItem(c, {
                        id: operationId,
                        kind: cmd.kind,
                        count: 1,
                        ...(def.type === 'weapon' ? { durability: 20 } : {}),
                    });
                    c.gold -= def.price;
                    break;
                }
                case 'SELL': {
                    const item = c.inventory.find((i) => i.id === cmd.id);
                    if (!item) throw new Error('Item not found.');
                    if (equippedSlot(c, item.id))
                        throw new Error('Unequip the item before selling.');
                    c.gold += Math.floor(items[item.kind].price / 4);
                    consumeInventoryItem(c, item.id);
                    break;
                }
                case 'EQUIP': {
                    const item = c.inventory.find((i) => i.id === cmd.id);
                    const slot = cmd.slot ?? (item && items[item.kind].slots?.[0]);
                    if (!slot) throw new Error('This item cannot be equipped.');
                    equipItem(c, cmd.id, slot);
                    break;
                }
                case 'UNEQUIP':
                    if (!equippedSlot(c, cmd.id)) throw new Error('This item is not equipped.');
                    moveItem(c, cmd.id, cmd.anchor);
                    break;
                case 'MOVE_ITEM':
                    if (equippedSlot(c, cmd.id)) throw new Error('Use Unequip in town first.');
                    moveItem(c, cmd.id, cmd.anchor);
                    break;
                case 'DROP_ITEM':
                    consumeInventoryItem(c, cmd.id, cmd.quantity);
                    break;
                case 'WITHDRAW_RECOVERY': {
                    const item = c.inventoryRecovery.find((i) => i.id === cmd.id);
                    if (!item) throw new Error('Recovery item not found.');
                    addInventoryItem(c, { ...item });
                    c.inventoryRecovery.splice(c.inventoryRecovery.indexOf(item), 1);
                    break;
                }
                case 'USE': {
                    if (s.checkpoint.screen === 'Battle') {
                        if (cmd.turnId !== c.battle!.turnId)
                            throw new Error('This turn has already ended.');
                        applyBattleCommand(
                            c,
                            { type: 'BATTLE_ITEM', id: cmd.id, ...turnIdentity(c) },
                            operationId,
                        );
                        s.battleEvents = c.battle!.events.filter(
                            (event) => event.operationId === operationId,
                        );
                    } else consumeItem(c, cmd.id);
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
                    if (cmd.deposit && equippedSlot(c, item.id))
                        throw new Error('Unequip this item first.');
                    if (cmd.deposit) addItem(target, { ...item }, 60);
                    else addInventoryItem(c, { ...item });
                    source.splice(source.indexOf(item), 1);
                    if (cmd.deposit) delete c.placements[item.id];
                    break;
                }
            }
            recordDefeats(c);
            if (c.hp <= 0) {
                bankRunQuests(c, false);
                c.run = null;
                c.effects = {};
                c.statuses = [];
                c.cooldowns = {};
                refreshStats(c);
                c.battle = null;
                c.reward = null;
                c.hp = c.stats.hp;
                c.mana = c.stats.mana;
                c.stamina = c.stats.stamina;
                s.checkpoint = { version: 1, screen: 'Town1', phase: 'exploring' };
            }
            refreshStats(c);
            c.checkpoint = s.checkpoint.phase;
        }
        for (const hero of s.data.characters) {
            refreshStats(hero);
            if (
                !hero.role &&
                !hero.run &&
                !hero.rp &&
                s.checkpoint.screen === 'Town1' &&
                hero.id === s.data.activeId
            )
                reconcileQuests(hero);
        }
        s.data.revision++;
        s.data.operations.push(operationId);
        if (s.data.operations.length > 256) s.data.operations.shift();
    });
}
/** Headless entry point uses the complete transaction, including rewards and RP ownership. */
export function executeBattleCommand(
    save: Immutable<SaveData>,
    command: BattleCommand,
    operationId: string,
) {
    const state = reduceCommand(save, command, operationId);
    return { state, events: state === save ? [] : (state.battleEvents ?? []) };
}