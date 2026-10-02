import { createContext } from 'react';

/** The custom tab bar reports its actual height, including its safe-area padding. */
export const DebugMenuTabBarContext = createContext<((height: number) => void) | null>(null);
