import { useCharacterGame } from '../menu/CharacterGameContext';
import { useState } from 'react';
import { Text, View } from 'react-native';
import type { QuestDefinition } from '../../data/schemas/quests';
import type { ProgressionCommand } from '../../engine/commands';
import {
  objectiveProgress,
  questClaimProblem,
  questEligible,
  questReady,
  questStage,
} from '../../engine/rpg/Quests';
import type { GameplayJourney as JourneySession } from '../../game/Gameplay';
import { menu } from '../menu/MenuUI';
import { DungeonButton, DungeonCard, DungeonNotice } from '../shared/DungeonUI';
import {
  categoryLabel,
  conditionLabel,
  npcLabel,
  questNpcOpen,
  questStatus,
  rewardLabels,
} from './questLabels';

export default function QuestDetails({
  session,
  quest,
  busy,
  readOnly = false,
  progress,
}: {
  session: JourneySession;
  quest: QuestDefinition;
  busy: boolean;
  readOnly?: boolean;
  progress(command: ProgressionCommand): void;
}) {
  const [confirming, setConfirming] = useState(false);
  const view = session.getSnapshot(),
    hero = view.state.hero,
    content = session.content;
  const record = hero.quests[quest.id],
    stage = questStage(hero, quest);
  const ready = questReady(hero, quest),
    eligible = questEligible(hero, quest.prerequisite);
  const canAccept =
    record?.status === 'available' && eligible && questNpcOpen(view, quest.offerNpc);
  // Full local preflight uses its owned campaign. Online claims are validated atomically by the server.
  const { host } = useCharacterGame();
  const localHero = host.localHost?.getSnapshot().session?.getSnapshot().state.hero;
  const claimProblem =
    ready && localHero ? questClaimProblem(localHero, quest, content) : undefined;
  const canClaim = ready && !claimProblem && questNpcOpen(view, quest.claimNpc);
  const disabled = busy || readOnly;
  const deliveries = stage?.objectives.filter((o) => o.kind === 'deliverItem') ?? [];
  return (
    <View className="gap-3">
      <Text className="text-accent" accessibilityRole="header" style={menu.heading}>
        {quest.name}
      </Text>
      <Text className="text-accent" style={menu.body}>
        {categoryLabel[quest.category]} · {questStatus(hero, quest)}
      </Text>
      {quest.generation ? (
        <Text className="text-muted" style={menu.body}>
          {quest.chapter!.name} · {quest.generation.name}
        </Text>
      ) : null}
      <Text className="text-muted" style={menu.body}>
        {quest.description}
      </Text>
      {!record || record.status === 'available' ? (
        <Text className="text-muted" style={menu.body}>
          Requires: {conditionLabel(quest.prerequisite, content)}
        </Text>
      ) : null}
      {!record && quest.offerNpc ? (
        <Text className="text-muted" style={menu.body}>
          Speak to {npcLabel(content, quest.offerNpc)} to discover this offer.
        </Text>
      ) : null}
      <DungeonCard>
        <Text className="text-foreground" style={menu.heading}>
          {record?.status === 'completed' ? 'Finished stages' : 'Stages'}
        </Text>
        {quest.stages.map((s, index) => (
          <Text
            key={s.id}
            className={
              s.id === stage?.id && record?.status === 'active' ? 'text-accent' : 'text-muted'
            }
            style={menu.body}
          >
            {index + 1}. {s.name}
            {record?.status === 'completed' ||
            index < quest.stages.findIndex((s) => s.id === stage?.id)
              ? ' · Complete'
              : s.id === stage?.id && record?.status === 'active'
                ? ' · Current'
                : ''}
          </Text>
        ))}
        {record?.status === 'active' && stage
          ? stage.objectives.map((o) => {
              const count = objectiveProgress(hero, quest, o),
                tracked = hero.trackedObjectives.some(
                  (t) => t.questId === quest.id && t.objectiveId === o.id,
                );
              return (
                <View key={o.id} className="gap-2">
                  <Text
                    className="text-foreground"
                    accessibilityLiveRegion="polite"
                    style={menu.body}
                  >
                    {o.label} · {count}/{o.target}
                  </Text>
                  {o.kind === 'deliverItem' ? (
                    <Text className="text-muted" style={menu.body}>
                      {Math.max(0, o.target - count)} more needed. These items stay usable until you
                      confirm delivery.
                    </Text>
                  ) : null}
                  <DungeonButton
                    label={tracked ? 'Untrack objective' : 'Track objective'}
                    disabled={disabled || (!tracked && hero.trackedObjectives.length >= 3)}
                    accessibilityLabel={`${tracked ? 'Untrack' : 'Track'} ${o.label}`}
                    onPress={() =>
                      progress({
                        type: 'TRACK_QUEST_OBJECTIVE',
                        questId: quest.id,
                        objectiveId: o.id,
                      })
                    }
                  />
                </View>
              );
            })
          : null}
      </DungeonCard>
      <DungeonCard>
        <Text className="text-foreground" style={menu.heading}>
          {record?.status === 'completed' ? 'Rewards claimed' : 'One-time rewards'}
        </Text>
        {rewardLabels(quest, content).map((label, index) => (
          <Text key={index} className="text-muted" style={menu.body}>
            {label}
          </Text>
        ))}
        {quest.rewards.experience ? (
          <Text className="text-muted" style={menu.body}>
            Each earned level adds 1 AP and restores resources.
          </Text>
        ) : null}
        {quest.rewards.titles.length ? (
          <Text className="text-muted" style={menu.body}>
            Earning a title never selects it automatically. Choose earned titles from Character →
            Title collection while in town.
          </Text>
        ) : null}
      </DungeonCard>
      {record?.status === 'available' ? (
        <>
          <Text className="text-muted" style={menu.body}>
            {quest.offerNpc && !canAccept
              ? `Speak to ${npcLabel(content, quest.offerNpc)} to accept.`
              : 'Acceptance starts new progress; earlier encounters and visits do not count.'}
          </Text>
          {!eligible ? (
            <DungeonNotice
              status="accent"
              message="This offer remains discovered. Meet its prerequisites again to accept."
            />
          ) : null}
          <DungeonButton
            primary
            label="Accept quest"
            disabled={disabled || !canAccept}
            onPress={() =>
              progress({
                type: 'ACCEPT_QUEST',
                questId: quest.id,
                objectId: quest.offerNpc?.objectId,
              })
            }
          />
        </>
      ) : null}
      {record?.status === 'active' ? (
        <>
          <Text className="text-muted" style={menu.body}>
            {quest.claimNpc
              ? `Return to ${npcLabel(content, quest.claimNpc)} to claim.`
              : 'Claim in town.'}
          </Text>
          <DungeonNotice message={claimProblem} />
          {confirming && ready ? (
            <DungeonCard>
              <Text className="text-foreground" style={menu.heading}>
                Confirm completion
              </Text>
              {deliveries.map((o) => (
                <Text key={o.id} className="text-muted" style={menu.body}>
                  Deliver {content.item(o.itemId).name} ×{o.target} · After:{' '}
                  {(hero.inventory[o.itemId] ?? 0) - o.target} in pack
                </Text>
              ))}
              <Text className="text-muted" style={menu.body}>
                Receive: {rewardLabels(quest, content).join(' · ')}
              </Text>
              <DungeonButton
                primary
                label={
                  deliveries.length
                    ? 'Deliver items and claim rewards'
                    : 'Confirm and claim rewards'
                }
                disabled={disabled || !canClaim}
                onPress={() => {
                  setConfirming(false);
                  progress({
                    type: 'CLAIM_QUEST',
                    questId: quest.id,
                    objectId: quest.claimNpc?.objectId,
                  });
                }}
              />
              <DungeonButton label="Cancel" disabled={busy} onPress={() => setConfirming(false)} />
            </DungeonCard>
          ) : (
            <DungeonButton
              primary
              label={ready ? 'Review quest claim' : 'Objectives unfinished'}
              disabled={disabled || !canClaim}
              onPress={() => setConfirming(true)}
            />
          )}
        </>
      ) : null}
    </View>
  );
}
