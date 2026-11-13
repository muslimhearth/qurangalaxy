import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import type { VerseKey } from '../data/types';
import { useGalaxyStore } from '../state/store';
import { useVerseFocus } from '../ui/verseFocus';
import { drawMosaic } from './draw';
import { PHONE_MAX } from './freeArea';
import { hitTest, mushafLayout } from './layout';
import { LIT_A, LIT_B, LIT_NONE, litStates } from './lit';
import { SURAHS, VERSE_COUNTS, verseAt } from './surahs';
import { useFade } from './useFade';
import { useFreeArea } from './useFreeArea';
import { useOccurrences } from './useOccurrences';

/** Props for `MushafView`. */
export interface MushafViewProps {
  /** Second root to compare with the selected one: its verses glow blue (both: white). */
  compareRootId?: number;
}

/** Height kept for the legend line under the mosaic on wide screens. */
const LEGEND_H = 30;
/** Touch: a tap finds the nearest dot within this many pixels. */
const TOUCH_RADIUS = 12;

const fmt = (n: number) => n.toLocaleString('en');

/**
 * The whole Quran as a mosaic: one dot per verse in Mushaf order, drawn on one 2D canvas in the
 * area the UI leaves free. Verses of the selected root glow amber, of the compare root blue, of
 * both white. Hover or press a dot for its surah and verse; tap a lit dot to read it in the panel.
 */
export function MushafView({ compareRootId }: MushafViewProps) {
  const galaxy = useGalaxyStore((s) => s.galaxy);
  const selectedId = useGalaxyStore((s) => s.selectedId);
  const focusVerse = useVerseFocus((s) => s.focusVerse);
  const occurrences = useOccurrences(selectedId !== null || compareRootId !== undefined);
  const lit = useMemo(
    () =>
      litStates(
        selectedId === null ? undefined : occurrences?.[selectedId],
        compareRootId === undefined ? undefined : occurrences?.[compareRootId],
      ),
    [occurrences, selectedId, compareRootId],
  );
  const alpha = useFade(lit);

  const area = useFreeArea();
  const phone = innerWidth <= PHONE_MAX;
  const mosaicH = Math.max(0, area.height - (phone ? 0 : LEGEND_H));
  const layout = useMemo(() => mushafLayout(VERSE_COUNTS, area.width, mosaicH), [area.width, mosaicH]);
  const [active, setActive] = useState(-1);
  const pointer = useRef('mouse');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Redraw only when something on the canvas changes.
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const w = Math.round(area.width * dpr);
    const h = Math.round(mosaicH * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const surah = active >= 0 ? verseAt(active).surah : null;
    drawMosaic(ctx, layout, area.width, mosaicH, { lit, alpha, surah, active });
  }, [layout, lit, alpha, active, area.width, mosaicH]);

  // The layout changes with the screen; a remembered dot index would point elsewhere.
  useEffect(() => setActive(-1), [layout]);

  /** Dot under a pointer event, using a bigger reach for touch. */
  const hit = (e: { clientX: number; clientY: number }) => {
    const radius = pointer.current === 'mouse' ? Math.max(2, layout.gap) : TOUCH_RADIUS;
    return hitTest(layout, e.clientX - area.left, e.clientY - area.top, radius);
  };

  /** Shows the verse's tooltip and, when it uses the selected root, opens it in the panel. */
  const activate = (index: number) => {
    setActive(index);
    if (index < 0 || selectedId === null || !(lit[index]! & LIT_A)) return;
    const { surah, ayah } = verseAt(index);
    focusVerse(`${surah}:${ayah}` as VerseKey);
  };

  const onPointerMove = (e: PointerEvent) => {
    if (e.pointerType === 'mouse') setActive(hit(e));
  };
  const onPointerDown = (e: PointerEvent) => {
    pointer.current = e.pointerType || 'mouse';
    // Touch and pen: pressing a dot shows its tooltip at once.
    if (pointer.current !== 'mouse') setActive(hit(e));
  };
  const onKeyDown = (e: KeyboardEvent) => {
    const from = active < 0 ? 0 : active;
    const across = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
    const down = { ArrowDown: 1, ArrowUp: -1 }[e.key];
    let next = -2;
    if (across) next = Math.min(layout.x.length - 1, Math.max(0, from + across));
    else if (down) {
      const x = layout.x[from]! + layout.dot / 2;
      const y = layout.y[from]! + layout.dot / 2 + down * layout.pitch;
      next = hitTest(layout, x, y, layout.pitch * 3);
      if (next < 0) next = from;
    } else if (e.key === 'Enter' || e.key === ' ') activate(from);
    else return;
    e.preventDefault();
    if (next >= -1) setActive(next);
  };

  const roots = galaxy?.roots ?? [];
  const rootA = selectedId === null ? undefined : roots[selectedId];
  const rootB = compareRootId === undefined ? undefined : roots[compareRootId];

  return (
    <section className="mushaf" aria-label="Mushaf view">
      <canvas
        ref={canvasRef}
        className="mushaf-canvas"
        style={{ left: area.left, top: area.top, width: area.width, height: mosaicH }}
        role="img"
        aria-label={`Mushaf mosaic: ${fmt(layout.x.length)} verses in Mushaf order, one dot each. Arrow keys move between verses.`}
        tabIndex={0}
        // Mosaic geometry in canvas pixels, for browser tests that aim at a dot.
        data-left={layout.left + layout.gutter}
        data-top={layout.top}
        data-pitch={layout.pitch}
        data-dot={layout.dot}
        onPointerMove={onPointerMove}
        onPointerDown={onPointerDown}
        onPointerLeave={(e) => e.pointerType === 'mouse' && setActive(-1)}
        onClick={(e) => activate(hit(e))}
        onKeyDown={onKeyDown}
      />
      {active >= 0 && (
        <Tooltip
          index={active}
          x={area.left + layout.x[active]! + layout.dot / 2}
          y={area.top + layout.y[active]!}
          below={area.top + layout.y[active]! < 70}
          state={lit[active]!}
          rootA={rootA?.ar}
          rootB={rootB?.ar}
        />
      )}
      {!phone && (
        <Legend
          left={area.left + layout.left + layout.gutter}
          top={area.top + layout.bottom + 12}
          rootA={rootA && { ar: rootA.ar, verses: rootA.verseCount }}
          rootB={rootB && { ar: rootB.ar, verses: rootB.verseCount }}
          both={rootA && rootB ? lit.filter((s) => s === (LIT_A | LIT_B)).length : 0}
        />
      )}
    </section>
  );
}

