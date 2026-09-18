import { define } from './define';
const skill = define('Dual Wield Mastery', 'dual', 1, 1, 0, 0, {
    type: 'passive',
    effect: 'passive',
});
skill.description = 'Strengthen attacks made with distinct swords equipped in both hands.';
export default skill;
