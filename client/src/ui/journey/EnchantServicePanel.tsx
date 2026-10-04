import FeatureGate from '../shared/FeatureGate';
import { heroFeatures } from '../../game/FeatureReads';
import type { z } from 'zod';
import type { PreviewResponseSchema } from '@rebirth/game-core/online/Contracts';
import GameImage from '../shared/GameImage';
import { trainingPoints } from '../../engine/rpg/Skills';
import { useQueryClient } from '@tanstack/react-query';
import { useSyncExternalStore, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import type { GameplayProgressionCommand as ProgressionCommand } from '../../game/Gameplay';
import { ownedEquipment, type EquipmentReference } from '../../engine/rpg/Character';
import { compatibleEnchant } from '../../engine/rpg/Enchants';
import { clauseActive, conditionText } from '../../engine/rpg/EnchantEffects';
import type { GameplayJourney as JourneySession } from '../../game/Gameplay';
import { menu } from '../menu/MenuUI';
import { DungeonButton as Button, DungeonCard, DungeonNotice } from '../shared/DungeonUI';
import EquipmentEnchants, { enchantStatLabel } from './EquipmentEnchants';
import InventoryPager, { INVENTORY_PAGE_SIZE, inventoryPage } from './InventoryPager';
import { inventoryRowLabel, inventoryRows } from './inventoryRows';

type ApplyQuote = Extract<z.infer<typeof PreviewResponseSchema>['preview'], { type: 'ENCHANT' }> & {
  mode: 'apply';
  command: ProgressionCommand;
};
type BurnQuote = Extract<z.infer<typeof PreviewResponseSchema>['preview'], { type: 'BURN' }> & {
  mode: 'burn';
  command: ProgressionCommand;
};
type Quote = ApplyQuote | BurnQuote;
function EnchantServicePanelLoaded({
  session,
  objectId,
  busy,
  progress,
  back,
}: {
  session: JourneySession;
  objectId: string;
  busy: boolean;
  progress(command: ProgressionCommand): void;
  back(): void;
}) {
  const view = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot);
  const { revision } = view,
    hero = heroFeatures(session, ['inventory', 'equipment', 'skills'], view),
    content = session.content;
  const [target, setTarget] = useState<EquipmentReference>();
  const [scrollId, setScrollId] = useState<string>();
  const [powderId, setPowderId] = useState<string>();
  const [page, setPage] = useState(0);
  const [quote, setQuote] = useState<Quote>();
  const [error, setError] = useState<string>();
  const pending = useRef<Quote | undefined>(undefined);
  const equipment = target
    ? 'weaponId' in target
      ? hero.weapons[target.weaponId]
      : hero.armors[target.armorId]
    : undefined;
  const item = equipment ? content.item(equipment.itemId) : undefined;
  const rows = inventoryRows(hero, content).filter((r) => !('itemId' in r.reference));
  const scrolls = Object.keys(hero.inventory)
    .map((id) => content.item(id))
    .filter((i) => i.kind === 'enchantScroll');
  const powders = Object.keys(hero.inventory)
    .map((id) => content.item(id))
    .filter((i) => content.data.enchantingRules?.powderBonusBp[i.id] !== undefined);
  const queries = useQueryClient();
  const [previewBusy, setPreviewBusy] = useState(false);
  const makeQuote = async (mode: 'apply' | 'burn') => {
    if (!target || busy || previewBusy) return;
    try {
      setError(undefined);
      setPreviewBusy(true);
      const selection =
        mode === 'burn'
          ? { type: 'BURN' as const, target }
          : { type: 'ENCHANT' as const, target, scrollId: scrollId!, powderId: powderId! };
      const result = await queries.fetchQuery({
        queryKey: session.previewKey(selection),
        queryFn: ({ signal }) => session.preview(selection, revision, signal),
        staleTime: Infinity,
        retry: false,
        networkMode: session.source === 'local' ? 'always' : 'online',
      });
      if (session.getSnapshot().revision !== revision)
        throw new Error('This preview is out of date. Preview again.');
      let next: Quote;
      if (mode === 'burn') {
        if (result.preview.type !== 'BURN') throw new Error('Unexpected preview response.');
        next = { ...result.preview, mode, command: { type: 'BURN_EQUIPMENT', objectId, target } };
      } else {
        if (result.preview.type !== 'ENCHANT') throw new Error('Unexpected preview response.');
        next = {
          ...result.preview,
          mode,
          command: {
            type: 'APPLY_ENCHANT',
            objectId,
            target,
            scrollId: scrollId!,
            powderId: powderId!,
          },
        };
      }
      pending.current = next;
      setQuote(next);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'This operation is unavailable.');
    } finally {
      setPreviewBusy(false);
    }
  };
  const cancel = () => {
    pending.current = undefined;
    setQuote(undefined);
  };
  const confirm = () => {
    if (!pending.current || busy || previewBusy) return;
    if (session.getSnapshot().revision !== revision) {
      cancel();
      setError('Preview again after the character changed.');
      return;
    }
    const next = pending.current;
    pending.current = undefined;
    setQuote(undefined);
    progress(next.command);
  };
  const reset = () => {
    cancel();
    setTarget(undefined);
    setScrollId(undefined);
    setPowderId(undefined);
    setError(undefined);
  };
  return (
    <View className="gap-3">
      <Text className="text-accent" accessibilityRole="header" style={menu.heading}>
        Enchant equipment
      </Text>
      <Text className="text-muted" style={menu.body}>
        {hero.learnedSkills.enchant
          ? `Enchant rank ${hero.learnedSkills.enchant.rank} · ${trainingPoints(content.skill('enchant'), hero.learnedSkills.enchant)} / 100 training`
          : 'Learn Enchant from the refuge keeper first.'}{' '}
        · {hero.mana} MP available
      </Text>
      <DungeonNotice message={error} />
      {quote ? (
        <DungeonCard>
          <Text className="text-accent" accessibilityRole="header" style={menu.heading}>
            {quote.mode === 'burn' ? `Destroy ${quote.item.name}?` : `Apply ${quote.enchant.name}?`}
          </Text>
          <GameImage kind="item" id={quote.item.id} size={64} />
          <Text className="text-foreground" style={menu.body}>
            {quote.item.name} · Copy {Object.values(quote.target)[0].split('-')[1]}
            {'weaponId' in quote.target
              ? ` · ${hero.weapons[quote.target.weaponId]?.durability}/${quote.item.maxDurability} durability`
              : ''}
          </Text>
          <EquipmentEnchants equipment={quote.equipment} facts={hero} content={content} />
          {quote.mode === 'apply' ? (
            <>
              <Text className="text-foreground" style={menu.body}>
                Rank {quote.enchant.rank} · {quote.enchant.slot} ·{' '}
                {(quote.chanceBp / 100).toFixed(2)}% success · Town INT {quote.intelligence}
              </Text>
              <Text className="text-muted" style={menu.body}>
                Replaces the {quote.enchant.slot} shown above
                {quote.overwritten ? ', including its saved values' : ' (currently empty)'}. The
                other slot stays. Reapplying may roll lower values.
              </Text>
              {quote.enchant.clauses.map((clause) => (
                <Text key={clause.id} className="text-muted" style={menu.body}>
                  {clause.min >= 0 ? '+' : ''}
                  {clause.min}
                  {clause.max !== clause.min ? ` to +${clause.max}` : ''}{' '}
                  {enchantStatLabel[clause.stat]}
                  {clause.conditions.length
                    ? ` · ${clauseActive(clause.conditions, hero) ? 'Active' : 'Inactive'}: requires ${conditionText(clause.conditions, content)}`
                    : ' · Always active'}
                </Text>
              ))}
              <Text className="text-foreground" style={menu.body}>
                Cost: {quote.costs.scrollCount} {content.item(quote.scrollId).name},{' '}
                {quote.costs.powderCount} {content.item(quote.powderId).name},{' '}
                {quote.costs.manaCost} MP. No AP.
              </Text>
              <Text className="text-muted" style={menu.body}>
                Protect Equipment: success and failure spend the full cost. Failure preserves
                equipment, durability and both enchants. Increasing a maximum does not refill
                resources.
              </Text>
            </>
          ) : (
            <>
              <Text className="text-foreground" style={menu.body}>
                Permanently consumes this copy, its durability and both enchants, including its
                equipped assignment.
              </Text>
              <Text className="text-muted" style={menu.body}>
                Possible recovery:{' '}
                {quote.outputs.length === 1 ? 'zero or one scroll' : 'zero, one or two scrolls'}.
                Each occupied slot has {(quote.chanceBp / 100).toFixed(0)}% recovery, checked
                independently.
              </Text>
              {quote.outputs.map((output) => (
                <Text key={output.slot} className="text-muted" style={menu.body}>
                  {output.slot}: {content.item(output.scrollId).name}. Recovered scrolls roll fresh
                  values when reapplied.
                </Text>
              ))}
              <Text className="text-foreground" style={menu.body}>
                Cost: this {quote.item.name}, one mana herb, one holy water and{' '}
                {quote.costs.burnManaCost} MP, even if no scroll is recovered.
              </Text>
            </>
          )}
          <Button
            label={
              quote.mode === 'burn'
                ? `Burn ${quote.item.name} permanently`
                : 'Confirm enchant attempt'
            }
            disabled={busy || previewBusy}
            onPress={confirm}
          />
          <Button label="Cancel without spending" disabled={busy || previewBusy} onPress={cancel} />
        </DungeonCard>
      ) : equipment && target ? (
        <>
          <DungeonCard>
            <GameImage kind="item" id={item!.id} size={64} />
            <Text className="text-foreground" style={menu.heading}>
              {item!.name} · Copy {Object.values(target)[0].split('-')[1]}
            </Text>
            <EquipmentEnchants equipment={equipment} facts={hero} content={content} />
            <Text className="text-muted" style={menu.body}>
              Bonuses apply while equipped. Values stay on this copy.{' '}
              {equipment.locked
                ? 'This copy is locked; unlock it in inventory.'
                : 'This copy is unlocked.'}
            </Text>
            <Button label="Choose another copy" disabled={busy || previewBusy} onPress={reset} />
          </DungeonCard>
          <Text className="text-accent" style={menu.heading}>
            Choose a scroll
          </Text>
          {!scrolls.length ? (
            <Text className="text-muted" style={menu.body}>
              Buy a scroll from this forge’s supply list.
            </Text>
          ) : null}
          {scrolls.map((scroll) => {
            const definition = content.data.enchants.find((e) => e.id === scroll.enchantId)!;
            const compatible = compatibleEnchant(definition, item!);
            return (
              <Button
                image={{ kind: 'item', id: scroll.id }}
                key={scroll.id}
                label={`${scroll.name} ×${hero.inventory[scroll.id]}`}
                detail={`Rank ${definition.rank} · ${definition.slot}${compatible ? '' : ' · Incompatible with this copy'}`}
                selected={scrollId === scroll.id}
                disabled={busy || !compatible || equipment.locked}
                onPress={() => setScrollId(scroll.id)}
              />
            );
          })}
          <Text className="text-accent" style={menu.heading}>
            Choose powder
          </Text>
          {!powders.length ? (
            <Text className="text-muted" style={menu.body}>
              Buy enchant powder from this forge.
            </Text>
          ) : null}
          {powders.map((powder) => (
            <Button
              image={{ kind: 'item', id: powder.id }}
              key={powder.id}
              label={`${powder.name} ×${hero.inventory[powder.id]}`}
              selected={powderId === powder.id}
              disabled={busy || equipment.locked}
              onPress={() => setPowderId(powder.id)}
            />
          ))}
          <Button
            label="Preview enchant attempt"
            disabled={
              busy ||
              previewBusy ||
              !scrollId ||
              !powderId ||
              !hero.learnedSkills.enchant ||
              equipment.locked
            }
            onPress={() => {
              void makeQuote('apply');
            }}
          />
          <DungeonCard>
            <Text className="text-accent" style={menu.heading}>
              Burn for scroll recovery
            </Text>
            <Text className="text-muted" style={menu.body}>
              Burning destroys the selected equipment. Recovery can fail. Review the destruction
              before confirming.
            </Text>
            <Button
              label="Preview burning this copy"
              disabled={
                busy ||
                previewBusy ||
                !hero.learnedSkills.enchant ||
                equipment.locked ||
                (!equipment.prefix && !equipment.suffix)
              }
              onPress={() => {
                void makeQuote('burn');
              }}
            />
          </DungeonCard>
        </>
      ) : (
        <>
          <Text className="text-muted" style={menu.body}>
            Choose an individual weapon or armor copy. Buy scrolls and materials from this forge.
            Restore MP with a mana potion or paid healer treatment.
          </Text>
          {!rows.length ? (
            <Text className="text-muted" style={menu.body}>
              Your pack has no equipment. Collect the refuge supply chest or buy equipment in town.
            </Text>
          ) : null}
          {rows
            .slice(
              inventoryPage(page, rows.length) * INVENTORY_PAGE_SIZE,
              (inventoryPage(page, rows.length) + 1) * INVENTORY_PAGE_SIZE,
            )
            .map((row) => (
              <Button
                image={{ kind: 'item', id: row.item.id }}
                key={row.key}
                label={inventoryRowLabel(row)}
                detail={
                  ownedEquipment(hero, row.reference as EquipmentReference).locked
                    ? 'Locked · unlock in inventory'
                    : 'Unlocked'
                }
                disabled={busy || previewBusy}
                onPress={() => {
                  setTarget(row.reference as EquipmentReference);
                  setError(undefined);
                }}
              />
            ))}
          <InventoryPager
            label="Enchant equipment"
            page={inventoryPage(page, rows.length)}
            count={rows.length}
            disabled={busy || previewBusy}
            onPage={setPage}
          />
        </>
      )}
      <Button
        label="Back to forge supplies"
        disabled={busy || previewBusy}
        onPress={() => {
          cancel();
          back();
        }}
      />
    </View>
  );
}

export default function EnchantServicePanel(
  props: Parameters<typeof EnchantServicePanelLoaded>[0],
) {
  return (
    <FeatureGate
      session={props.session}
      features={['inventory', 'equipment', 'skills', 'enchanting']}
    >
      <EnchantServicePanelLoaded {...props} />
    </FeatureGate>
  );
}
