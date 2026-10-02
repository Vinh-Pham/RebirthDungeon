import type { ComponentProps, PropsWithChildren, Ref } from 'react';
import { Platform, Text, View } from 'react-native';
import { Alert } from 'heroui-native/alert';
import { Button, type ButtonRootProps } from 'heroui-native/button';
import { Card } from 'heroui-native/card';
import { useThemeColor } from 'heroui-native/hooks';
import { Spinner } from 'heroui-native/spinner';
import { cn } from 'heroui-native/utils';
import GameImage from './GameImage';
import type { GameImageReference } from './gameImages';

type DungeonButtonProps = Omit<ButtonRootProps, 'children' | 'isDisabled' | 'variant' | 'feedbackVariant' | 'animation'> & {
  ref?: Ref<View>;
  label: string;
  detail?: string;
  disabled?: boolean;
  busy?: boolean;
  selected?: boolean;
  primary?: boolean;
  secondary?: boolean;
  group?: boolean;
  image?: GameImageReference;
};

/** Keep game actions and their state separate from the library's presentation API. */
export function DungeonButton({
  label, detail, disabled = false, busy = false, selected,
  primary = false, secondary = false, group = false, image, className, accessibilityState, ...props
}: DungeonButtonProps) {
  const [accent, accentForeground] = useThemeColor(['accent', 'accent-foreground']);
  const filled = primary && !secondary;
  // Outline feedback calls colorKit during SSR before CSS variables exist.
  // Keep HeroUI's primary root on web and apply the same outlined surface.
  return <Button {...props}
    variant={filled || Platform.OS === 'web' ? 'primary' : 'outline'}
    isDisabled={disabled || busy}
    aria-pressed={selected}
    accessibilityLabel={props.accessibilityLabel ?? label}
    accessibilityState={{ ...accessibilityState, disabled: disabled || busy, busy, selected }}
    className={cn('h-auto min-h-12 rounded-lg px-4 py-3',
      !filled && 'border border-border bg-surface-secondary',
      selected && !filled && 'border-accent bg-surface-tertiary',
      group && 'min-h-[68px] grow basis-[47%]', image && 'gap-3', className)}>
    {busy ? <Spinner size="sm" color={filled ? accentForeground : accent} /> : null}
    {image ? <GameImage {...image} size={40} /> : null}
    <View className={cn('shrink gap-1', image && 'min-w-0 flex-1')}>
      <Button.Label className={cn('shrink text-center font-semibold', !filled && 'text-accent')}>{label}</Button.Label>
      {detail ? <Text className="text-center text-xs text-muted">{detail}</Text> : null}
    </View>
  </Button>;
}

export function DungeonCard({ children, className, ...props }: PropsWithChildren<ComponentProps<typeof Card>>) {
  return <Card {...props} className={cn('gap-0 rounded-xl border border-border p-4', className)}>
    <Card.Body className="flex-none gap-3">{children}</Card.Body>
  </Card>;
}

export function DungeonNotice({ message, status = 'danger' }: {
  message?: string;
  status?: ComponentProps<typeof Alert>['status'];
}) {
  if (!message) return null;
  return <Alert status={status} accessibilityLiveRegion="polite" className="rounded-lg">
    <Alert.Content><Alert.Description>{message}</Alert.Description></Alert.Content>
  </Alert>;
}

export function DungeonLoading({ label }: { label: string }) {
  const accent = useThemeColor('accent');
  return <View accessibilityLabel={label} accessibilityState={{ busy: true }} className="items-center gap-3 py-4">
    <Spinner color={accent} />
    <Text className="text-sm text-muted">{label}</Text>
  </View>;
}
