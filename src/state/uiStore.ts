import { createStore } from 'zustand/vanilla';

export function createUIStore() {
  return createStore<{ debugVisible: boolean; toggleDebug(): void }>()((set) => ({
    debugVisible: false,
    toggleDebug: () => set((state) => ({ debugVisible: !state.debugVisible })),
  }));
}
