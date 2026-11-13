import { useGalaxyStore } from '../state/store';

/** Small label naming the root under the pointer. Hidden for the selected root (the panel names it). */
export function HoverHint() {
  const galaxy = useGalaxyStore((s) => s.galaxy);
  const hoveredId = useGalaxyStore((s) => s.hoveredId);
  const selectedId = useGalaxyStore((s) => s.selectedId);
  const root = hoveredId === null || hoveredId === selectedId ? undefined : galaxy?.roots[hoveredId];
  if (!root) return null;
  return (
    <div className="hover-hint" data-testid="hover-hint">
      <span className="ar" lang="ar" dir="rtl">
        {root.ar}
      </span>
      <span className="tr">{root.tr}</span>
      <span className="count">{root.count.toLocaleString('en')} words</span>
    </div>
  );
}
