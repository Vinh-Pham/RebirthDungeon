import type { PropsWithChildren } from 'react';

export type KeyboardChoiceGroupProps = PropsWithChildren<{
  itemRole: 'radio' | 'tab';
  value?: string;
}>;

export default function KeyboardChoiceGroup({ children }: KeyboardChoiceGroupProps) {
  return children;
}
