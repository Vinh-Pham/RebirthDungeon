// @vitest-environment jsdom
import { it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { ResourceMeter } from '../../src/ui/ResourceMeter';
afterEach(cleanup);
it('exposes resource values to assistive technology, including an unselected character', () => {
    const { rerender } = render(<ResourceMeter label="HP" value={34} max={118} />);
    const meter = screen.getByRole('progressbar', { name: 'HP' });
    expect(meter.getAttribute('aria-valuenow')).toBe('34');
    expect(meter.getAttribute('aria-valuemax')).toBe('118');
    rerender(<ResourceMeter label="HP" value={0} max={0} empty />);
    expect(screen.getByText('—')).toBeDefined();
    expect(screen.getByRole('progressbar').getAttribute('aria-valuemax')).toBe('1');
});

it('announces reserved costs without subtracting them from current resources', () => {
    render(<ResourceMeter label="HP" value={34.2} max={118} reserved={4} />);
    const bar = screen.getByRole('progressbar', { name: 'HP, 4 reserved' });
    expect(bar.getAttribute('aria-valuenow')).toBe('34.2');
    expect(bar.getAttribute('aria-valuetext')).toBe('35 of 118, 4 held');
    expect(screen.getByText('35 / 118')).toBeDefined();
});