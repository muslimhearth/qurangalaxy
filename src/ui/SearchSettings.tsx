import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useGalaxyStore } from '../state/store';
import type { SemanticStatus } from '../semantic/useSemanticSearch';
import { SemanticSlider } from './SemanticSlider';

/** One-word name of the search mode for a slider weight: Exact, Mixed or Topic. */
export function modeLabel(weight: number): string {
  if (weight <= 0) return 'Exact';
  return weight >= 1 ? 'Topic' : 'Mixed';
}

interface Props {
  status: SemanticStatus;
  progress: number;
  error?: string;
}

/**
 * Small button in the search field that shows the current search mode and opens the
 * Exact ↔ Topic slider in a popover. Escape or a click outside closes it.
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
        {status === 'loading' && <span className="mode-progress">{Math.round(progress * 100)}%</span>}
      </button>
      {open && (
        <div className="mode-pop panel" role="dialog" aria-label="Search mode">
          <SemanticSlider status={status} progress={progress} error={error} />
          <p className="mode-help">
            <b>Exact</b> finds a root by its letters (رحم), spelling (noor) or English word (light).
            <br />
            <b>Topic</b> finds roots and verses about a phrase (patience in hardship), using the English
            translation. The first use downloads a small model (23 MB).
          </p>
        </div>
      )}
    </div>
  );
}