/** Surah name and verse key above (or below) the dot under the pointer. */
function Tooltip(p: {
  index: number;
  x: number;
  y: number;
  below: boolean;
  state: number;
  rootA?: string;
  rootB?: string;
}) {
  const { surah, ayah } = verseAt(p.index);
  // Keep the box on screen near the left and right edges.
  const left = Math.min(Math.max(p.x, 90), innerWidth - 90);
  const uses = [p.state & LIT_A && p.rootA, p.state & LIT_B && p.rootB].filter(Boolean) as string[];
  return (
    <div
      className={`mushaf-tip${p.below ? ' below' : ''}`}
      role="tooltip"
      aria-live="polite"
      style={{ left, top: p.below ? p.y + 14 : p.y - 8 }}
    >
      <strong>{SURAHS[surah - 1]!.name}</strong>
      <span className="mushaf-tip-key">
        {surah}:{ayah}
      </span>
      {p.state !== LIT_NONE && uses.length > 0 && (
        <span className="mushaf-tip-uses">
          uses{' '}
          <span lang="ar" dir="rtl">
            {uses.join(' + ')}
          </span>
        </span>
      )}
    </div>
  );
}

/** Legend under the mosaic (wide screens): what the colors mean, or how to read the mosaic. */
function Legend(p: {
  left: number;
  top: number;
  rootA?: { ar: string; verses: number };
  rootB?: { ar: string; verses: number };
  both: number;
}) {
  return (
    <p className="mushaf-legend" style={{ left: p.left, top: p.top }}>
      {!p.rootA && !p.rootB && (
        <>
          Each dot is one verse, in Mushaf order: Al-Fatihah at top left, An-Nas at bottom right. Numbers
          mark where surahs start.
        </>
      )}
      {p.rootA && <Swatch kind="a" ar={p.rootA.ar} text={`${fmt(p.rootA.verses)} verses`} />}
      {p.rootB && <Swatch kind="b" ar={p.rootB.ar} text={`${fmt(p.rootB.verses)} verses`} />}
      {p.rootA && p.rootB && <Swatch kind="ab" text={`${fmt(p.both)} use both`} />}
      {(p.rootA || p.rootB) && <span className="mushaf-legend-hint">Hover a dot for its surah · click to read it</span>}
    </p>
  );
}

/** One colored dot with a label in the legend. */
function Swatch({ kind, ar, text }: { kind: 'a' | 'b' | 'ab'; ar?: string; text: string }) {
  return (
    <span className="mushaf-swatch">
      <i className={`mushaf-dot ${kind}`} aria-hidden="true" />
      {ar && (
        <span lang="ar" dir="rtl">
          {ar}
        </span>
      )}
      {text}
    </span>
  );
}
