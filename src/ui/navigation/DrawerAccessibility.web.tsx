import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import type { DrawerAccessibilityProps } from './DrawerAccessibility';

export default function DrawerAccessibility({ children, open, close }: DrawerAccessibilityProps) {
  const root = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    element.inert = !open;
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const choices = () => Array.from(element.querySelectorAll<HTMLElement>('button, a[href], [tabindex]'))
      .filter((node) => node.tabIndex >= 0 && !node.hasAttribute('disabled') && node.getAttribute('aria-disabled') !== 'true');
    choices()[0]?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); }
      if (event.key !== 'Tab') return;
      const items = choices();
      const index = items.indexOf(document.activeElement as HTMLElement);
      event.preventDefault();
      items[(index + (event.shiftKey ? -1 : 1) + items.length) % items.length]?.focus();
    };
    const focus = (event: FocusEvent) => { if (!element.contains(event.target as Node)) choices()[0]?.focus(); };
    document.addEventListener('keydown', keydown, true);
    document.addEventListener('focusin', focus);
    return () => {
      document.removeEventListener('keydown', keydown, true);
      document.removeEventListener('focusin', focus);
      if (previous?.isConnected) previous.focus();
      else document.querySelector<HTMLElement>('[aria-label="Open navigation menu"]')?.focus();
    };
  }, [open, close]);
  return <View ref={(node) => { root.current = node as unknown as HTMLElement | null; }} className="flex-1"
    aria-hidden={!open} {...{ role: 'dialog', 'aria-modal': open, 'aria-label': 'Navigation menu' }}>{children}</View>;
}
