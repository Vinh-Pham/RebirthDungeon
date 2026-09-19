import type { Objective, QuestDefinition, QuestNpc } from './types';
const talk = (id: string, npc: QuestNpc, label: string): Objective => ({
    id,
    kind: 'talk',
    npc,
    label,
    target: 1,
});
const stage = (id: string, notes: string, ...objectives: Objective[]) => ({
    id,
    notes,
    objectives,
});
const story = { chapter: 'beneath-the-ruins', generation: 'broken-seal' };
export const chapterTitle = 'Chapter 1: Beneath the Ruins';
export const generationTitle = 'G1: The Broken Seal';
export const quests: Record<string, QuestDefinition> = Object.fromEntries(
    (
        [
            {
                id: 'arens-warning',
                title: 'Aren’s Warning',
                description: 'The combat instructor has news about the northern ruins.',
                notes: 'Aren has noticed spiders gathering beyond the north gate. Find him beside the Blacksmith before setting out.',
                category: 'Mainstream Quests',
                ...story,
                prerequisites: [],
                delivery: { kind: 'automatic' },
                stages: [
                    stage(
                        'warning',
                        'Ask Aren about Alby Dungeon.',
                        talk('hear-warning', 'Trainer', 'Speak with Aren'),
                    ),
                ],
                rewards: { gold: 50, xp: 100 },
            },
            {
                id: 'clear-alby',
                title: 'Clear Alby Dungeon',
                description: 'Break the seals and defeat the Giant Spider.',
                notes: 'Enter Alby at the north gate. Defeat all enemies in the non-boss chambers, defeat the Giant Spider, choose a treasure chest, and return home. Leaving early does not clear the dungeon.',
                category: 'Mainstream Quests',
                ...story,
                prerequisites: [{ kind: 'claimed', quest: 'arens-warning' }],
                delivery: { kind: 'automatic' },
                stages: [
                    stage('clear', 'Return through the treasure room after victory.', {
                        id: 'alby-victory',
                        kind: 'clear',
                        dungeon: 'alby',
                        target: 1,
                        label: 'Clear Alby Dungeon',
                    }),
                ],
                rewards: { gold: 500, xp: 900 },
            },
            {
                id: 'arens-expedition',
                title: 'Aren’s First Expedition',
                description: 'Experience the memory behind Aren’s warning.',
                notes: 'Aren remembers his own first expedition. Borrow his younger self’s equipment and abilities; your hero’s belongings remain safe. Memories grant no ordinary loot or training.',
                category: 'Mainstream Quests',
                ...story,
                prerequisites: [{ kind: 'claimed', quest: 'clear-alby' }],
                delivery: { kind: 'automatic' },
                stages: [
                    stage(
                        'memory',
                        'Speak with Aren to enter the memory. Clear both chambers and reach the exit.',
                        {
                            id: 'aren-memory',
                            kind: 'rp',
                            scenario: 'aren-memory',
                            target: 1,
                            label: 'Complete Aren’s memory',
                        },
                    ),
                    stage(
                        'report',
                        'Return to Aren and share what you learned.',
                        talk('memory-report', 'Trainer', 'Report to Aren'),
                    ),
                ],
                rewards: { gold: 200, xp: 400, ap: 2 },
            },
            {
                id: 'kill-spiders',
                title: 'Kill 5 Spiders',
                description: 'Make the paths beneath Alby a little safer.',
                notes: 'White, Red, and Giant Spiders in Alby count. Defeats are banked whenever you return to town, even after defeat or an early exit. Aren’s memory does not count.',
                category: 'Hunting Quests',
                prerequisites: [],
                delivery: { kind: 'automatic' },
                stages: [
                    stage('hunt', 'Defeat spiders in one or more Alby runs.', {
                        id: 'spiders',
                        kind: 'defeat',
                        species: 'spider',
                        target: 5,
                        label: 'Defeat spiders',
                    }),
                ],
                rewards: { gold: 100, xp: 200 },
            },
            {
                id: 'silk-for-nell',
                title: 'Silk for Nell',
                description: 'Nell needs silk for a new batch of supplies.',
                notes: 'Accept at the General Shop. Bring three Spider Silk in your backpack; banked silk does not count. Completing this quest consumes the silk.',
                category: 'Collecting Quests',
                prerequisites: [],
                delivery: { kind: 'npc', npc: 'General' },
                stages: [
                    stage('delivery', 'Bring the silk to Nell at the General Shop.', {
                        id: 'silk',
                        kind: 'deliver',
                        npc: 'General',
                        item: 'silk',
                        target: 3,
                        label: 'Deliver Spider Silk to Nell',
                    }),
                ],
                rewards: { gold: 120, xp: 150 },
            },
            {
                id: 'forge-supplies',
                title: 'Supplies for the Forge',
                description: 'Bring Bram a meal for a long day at the forge.',
                notes: 'Accept at the Blacksmith. Fresh Bread is sold at Mara’s Grocery Store. Bring two in your backpack. This beginner job can be completed once.',
                category: 'Part-Time Job',
                prerequisites: [],
                delivery: { kind: 'npc', npc: 'Blacksmith' },
                stages: [
                    stage('delivery', 'Bring two Fresh Bread to Bram.', {
                        id: 'bread',
                        kind: 'deliver',
                        npc: 'Blacksmith',
                        item: 'bread',
                        target: 2,
                        label: 'Deliver Fresh Bread to Bram',
                    }),
                ],
                rewards: { gold: 80, xp: 100 },
            },
            {
                id: 'healers-welcome',
                title: 'A Healer’s Welcome',
                description: 'Meet the people who help adventurers recover.',
                notes: 'Elara wants you to know where to find supplies. Accept her request, speak to Nell, then return to Elara.',
                category: 'Sidequests',
                prerequisites: [],
                delivery: { kind: 'npc', npc: 'Healer' },
                stages: [
                    stage(
                        'visit',
                        'Ask Nell about supplies.',
                        talk('meet-nell', 'General', 'Speak with Nell'),
                    ),
                    stage(
                        'return',
                        'Tell Elara you found the shop.',
                        talk('report-elara', 'Healer', 'Return to Elara'),
                    ),
                ],
                rewards: { gold: 50, xp: 100, items: [{ kind: 'hp', count: 2 }] },
            },
            {
                id: 'steady-blade',
                title: 'A Steady Blade',
                description: 'Aren recognizes your progress in Sword Mastery.',
                notes: 'Reach Sword Mastery Rank E or better by training and spending AP. Training points alone do not unlock this quest.',
                category: 'Skills',
                prerequisites: [{ kind: 'rank', skill: 'swordMastery', rank: 'E' }],
                delivery: { kind: 'automatic' },
                stages: [
                    stage(
                        'recognition',
                        'Discuss your training with Aren.',
                        talk('blade-report', 'Trainer', 'Speak with Aren'),
                    ),
                ],
                rewards: { ap: 2, xp: 150 },
            },
            {
                id: 'patience-before-power',
                title: 'Patience Before Power',
                description: 'Learn why patience matters as much as a strong strike.',
                notes: 'After reaching Smash Rank E, accept Aren’s lesson. Defeat three spiders with a sword equipped in Alby, return to town, then report. Already knowing Counterattack preserves your existing training.',
                category: 'Skills',
                prerequisites: [{ kind: 'rank', skill: 'smash', rank: 'E' }],
                delivery: { kind: 'npc', npc: 'Trainer' },
                stages: [
                    stage('trial', 'Defeat three Alby spiders with a sword equipped.', {
                        id: 'sword-spiders',
                        kind: 'defeat',
                        species: 'spider',
                        sword: true,
                        target: 3,
                        label: 'Defeat spiders with a sword',
                    }),
                    stage(
                        'report',
                        'Ask Aren to teach Counterattack.',
                        talk('patience-report', 'Trainer', 'Report to Aren'),
                    ),
                ],
                rewards: { skill: 'counter', xp: 200 },
            },
            {
                id: 'sword-first-lesson',
                title: 'A Swordsman’s First Lesson',
                description: 'Learn the foundations of using a sword.',
                notes: 'Equipping a legal sword makes this lesson available. Speak with Aren to learn Sword Mastery at Rank F. An already learned mastery keeps its rank and training.',
                category: 'Skills',
                prerequisites: [{ kind: 'sword' }],
                delivery: { kind: 'automatic' },
                stages: [
                    stage(
                        'lesson',
                        'Ask Aren about sword technique.',
                        talk('sword-lesson', 'Trainer', 'Speak with Aren'),
                    ),
                ],
                rewards: { skill: 'swordMastery' },
            },
            {
                id: 'path-of-magic',
                title: 'The Path of Magic',
                description: 'A new life brings a new way to see the world.',
                notes: 'Rebirth into the Magic talent, then speak with Aren. Creating a character with Magic does not satisfy this milestone.',
                category: 'Skills',
                prerequisites: [{ kind: 'rebirth', talent: 'Magic' }],
                delivery: { kind: 'automatic' },
                stages: [
                    stage(
                        'guidance',
                        'Discuss your new path with Aren.',
                        talk('magic-guidance', 'Trainer', 'Speak with Aren'),
                    ),
                ],
                rewards: { ap: 1, items: [{ kind: 'mana', count: 2 }] },
            },
        ] satisfies QuestDefinition[]
    ).map((q) => [q.id, q]),
);