import { createContext, useContext } from 'react';
import type { Edge } from 'react-native-safe-area-context';

/** The shell handles top insets; a mounted footer also owns the bottom inset. */
export const AppScreenChrome = createContext(false);
const withFooter: Edge[] = ['left', 'right'];
const withoutFooter: Edge[] = ['bottom', 'left', 'right'];
export function useAppScreenChrome() {
  const hasFooter = useContext(AppScreenChrome);
  return { hasFooter, edges: hasFooter ? withFooter : withoutFooter };
}
