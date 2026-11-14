import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useSearchHistory } from '../history/history';
import { HistoryList } from './HistoryList';

describe('HistoryList', () => {
  beforeEach(() => {
    localStorage.clear();
    useSearchHistory.setState({
      saving: true,
      entries: [
        { query: 'patience', mode: 'verses' },
        { query: 'light', mode: 'roots' },
      ],
    });
  });
  afterEach(cleanup);

  it('lists recent searches with their mode and reruns one on tap', () => {
    const onPick = vi.fn();
    render(<HistoryList onPick={onPick} />);
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('patienceVerses');
    fireEvent.click(screen.getByRole('button', { name: /^light/ }));
    expect(onPick).toHaveBeenCalledWith({ query: 'light', mode: 'roots' });
  });

  it('removes one entry', () => {
    render(<HistoryList onPick={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Remove "light" from history' }));
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    expect(useSearchHistory.getState().entries).toEqual([{ query: 'patience', mode: 'verses' }]);
  });

  it('shows nothing when the history is empty', () => {
    useSearchHistory.setState({ entries: [] });
    const { container } = render(<HistoryList onPick={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });
});
