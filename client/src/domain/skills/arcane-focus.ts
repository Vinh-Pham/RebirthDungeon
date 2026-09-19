import { define } from './define';
export default define('Arcane Focus', 'magic', 0, 0, 0, 6, {
    description:
        'Spend 6 MP to gain +6 Magic Attack for three subsequent activations. Reapplying refreshes duration without stacking.',
    resource: 'mana',
    talent: 'Magic',
    category: 'Magic',
    effect: 'status',
    target: 'self',
    appliedStatuses: [{ id: 'arcaneFocus', target: 'self' }],
    adaptation: 'Original Rebirth Dungeon skill for the stats system; not a Mabinogi wiki skill.',
});