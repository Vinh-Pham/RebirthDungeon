import { fireEvent, render } from '@testing-library/react-native';

jest.mock(
  'react-native-safe-area-context',
  () => require('react-native-safe-area-context/jest/mock').default,
);
import {
  initialWindowMetrics,
  SafeAreaProvider,
} from 'react-native-safe-area-context';

import { SpikeHud } from '@/presentation/spike/spike-hud';

async function renderHud(
  overrides: Partial<Parameters<typeof SpikeHud>[0]> = {},
) {
  const handlers = {
    onShake: jest.fn(),
    onCycleZoom: jest.fn(),
    onToggleFollow: jest.fn(),
  };
  const utils = await render(
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <SpikeHud
        fps={58.4}
        worstFrameMs={17.2}
        zoom={3}
        followMonster={false}
        {...handlers}
        {...overrides}
      />
    </SafeAreaProvider>,
  );
  return { ...utils, handlers };
}

describe('<SpikeHud />', () => {
  it('renders an accessible frame-stat readout', async () => {
    const { getByLabelText } = await renderHud();
    expect(
      getByLabelText(
        'Presentation: 58 frames per second, worst frame 17.2 milliseconds',
      ),
    ).toBeTruthy();
  });

  it('renders the current zoom in the zoom button', async () => {
    const { getByText } = await renderHud({ zoom: 4 });
    expect(getByText('Zoom ×4')).toBeTruthy();
  });

  it('fires the shake handler', async () => {
    const { handlers, getByText } = await renderHud();
    fireEvent.press(getByText('Shake'));
    expect(handlers.onShake).toHaveBeenCalledTimes(1);
  });

  it('fires the zoom handler', async () => {
    const { handlers, getByLabelText } = await renderHud();
    fireEvent.press(getByLabelText('Zoom ×3'));
    expect(handlers.onCycleZoom).toHaveBeenCalledTimes(1);
  });

  it('describes the current follow target', async () => {
    const { getByText, rerender } = await renderHud();
    expect(getByText('Follow: hero')).toBeTruthy();

    await rerender(
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <SpikeHud
          fps={58.4}
          worstFrameMs={17.2}
          zoom={3}
          followMonster
          onShake={() => {}}
          onCycleZoom={() => {}}
          onToggleFollow={() => {}}
        />
      </SafeAreaProvider>,
    );
    expect(getByText('Follow: slime')).toBeTruthy();
  });
});
