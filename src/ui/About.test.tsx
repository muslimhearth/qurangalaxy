import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { About } from './About';

describe('About', () => {
  afterEach(cleanup);

  it('opens a short how-to that matches the current controls and sources', () => {
    render(<About />);
    fireEvent.click(screen.getByRole('button', { name: 'About' }));
    const body = document.getElementById('about-body')!;
    expect(body).toHaveTextContent(/pinch/i);
    expect(body).toHaveTextContent(/swipe/i);
    expect(body).toHaveTextContent(/noor/);
    expect(body).toHaveTextContent(/gear for semantic search/i);
    expect(screen.getByRole('link', { name: 'Wiktionary' })).toHaveAttribute('href', 'https://en.wiktionary.org/');
    expect(screen.getByRole('link', { name: 'Quranic Arabic Corpus' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Tanzil.net' })).toBeInTheDocument();
  });
});
