import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import { transpileModule, ModuleKind } from 'typescript';
import { describe, expect, it, vi } from 'vitest';

// Execute the installed primitive and its real effect, without a native renderer.
function mount(platform: string, representation: 'source' | 'module') {
  const require = createRequire(import.meta.url);
  const root = dirname(require.resolve('heroui-native/package.json'));
  const path = resolve(
    root,
    representation === 'source'
      ? 'src/primitives/popover/popover.tsx'
      : 'lib/module/primitives/popover/popover.js',
  );
  const source = transpileModule(readFileSync(path, 'utf8'), {
    compilerOptions: { module: ModuleKind.CommonJS, jsx: 4 },
  }).outputText;
  const effects: (() => void | (() => void))[] = [];
  const context = {
    isOpen: true,
    onOpenChange: vi.fn(),
    setTriggerPosition: vi.fn(),
    setContentLayout: vi.fn(),
  };
  const remove = vi.fn();
  const addEventListener = vi.fn((_event: string, _listener: () => boolean) => {
    if (platform === 'web')
      throw new Error('BackHandler is not supported on web and should not be used.');
    return { remove };
  });
  const react = {
    createContext: () => ({}),
    forwardRef: (render: unknown) => render,
    useContext: () => context,
    useEffect: (effect: () => void | (() => void)) => effects.push(effect),
  };
  const exports: Record<string, (props: object, ref: null) => unknown> = {};
  runInNewContext(source, {
    exports,
    require: (id: string) => {
      if (id === 'react') return { __esModule: true, default: react, ...react };
      if (id === 'react-native')
        return { Platform: { OS: platform }, BackHandler: { addEventListener }, View: 'View' };
      if (id === 'react/jsx-runtime')
        return { jsx: (type: unknown, props: unknown) => ({ type, props }) };
      if (id.includes('/hooks')) return { useRelativePosition: () => ({}) };
      return {};
    },
  });
  const element = exports.Content!({}, null);
  const cleanup = () => effects.map((effect) => effect()).forEach((dispose) => dispose?.());
  return { element, effects, cleanup, addEventListener, remove, context };
}

describe('HeroUI popover hardware back compatibility', () => {
  it.each(['source', 'module'] as const)(
    'does not use BackHandler on web (%s)',
    (representation) => {
      const popover = mount('web', representation);
      expect(() => popover.cleanup()).not.toThrow();
      expect(popover.addEventListener).not.toHaveBeenCalled();
      expect(popover.context.setContentLayout).toHaveBeenCalledWith(null);
    },
  );
  it.each(['source', 'module'] as const)(
    'keeps native dismissal and subscription cleanup (%s)',
    (representation) => {
      const popover = mount('android', representation);
      const dispose = popover.effects[0]!();
      expect(popover.addEventListener).toHaveBeenCalledWith(
        'hardwareBackPress',
        expect.any(Function),
      );
      const listener = popover.addEventListener.mock.calls[0]![1] as () => boolean;
      expect(listener()).toBe(true);
      expect(popover.context.onOpenChange).toHaveBeenCalledWith(false);
      expect(popover.context.setTriggerPosition).toHaveBeenCalledWith(null);
      dispose?.();
      expect(popover.remove).toHaveBeenCalledOnce();
    },
  );
});
