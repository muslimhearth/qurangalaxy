import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useGalaxyStore } from '../state/store';
import type { SemanticStatus } from '../semantic/useSemanticSearch';
import { SemanticSlider } from './SemanticSlider';

/** One-word name of the search mode for a slider weight: Exact, Hybrid or Semantic. */
export function modeLabel(weight: number): string {
  if (weight <= 0) return 'Exact';
  return weight >= 1 ? 'Semantic' : 'Hybrid';
}

interface Props {
  status: SemanticStatus;
  progress: number;
  error?: string;
}

/**
 * Small button in the search field that shows the current search mode and opens the
 * Exact ↔ Semantic slider in a popover. Escape or a click outside closes it.
 */
export function SearchSettings({ status, progress, error }: Props) {
  const weight = useGalaxyStore((s) => s.semanticWeight);
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    // A click or focus anywhere else (e.g. typing in the search field) closes the popover.
    const onOutside = (e: Event) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onOutside);
    document.addEventListener('focusin', onOutside);
    return () => {
      document.removeEventListener('pointerdown', onOutside);
      document.removeEventListener('focusin', onOutside);
    };
  }, [open]);

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Escape' || !open) return;
    // Close only the popover, not the root panel behind it.
    e.stopPropagation();
    setOpen(false);
    button.current?.focus();
  };

  const mode = modeLabel(weight);
  return (
    <div className="search-settings" ref={root} onKeyDown={onKeyDown}>
      <button
        ref={button}
        type="button"
        className={`mode-chip${weight > 0 ? ' on' : ''}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Search mode: ${mode}`}
        onClick={() => setOpen((o) => !o)}
      >
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
          <path d="M2 4h12M2 12h12M5 2v4M11 10v4" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" />
        </svg>
        {mode}
        {/* A small ring while the model downloads; a number here would read like the semantic share. */}
        {status === 'loading' && (
          <span
            className="mode-loading"
            role="progressbar"
            aria-label="Loading semantic model"
            aria-valuenow={Math.round(progress * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        )}
      </button>
      {open && (
        <div className="mode-pop panel" role="dialog" aria-label="Search mode">
          <SemanticSlider status={status} progress={progress} error={error} />
        </div>
      )}
    </div>
  );
}
