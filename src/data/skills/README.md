# Skill catalog

`basic.json` contains the 33 skills in `docs/skills/normalized/`. Each entry retains
the source URL, retrieval date, all rank F–1 effect descriptions, and the complete
rank table. `reference.ranks` defines the column order for `reference.rows`.
Race-specific values, percentages, charges, cooldowns, and resource costs remain
unaltered in these reference tables.

The current battle engine uses integer mana and additive attack power. Its rank F
adapters use the minimum listed damage/healing for Firebolt (7), Icebolt (10),
Lightning Bolt (1), and Healing (6). Firebolt's Human mana cost of 1.5 is rounded
up to 2; the other mana costs are 1, 2, and 12 respectively. Bolts add `power` to
the caster's attack under the existing battle rules. Healing restores one charge
to one ally, including the caster. These adapters do not implement charge loading,
racial modifiers, magic attack scaling, critical healing, or Icebolt's slowing.
No burn status is attached to Firebolt: the source does not specify one.

Other skills have `battleUsable: false` until their mechanics are implemented.
Their zero `manaCost`/`power` and self-targeted buff fields are compatibility
placeholders, not statements of their documented effects. Battle selection and
direct skill resolution reject them. The codex shows source descriptions and
availability instead of these placeholders. The Warden starts with the four
supported skills.

`range-attack-candidate.json` is a duplicate scrape candidate, not another skill.
`wand-mastery.json` contains an empty wiki page and provides no skill definition;
neither is included in the catalog.
