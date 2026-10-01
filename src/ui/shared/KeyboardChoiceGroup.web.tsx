import { useCallback, useLayoutEffect, useRef, type KeyboardEvent } from 'react';
import { View } from 'react-native';
import type { KeyboardChoiceGroupProps } from './KeyboardChoiceGroup';

/** HeroUI Native supplies selection semantics; add desktop arrow-key behavior. */
export default function KeyboardChoiceGroup({ children, itemRole, value }: KeyboardChoiceGroupProps) {
  const container = useRef<HTMLElement | null>(null);
  const choices = useCallback(() => Array.from(container.current?.querySelectorAll<HTMLElement>(`[role="${itemRole}"]`) ?? [])
    .filter((item) => item.getAttribute('aria-disabled') !== 'true'), [itemRole]);
  useLayoutEffect(() => {
    const items = choices();
    const selected = items.find((item) => item.getAttribute(itemRole === 'radio' ? 'aria-checked' : 'aria-selected') === 'true') ?? items[0];
    items.forEach((item) => { item.tabIndex = item === selected ? 0 : -1; });
  }, [choices, itemRole, value]);
  const onKeyDown = (event: KeyboardEvent) => {
    const items = choices();
    const index = items.indexOf(event.target as HTMLElement);
    if (index < 0 || !items.length) return;
    const step = ['ArrowRight', 'ArrowDown'].includes(event.key) ? 1 : ['ArrowLeft', 'ArrowUp'].includes(event.key) ? -1 : 0;
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : step ? (index + step + items.length) % items.length : -1;
    if (next < 0) return;
    event.preventDefault();
    items[next].click();
    items[next].focus();
  };
  return <View ref={(node) => { container.current = node as unknown as HTMLElement | null; }} {...{ onKeyDown }}>{children}</View>;
}
