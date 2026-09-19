import { define } from './define';
const skill = define('Blood Strike', 'melee', 8, 2, 0.4, 3, {
    description:
        'Pay 4 HP and 3 SP to strike one enemy. The HP payment bypasses shields and must leave at least 1 HP.',
    talent: 'Close Combat',
    category: 'Combat',
    adaptation: 'Original Rebirth Dungeon skill demonstrating nonlethal, mixed-resource costs.',
});
for (const rank of skill.ranks) rank.costs.hp = 4;
export default skill;