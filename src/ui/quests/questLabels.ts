import type { QuestCondition, QuestDefinition } from '../../data/schemas/quests';
import type { ContentRegistry } from '../../engine/data/ContentRegistry';
import type { Hero } from '../../engine/rpg/Character';
import { questReady } from '../../engine/rpg/Quests';
import type { JourneyView } from '../../game/JourneySession';
import { distance } from '../../engine/world/TileMap';

export const categoryLabel = { mainstream: 'Story', sidequest: 'Town requests', skill: 'Skills' };
export function questStatus(hero: Hero, quest: QuestDefinition) {
  const record = hero.quests[quest.id];
  return !record
    ? 'Locked'
    : record.status === 'completed'
      ? 'Completed'
      : record.status === 'available'
        ? 'Available'
        : questReady(hero, quest)
          ? 'Ready to claim'
          : 'Active';
}
export function npcLabel(content: ContentRegistry, npc?: { worldId: string; objectId: string }) {
  const world = content.data.worlds.find((w) => w.id === npc?.worldId);
  const object = world?.objects.find((o) => o.id === npc?.objectId);
  return object ? `${object.name} · ${world!.name}` : 'town';
}
export function questNpcOpen(view: JourneyView, npc?: { worldId: string; objectId: string }) {
  if (view.state.pending || view.state.dungeon || !view.map.theme) return false;
  if (!npc) return true;
  const object = view.map.objects.find((o) => o.id === npc.objectId);
  return (
    view.map.id === npc.worldId &&
    view.activeService === npc.objectId &&
    !!object &&
    distance(object, view.state.position) <= 1
  );
}
export function conditionLabel(c: QuestCondition | undefined, content: ContentRegistry): string {
  if (!c) return 'No prerequisites';
  switch (c.kind) {
    case 'all':
      return c.conditions.map((c) => `(${conditionLabel(c, content)})`).join(' and ');
    case 'any':
      return c.conditions.map((c) => `(${conditionLabel(c, content)})`).join(' or ');
    case 'quest':
      return `Complete ${content.data.quests.find((q) => q.id === c.questId)?.name}`;
    case 'level':
      return `Level ${c.level}`;
    case 'talent':
      return `${c.talent} talent`;
    case 'skill':
      return `${content.skill(c.skillId).name} Rank ${c.rank} or higher`;
    case 'item':
      return `${c.equipped ? 'Equip' : 'Own'} ${content.item(c.itemId).name} ×${c.quantity}`;
    case 'flag':
      return `Story flag: ${c.flagId}`;
  }
}
export function rewardLabels(quest: QuestDefinition, content: ContentRegistry) {
  const r = quest.rewards;
  return [
    r.experience ? `${r.experience} XP` : '',
    r.gold ? `${r.gold} gold` : '',
    r.ap ? `${r.ap} AP` : '',
    ...r.items.map((i) => `${content.item(i.itemId).name} ×${i.quantity}`),
    ...r.skills.map((id) => `${content.skill(id).name} · Rank F`),
    ...r.titles.map((id) => `Title: ${content.data.titles.find((t) => t.id === id)!.name}`),
    ...r.flags.map(() => 'Story progression'),
  ].filter(Boolean);
}
