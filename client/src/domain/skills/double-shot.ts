import { define } from './define';
const skill = define('Double Shot', 'guns', 1, 1, 6, { talent: 'Dual Gun', hits: 2 });
skill.description = 'Fire two shots at one enemy using one action and one payment.';
export default skill;