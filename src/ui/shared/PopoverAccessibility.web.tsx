import { useEffect, useLayoutEffect, useRef } from 'react';
import { usePopover } from 'heroui-native/popover';
import { View } from 'react-native';
import type { PopoverAccessibilityProps } from './PopoverAccessibility';

/** HeroUI positions the panel; contain web focus and return it to the triggering icon. */
export default function PopoverAccessibility({ children, open, close }: PopoverAccessibilityProps) {
  const root = useRef<HTMLElement | null>(null);
  const { contentLayout, triggerPosition, setContentLayout } = usePopover();
  const closeRef = useRef(close);
  useLayoutEffect(() => {
    if (!open || !contentLayout || !triggerPosition) return;
    // RN Web observes size changes, not moves. HeroUI's initial hidden layout
    // can therefore keep its entering animation paused after positioning.
    const panel = root.current?.closest<HTMLElement>('[role="dialog"]');
    const top = panel?.getBoundingClientRect().top;
    if (top !== undefined && top > 0 && top < window.innerHeight &&
      (contentLayout.y === 0 || contentLayout.y >= window.innerHeight)) {
      setContentLayout({ ...contentLayout, y: top });
    }
  }, [open, contentLayout, triggerPosition, setContentLayout]);
  useEffect(() => { closeRef.current = close; }, [close]);
  useEffect(() => {
    const element = root.current;
    if (!open || !element) return;
    const previous = document.activeElement as HTMLElement | null;
    const choices = () => Array.from(element.querySelectorAll<HTMLElement>('button, [tabindex]'))
      .filter((node) => node.tabIndex >= 0 && !node.hasAttribute('disabled') && node.getAttribute('aria-disabled') !== 'true');
    choices()[0]?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault(); event.stopPropagation(); closeRef.current();
      }
      if (event.key !== 'Tab') return;
      const items = choices();
      const index = items.indexOf(document.activeElement as HTMLElement);
      event.preventDefault();
      items[(index + (event.shiftKey ? -1 : 1) + items.length) % items.length]?.focus();
    };
    const focus = (event: FocusEvent) => {
      if (!element.contains(event.target as Node)) choices()[0]?.focus();
    };
    document.addEventListener('keydown', keydown, true);
    document.addEventListener('focusin', focus);
    return () => {
      document.removeEventListener('keydown', keydown, true);
      document.removeEventListener('focusin', focus);
      if (previous?.isConnected) previous.focus();
    };
  }, [open]);
  return <View ref={(node) => { root.current = node as unknown as HTMLElement | null; }}
    accessibilityRole="none">{children}</View>;
}
