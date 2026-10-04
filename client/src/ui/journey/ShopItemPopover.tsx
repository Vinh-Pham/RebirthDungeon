import { useRef, useState } from 'react';
import { Text, View } from 'react-native';
import type { ItemDefinition } from '../../data/schemas/content';
import { DungeonButton as Button } from '../shared/DungeonUI';
import ItemPopover from './ItemPopover';

type ShopItemProps = {
  item: ItemDefinition;
  owned: number;
  price: number;
  bundleSize?: number;
  action?: 'Buy' | 'Sell';
  label?: string;
  highlighted?: boolean;
  detail?: string;
  warning?: string;
  unavailableReason?: string;
  maximum: number;
  busy: boolean;
  trade(quantity: number): void;
};

function ShopItemDetails({
  item,
  owned,
  price,
  bundleSize = 1,
  action = 'Buy',
  detail,
  warning,
  unavailableReason,
  maximum,
  busy,
  trade,
}: ShopItemProps) {
  const [quantity, setQuantity] = useState(1);
  const submitted = useRef(false);
  const count = Math.max(1, Math.min(quantity, maximum));
  return (
    <View className="gap-3">
      <Text className="text-sm leading-5 text-muted">{item.description}</Text>
      <Text className="text-sm text-muted">{owned} owned</Text>
      {detail ? <Text className="text-sm leading-5 text-muted">{detail}</Text> : null}
      {action === 'Buy' && item.kind === 'weapon' ? (
        <Text className="text-xs leading-5 text-muted">
          Each weapon has its own durability and arrives fully repaired.
        </Text>
      ) : null}
      <Text className="text-sm text-foreground" accessibilityLiveRegion="polite">
        {price} gold {bundleSize > 1 ? `per bundle of ${bundleSize}` : 'each'} · Total{' '}
        {price * count} gold
      </Text>
      <View className="flex-row items-center gap-3">
        <Button
          label="−"
          accessibilityLabel={`${action} fewer ${item.name}`}
          disabled={busy || count <= 1}
          onPress={() => setQuantity(count - 1)}
        />
        <Text
          className="min-w-0 flex-1 text-center text-sm text-foreground"
          accessibilityLiveRegion="polite"
        >
          Quantity ×{count}
        </Text>
        <Button
          label="+"
          accessibilityLabel={`${action} more ${item.name}`}
          disabled={busy || count >= maximum}
          onPress={() => setQuantity(count + 1)}
        />
      </View>
      {bundleSize > 1 ? (
        <Text className="text-sm text-muted" accessibilityLiveRegion="polite">
          {count} {count === 1 ? 'bundle' : 'bundles'} · {count * bundleSize} items
        </Text>
      ) : null}
      {maximum < 1 ? (
        <Text className="text-xs leading-5 text-muted">
          {unavailableReason ??
            (owned + bundleSize > 999
              ? 'No room in your pack for this purchase.'
              : 'You need more gold for this purchase.')}
        </Text>
      ) : null}
      {warning ? <Text className="text-xs leading-5 text-muted">{warning}</Text> : null}
      <Button
        primary
        label={`${action} ${item.name} ×${count * bundleSize}`}
        disabled={busy || maximum < 1}
        onPress={() => {
          if (submitted.current || busy || maximum < 1) return;
          submitted.current = true;
          trade(count);
        }}
      />
    </View>
  );
}

export default function ShopItemPopover({
  open,
  onOpenChange,
  ...props
}: ShopItemProps & {
  open: boolean;
  onOpenChange(open: boolean): void;
}) {
  return (
    <ItemPopover
      itemId={props.item.id}
      label={
        props.label ??
        `${props.item.name}${(props.bundleSize ?? 1) > 1 ? ` ×${props.bundleSize}` : ''}`
      }
      highlighted={props.highlighted}
      open={open}
      onOpenChange={onOpenChange}
    >
      <ShopItemDetails
        {...props}
        trade={(quantity) => {
          onOpenChange(false);
          props.trade(quantity);
        }}
      />
    </ItemPopover>
  );
}
