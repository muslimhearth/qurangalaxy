import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useSearchHistory } from '../history/history';
import { useGalaxyStore } from '../state/store';
import type { SemanticStatus } from '../semantic/useSemanticSearch';
import { ThemeSwitch } from '../theme/ThemeSwitch';
import { MatchSwitch, matchMode } from './MatchSwitch';
import { useMeanings } from './meanings';

const MODE_NAMES = { exact: 'Exact', hybrid: 'Hybrid', meaning: 'Meaning' } as const;

interface Props {
  status: SemanticStatus;
  progress: number;
  error?: string;
  /** Mix to show instead of the root search mix in the store (verse search has its own). */
  weight?: number;
  onWeight?: (w: number) => void;
}

/**
 * Gear button at the right end of the search bar. It opens a popover with the
 * "Exact | Hybrid | Meaning" switch, the "Save search history" switch, "Clear history",
 * the "Show meanings" switch and the "System | Light | Dark" theme switch.
 * Escape or a click outside closes it.
 */
export function SearchSettings({ status, progress, error, weight: ownWeight, onWeight }: Props) {
  const storeWeight = useGalaxyStore((s) => s.semanticWeight);
  const weight = ownWeight ?? storeWeight;
  const saving = useSearchHistory((s) => s.saving);
  const setSaving = useSearchHistory((s) => s.setSaving);
  const entries = useSearchHistory((s) => s.entries.length);
  const clear = useSearchHistory((s) => s.clear);
  const showMeanings = useMeanings((s) => s.show);
  const setShowMeanings = useMeanings((s) => s.setShow);
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

  const mode = MODE_NAMES[matchMode(weight)];
  return (
    <div className="search-settings" ref={root} onKeyDown={onKeyDown}>
      <button
        ref={button}
        type="button"
        className={`search-tool gear${weight > 0 ? ' on' : ''}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Search settings: ${mode}`}
        title="Search settings"
        onClick={() => setOpen((o) => !o)}
      >
        <GearIcon />
        {/* A small ring while the meaning model downloads. */}
        {status === 'loading' && (
          <span
            className="mode-loading"
            role="progressbar"
            aria-label="Loading meaning model"
            aria-valuenow={Math.round(progress * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        )}
      </button>
      {open && (
        <div className="mode-pop panel" role="dialog" aria-label="Search settings">
          <p className="setting-head">Search</p>
          <MatchSwitch status={status} progress={progress} error={error} weight={ownWeight} onWeight={onWeight} />
          <p className="setting-head">History</p>
          <label className="setting-row">
            <span className="setting-label">Save search history</span>
            <input
              type="checkbox"
              role="switch"
              className="switch"
              checked={saving}
              aria-checked={saving}
              onChange={(e) => setSaving(e.target.checked)}
            />
          </label>
          {entries > 0 && (
            <div className="setting-row">
              <span className="setting-label muted">
                {entries} recent {entries === 1 ? 'search' : 'searches'}
              </span>
              <button type="button" className="link-button" onClick={clear}>
                Clear history
              </button>
            </div>
          )}
          <p className="setting-head">Display</p>
          <label className="setting-row">
            <span className="setting-label">
              Show meanings
              <small>English text under every verse</small>
            </span>
            <input
              type="checkbox"
              role="switch"
              className="switch"
              aria-label="Show meanings"
              checked={showMeanings}
              aria-checked={showMeanings}
              onChange={(e) => setShowMeanings(e.target.checked)}
            />
          </label>
          <ThemeSwitch />
        </div>
      )}
    </div>
  );
}

/** Gear icon of the settings button. */
function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}
