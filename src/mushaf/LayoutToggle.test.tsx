import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { LayoutToggle } from './LayoutToggle';

describe('LayoutToggle', () => {
  afterEach(cleanup);

  it('shows both layouts and marks the current one as pressed', () => {
    render(<LayoutToggle value="mushaf" onChange={() => {}} />);
    expect(screen.getByRole('group', { name: 'Layout' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Galaxy' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Mushaf' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('reports a new choice and ignores the current one', () => {
    const onChange = vi.fn();
    render(<LayoutToggle value="galaxy" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Galaxy' }));
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Mushaf' }));
    expect(onChange).toHaveBeenCalledWith('mushaf');
  });

  it('gives each button an icon and a label, so phones can show the icon alone', () => {
    const { container } = render(<LayoutToggle value="galaxy" onChange={() => {}} />);
    expect(container.querySelectorAll('button svg[aria-hidden="true"]')).toHaveLength(2);
    expect(container.querySelectorAll('button .mushaf-toggle-label')).toHaveLength(2);
  });
});
