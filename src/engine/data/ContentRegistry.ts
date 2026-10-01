import { ContentSchema, type GameContent, type ActorDefinition, type Skill } from '../../data/schemas/content';
import type { Entity } from '../ecs/Entity';
import { createHealth } from '../ecs/components/Health';

/** All external definitions pass through one validating boundary before use. */
export class ContentRegistry {
  readonly data: GameContent;
  constructor(raw: unknown) {
    this.data = ContentSchema.parse(raw);
    const freeze = (value: unknown): void => {
      if (!value || typeof value !== 'object' || Object.isFrozen(value)) return;
      Object.values(value).forEach(freeze); Object.freeze(value);
    };
    this.data.enchants.forEach(freeze); freeze(this.data.enchantingRules); this.data.quests.forEach(freeze); this.data.titles.forEach(freeze);
    for (const skill of this.data.skills) if (skill.gameRanks) {
      for (const rank of Object.values(skill.gameRanks)) {
        rank.objectives.forEach(Object.freeze); Object.freeze(rank.objectives);
        if (rank.statBonuses) Object.freeze(rank.statBonuses);
        Object.freeze(rank);
      }
      Object.freeze(skill.gameRanks);
    }
  }

  skill(id: string): Skill {
    const skill = this.data.skills.find((entry) => entry.id === id);
    if (!skill) throw new Error(`Unknown skill: ${id}`);
    return skill;
  }

  item(id: string) {
    const item = this.data.items.find((entry) => entry.id === id);
    if (!item) throw new Error(`Unknown item: ${id}`);
    return item;
  }
  status(id: string) {
    const status = this.data.statusEffects.find((entry) => entry.id === id);
    if (!status) throw new Error(`Unknown status: ${id}`);
    return status;
  }

  spawn(definitionId: string, entityId: string, side: 'player' | 'enemy', x: number, y: number): Entity {
    const definitions = side === 'player' ? this.data.classes : this.data.enemies;
    const definition: ActorDefinition | undefined = definitions.find((entry) => entry.id === definitionId);
    if (!definition) throw new Error(`Unknown ${side} definition: ${definitionId}`);
    return { id: entityId, name: definition.name, [side]: true, position: { x, y },
      health: createHealth(definition.maxHealth), ...(definition.maxStamina ? { stamina: { current: definition.maxStamina, max: definition.maxStamina }, wounds: 0, fullness: 100 } : {}), mana: { current: definition.maxMana, max: definition.maxMana },
      combatant: { ...definition.combatant }, skills: [...definition.skills], sprite: { ...definition.sprite, idleFrames: definition.sprite.idleFrames ? [...definition.sprite.idleFrames] : undefined } };
  }
}
