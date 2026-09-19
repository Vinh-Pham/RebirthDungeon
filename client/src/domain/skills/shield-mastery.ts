import { define } from './define';
const skill = define('Shield Mastery', 'shield', 1, 1, 0, {
    type: 'passive',
    effect: 'passive',
});
skill.description = 'Improve physical and magical defenses while a shield is equipped.';
export default skill;