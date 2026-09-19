import { define } from './define';
const skill = define('Normal Attack', 'any', 0, 0, 2, { route: 'starter', icon: '⚔' });
skill.description = 'Strike one enemy with your equipped weapon, or fight unarmed.';
export default skill;