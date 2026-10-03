import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PopoverAccessibility from '../../ui/shared/PopoverAccessibility.web';

const hooks = vi.hoisted(() => ({ effects: [] as (() => void | (() => void))[] }));
vi.mock('react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react')>()),
  useRef: (current: unknown) => ({ current }),
  useEffect: (effect: () => void | (() => void)) => hooks.effects.push(effect),
  useLayoutEffect: () => {},
}));
vi.mock('react-native', () => ({ View: 'View' }));
vi.mock('heroui-native/popover', () => ({ usePopover: () => ({}) }));

function setup(open = true) {
  // Node's EventTarget does not match browser removal with a boolean capture
  // argument. Normalize it so this fixture uses browser listener semantics.
  class BrowserDocument extends EventTarget {
    override removeEventListener(
      type: string,
      listener: EventListenerOrEventListenerObject | null,
      options?: EventListenerOptions | boolean,
    ) {
      super.removeEventListener(type, listener, {
        capture: typeof options === 'boolean' ? options : options?.capture,
      });
    }
  }
  const document = Object.assign(new BrowserDocument(), {
    activeElement: null as unknown,
    scrollTop: 0,
  });
  vi.stubGlobal('document', document);
  const button = () => {
    const node = {
      tabIndex: 0,
      isConnected: true,
      hasAttribute: () => false,
      getAttribute: () => null,
      focus: vi.fn((options?: FocusOptions) => {
        document.activeElement = node;
        // Browsers scroll an offscreen focus target into view by default.
        if (!options?.preventScroll) document.scrollTop = 476;
      }),
    };
    return node;
  };
  const trigger = button();
  const closeButton = button();
  const useButton = button();
  const items = [closeButton, useButton];
  document.activeElement = trigger;
  const view = PopoverAccessibility({ open, close: vi.fn() });
  view.props.ref({
    querySelectorAll: () => items,
    contains: (node: unknown) => items.includes(node as typeof closeButton),
  });
  const cleanups = hooks.effects.map((effect) => effect());
  const key = (key: string, shiftKey = false) => {
    const event = Object.assign(new Event('keydown', { cancelable: true }), { key, shiftKey });
    document.dispatchEvent(event);
    return event;
  };
  return {
    document,
    trigger,
    closeButton,
    useButton,
    key,
    cleanup: () => cleanups.forEach((cleanup) => cleanup?.()),
  };
}

beforeEach(() => {
  hooks.effects.length = 0;
});
afterEach(() => vi.unstubAllGlobals());

describe('web popover focus', () => {
  it('focuses the opening panel without scrolling the page to its offscreen measurement position', () => {
    const state = setup();
    expect(state.document.activeElement).toBe(state.closeButton);
    expect(state.document.scrollTop).toBe(0);
    state.cleanup();
  });

  it('cycles keyboard focus and redirects outside focus without scrolling', () => {
    const state = setup();
    state.document.scrollTop = 0;
    expect(state.key('Tab').defaultPrevented).toBe(true);
    expect(state.document.activeElement).toBe(state.useButton);
    expect(state.document.scrollTop).toBe(0);
    state.key('Tab');
    expect(state.document.activeElement).toBe(state.closeButton);
    state.key('Tab', true);
    expect(state.document.activeElement).toBe(state.useButton);
    state.document.activeElement = state.trigger;
    state.document.dispatchEvent(new Event('focusin'));
    expect(state.document.activeElement).toBe(state.closeButton);
    expect(state.document.scrollTop).toBe(0);
    state.cleanup();
  });

  it('restores trigger focus without scrolling and removes focus containment on dismissal', () => {
    const state = setup();
    state.document.scrollTop = 0;
    state.cleanup();
    expect(state.document.activeElement).toBe(state.trigger);
    expect(state.document.scrollTop).toBe(0);
    expect(state.key('Tab').defaultPrevented).toBe(false);
    state.document.dispatchEvent(new Event('focusin'));
    expect(state.document.activeElement).toBe(state.trigger);
  });

  it('does not move focus while closed or restore a disconnected trigger', () => {
    const closed = setup(false);
    expect(closed.trigger.focus).not.toHaveBeenCalled();
    expect(closed.closeButton.focus).not.toHaveBeenCalled();
    closed.cleanup();
    hooks.effects.length = 0;
    const state = setup();
    state.trigger.isConnected = false;
    state.cleanup();
    expect(state.trigger.focus).not.toHaveBeenCalled();
  });
});
