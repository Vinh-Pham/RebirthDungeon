import { render } from '@testing-library/react-native';
import HomeScreen from '@/app/index';

describe('<HomeScreen />', () => {
  it('renders the bootstrap placeholder', async () => {
    const { getByText } = await render(<HomeScreen />);
    expect(getByText('Rebirth Dungeon')).toBeTruthy();
    expect(getByText('Project bootstrap OK')).toBeTruthy();
  });
});
