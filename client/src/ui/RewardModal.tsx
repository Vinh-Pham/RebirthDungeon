import { useState } from 'react';
import type { Immutable } from 'immer';
import { Button, Label } from '@heroui/react';
import { CheckboxButtonGroup } from '@heroui-pro/react/checkbox-button-group';
import type { Reward } from '../domain/model';
import { items } from '../domain/catalog';
import { GameModal } from './GameModal';

const rewardImages: Record<string, string> = Object.fromEntries(
    ['gold', 'silk', 'gem', 'hp', 'mana', 'stamina'].map((kind) => [
        kind,
        `/assets/game/rewards/${kind}.svg`,
    ]),
);

/** Key by reward ID so a new reward starts with its unclaimed choices selected. */
export function RewardModal({
    reward,
    disabled,
    error,
    onClaim,
    onContinue,
}: {
    reward: Immutable<Reward>;
    disabled: boolean;
    error: string;
    onClaim: (ids: string[], gold: boolean) => void;
    onContinue: () => void;
}) {
    const choices = [
        { id: 'gold', kind: 'gold', name: `${reward.gold} gold` },
        ...reward.items.map((item) => ({
            id: item.id,
            kind: item.kind,
            name: `${items[item.kind].name} × ${item.count}`,
        })),
    ];
    const available = choices.filter((choice) => !reward.claimed.includes(choice.id));
    const [selected, setSelected] = useState(() => available.map((choice) => choice.id));
    const unclaimedSelection = selected.filter((id) => !reward.claimed.includes(id));
    const continueReward = () => {
        if (!disabled) onContinue();
    };
    return (
        <GameModal title="A little richer." label="Collect rewards" onClose={continueReward}>
            <div className="eyebrow">
                {reward.boss ? 'VICTORY IS YOURS' : 'SPOILS OF ADVENTURE'}
            </div>
            <p>
                Choose what to carry with you. Collecting rewards continues your adventure;
                unselected rewards are left behind.
            </p>
            <CheckboxButtonGroup
                aria-label="Reward items"
                layout="grid"
                className="reward-choices"
                value={unclaimedSelection}
                onChange={setSelected}
                isDisabled={disabled}
            >
                {choices.map((choice) => (
                    <CheckboxButtonGroup.Item
                        key={choice.id}
                        value={choice.id}
                        aria-label={choice.name}
                        isDisabled={reward.claimed.includes(choice.id)}
                        className="reward-choice"
                    >
                        <CheckboxButtonGroup.ItemContent>
                            <img
                                src={rewardImages[choice.kind] ?? '/assets/game/chest.svg'}
                                alt=""
                                width={64}
                                height={64}
                                className="reward-image"
                            />
                            <Label>{choice.name}</Label>
                            {reward.claimed.includes(choice.id) && <small>· Collected</small>}
                        </CheckboxButtonGroup.ItemContent>
                    </CheckboxButtonGroup.Item>
                ))}
            </CheckboxButtonGroup>
            {error && <p role="alert">{error}</p>}
            <div className="choices">
                <Button
                    isDisabled={disabled || !unclaimedSelection.length}
                    onPress={() =>
                        onClaim(
                            unclaimedSelection.filter((id) => id !== 'gold'),
                            unclaimedSelection.includes('gold'),
                        )
                    }
                >
                    Take selected
                </Button>
                <Button
                    variant="secondary"
                    isDisabled={disabled || !available.length}
                    onPress={() =>
                        onClaim(
                            available
                                .filter((choice) => choice.id !== 'gold')
                                .map((choice) => choice.id),
                            available.some((choice) => choice.id === 'gold'),
                        )
                    }
                >
                    Take all
                </Button>
            </div>
        </GameModal>
    );
}