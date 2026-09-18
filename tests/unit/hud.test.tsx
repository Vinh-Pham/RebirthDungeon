// @vitest-environment jsdom
import { it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { ResourceMeter } from '../../src/ui/ResourceMeter';
afterEach(cleanup);
it('exposes resource values to assistive technology, including an unselected character', () => {
    const { rerender } = render(<ResourceMeter label="HP" value={34} max={118} kind="hp" />);
    const meter = screen.getByRole('meter', { name: 'HP' });
    expect(meter.getAttribute('aria-valuenow')).toBe('34');
    expect(meter.getAttribute('aria-valuemax')).toBe('118');
    rerender(<ResourceMeter label="HP" value={0} max={0} kind="hp" empty />);
    expect(screen.getByText('HP —')).toBeDefined();
    expect(screen.getByRole('meter').getAttribute('aria-valuemax')).toBe('1');
});
