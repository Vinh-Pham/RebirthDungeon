import { define } from './define';
const skill = define('Power Shot', 'bow', 4, 2, 0.4, 6, { talent: 'Archery' });
skill.description = 'Fire a strong arrow at one enemy.';
export default skill;
