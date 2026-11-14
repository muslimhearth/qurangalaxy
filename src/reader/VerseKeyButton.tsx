import type { VerseKey } from '../data/types';
import { useGalaxyStore } from '../state/store';
import { placeOf } from './surahs';

/** A verse key ("2:17") as a button: a tap opens the full surah in the reader at that verse. */
export function VerseKeyButton({ verseKey, className = 'verse-key' }: { verseKey: VerseKey; className?: string }) {
  const setReader = useGalaxyStore((s) => s.setReader);
  return (
    <button
      type="button"
      className={`${className} verse-key-button`}
      aria-label={`Read ${verseKey} in its surah`}
      title="Read the whole surah"
      onClick={() => setReader(placeOf(verseKey))}
    >
      {verseKey}
    </button>
  );
}
