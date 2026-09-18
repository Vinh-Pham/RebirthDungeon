import { define } from './define';
const skill = define('Double Shot', 'guns', 1, 1, 0.15, 6, { talent: 'Dual Gun', hits: 2 });
skill.description = 'Fire two shots at one enemy using one hand of dice and one payment.';
export default skill;
