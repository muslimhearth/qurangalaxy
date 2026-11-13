import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { SemanticSlider, sliderText } from './SemanticSlider';
import { useGalaxyStore } from '../state/store';

describe('sliderText', () => {
  it('names the ends and the mix in between', () => {
    expect(sliderText(0)).toBe('Exact only');
    expect(sliderText(1)).toBe('Meaning only');
    expect(sliderText(0.25)).toBe('25% meaning');
  });
});

describe('SemanticSlider', () => {
  beforeEach(() => useGalaxyStore.setState(useGalaxyStore.getInitialState()));
  afterEach(cleanup);

  const slider = () => screen.getByRole('slider', { name: /exact ↔ meaning/i });

  it('starts at exact only', () => {
    render(<SemanticSlider status="off" progress={0} />);
    expect(slider()).toHaveValue('0');
    expect(slider()).toHaveAttribute('aria-valuetext', 'Exact only');
  });

  it('writes the weight to the store', () => {
    render(<SemanticSlider status="off" progress={0} />);
    fireEvent.change(slider(), { target: { value: '0.75' } });
    expect(useGalaxyStore.getState().semanticWeight).toBe(0.75);
    expect(slider()).toHaveAttribute('aria-valuetext', '75% meaning');
  });

  it('shows model download progress', () => {
    render(<SemanticSlider status="loading" progress={0.42} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('value', '0.42');
    expect(screen.getByText(/loading meaning model.*42%/i)).toBeInTheDocument();
  });

  it('says when the model could not load', () => {
    render(<SemanticSlider status="error" progress={0} error="HTTP 404" />);
    expect(screen.getByText(/meaning search is unavailable/i)).toHaveTextContent('HTTP 404');
  });
});
