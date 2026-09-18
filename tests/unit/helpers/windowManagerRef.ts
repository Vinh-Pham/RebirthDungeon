import type { WindowManager } from '@surdeddd/wmkit';

/** Latest manager of the most recent provider, for assertions and direct manipulation. */
export const windowManagerRef: { current: WindowManager | undefined } = { current: undefined };
