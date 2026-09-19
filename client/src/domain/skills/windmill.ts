import { define } from './define';
const skill = define('Windmill', 'melee', 2, 1, 0.25, 8, { target: 'all', cooldown: 1 });
skill.description = 'Strike every living enemy once with the same hand of dice.';
export default skill;