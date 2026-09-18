import { define } from './define';
const skill = define('Final Hit', 'melee', 2, 1, 0.1, 8, {
    effect: 'buff',
    target: 'self',
    route: 'collection',
    cooldown: 4,
});
skill.description =
    'Spend this turn gaining a temporary melee attack bonus. The hand determines its strength; subsequent attacks still cost resources.';
export default skill;
