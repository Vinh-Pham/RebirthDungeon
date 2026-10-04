import { z } from 'zod';
import {
  CommandSchema,
  CommandRequestSchema,
  PreviewRequestSchema,
  type OnlineCommand,
} from './Contracts';

export const ACTION_ROUTES = {
  MOVE: '/journey/move',
  TRAVEL_TO: '/journey/travel',
  INTERACT: '/journey/interact',
  CLOSE_SERVICE: '/services/close',
  USE_ITEM: '/inventory/use',
  DROP_ITEM: '/inventory/drop',
  SET_ITEM_HOTBAR: '/inventory/hotbar',
  EXIT_DUNGEON: '/dungeon/exit',
  START_REST: '/rest/start',
  STOP_REST: '/rest/stop',
  REST_PULSE: '/rest/pulse',
  BUY_ITEM: '/services/{objectId}/purchases',
  SELL_ITEM: '/services/{objectId}/sales',
  REPAIR_WEAPON: '/services/{objectId}/repairs',
  HEAL: '/services/{objectId}/healing',
  OFFER_ITEM: '/services/{objectId}/offerings',
  APPLY_ENCHANT: '/enchanting/apply',
  BURN_EQUIPMENT: '/enchanting/burn',
  LOCK_EQUIPMENT: '/equipment/lock',
  EQUIP_WEAPON: '/equipment/weapon',
  EQUIP_ARMOR: '/equipment/armor',
  EQUIP_AMMUNITION: '/equipment/ammunition',
  UNEQUIP_ITEM: '/equipment/unequip',
  SELECT_TITLE: '/titles/select',
  UNLOCK_TITLE_COUPON: '/titles/coupons/redeem',
  ACCEPT_QUEST: '/quests/{questId}/accept',
  CLAIM_QUEST: '/quests/{questId}/claim',
  TRACK_QUEST_OBJECTIVE: '/quests/{questId}/objectives/{objectiveId}/track',
  LEARN_SKILL: '/skills/{skillId}/learn',
  RANK_UP_SKILL: '/skills/{skillId}/rank-up',
  READ_SKILL_BOOK: '/skills/books/read',
  INSERT_SKILL_PAGE: '/skills/books/{recipeId}/pages',
  BATTLE_ACTION: '/encounter/actions',
  SETTLE_ENCOUNTER: '/encounter/settlement',
} as const satisfies Record<OnlineCommand['type'], string>;
export const actionDefinitions = CommandSchema.options.map((commandSchema) => {
  const type = commandSchema.shape.type.value;
  const path = ACTION_ROUTES[type];
  const keys = [...path.matchAll(/\{(\w+)\}/g)].map((match) => match[1]);
  const body = z.strictObject({
    ...Object.fromEntries(
      Object.entries(commandSchema.shape).filter(([key]) => key !== 'type' && !keys.includes(key)),
    ),
    commandId: CommandRequestSchema.shape.commandId,
    expectedRevision: CommandRequestSchema.shape.expectedRevision,
  });
  const fields = commandSchema.shape as Record<string, z.ZodType>;
  const params = z.strictObject({
    id: z.string().uuid(),
    ...Object.fromEntries(keys.map((key) => [key, fields[key]])),
  });
  return { type, path, keys, body, params, commandSchema };
});
export function actionRequest(characterId: string, request: z.input<typeof CommandRequestSchema>) {
  const input = CommandRequestSchema.parse(request);
  const definition = actionDefinitions.find((action) => action.type === input.command.type)!;
  const command = input.command as unknown as Record<string, unknown>;
  const path =
    '/api/game/characters/' +
    encodeURIComponent(characterId) +
    definition.path.replace(/\{(\w+)\}/g, (_, key: string) =>
      encodeURIComponent(String(command[key])),
    );
  const body = definition.body.parse({
    commandId: input.commandId,
    expectedRevision: input.expectedRevision,
    ...Object.fromEntries(
      Object.entries(command).filter(([key]) => key !== 'type' && !definition.keys.includes(key)),
    ),
  });
  return { path, body };
}
export const PREVIEW_ROUTES = {
  EQUIPMENT: '/equipment/preview',
  ENCHANT: '/enchanting/preview',
  BURN: '/enchanting/burn-preview',
} as const;
export const previewDefinitions = PreviewRequestSchema.shape.selection.options.map((selection) => ({
  type: selection.shape.type.value,
  path: PREVIEW_ROUTES[selection.shape.type.value],
  body: z.strictObject({
    ...Object.fromEntries(Object.entries(selection.shape).filter(([key]) => key !== 'type')),
    expectedRevision: CommandRequestSchema.shape.expectedRevision,
  }),
}));
export function previewRequest(characterId: string, input: z.input<typeof PreviewRequestSchema>) {
  const parsed = PreviewRequestSchema.parse(input);
  const { type, ...selection } = parsed.selection;
  return {
    path: '/api/game/characters/' + encodeURIComponent(characterId) + PREVIEW_ROUTES[type],
    body: { expectedRevision: parsed.expectedRevision, ...selection },
  };
}
