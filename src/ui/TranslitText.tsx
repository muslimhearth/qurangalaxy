import { translitSegments } from '../verses/translit';

/**
 * Tanzil transliteration with its markup shown as styles: underlined = long vowel or emphatic
 * letter, faded = written but not spoken. The text itself is shown verbatim.
 */
export function TranslitText({ raw }: { raw: string }) {
  return (
    <>
      {translitSegments(raw).map((seg, i) =>
        seg.marks.length === 0 ? (
          seg.text
        ) : (
          <span key={i} className={seg.marks.map((m) => `tr-${m}`).join(' ')}>
            {seg.text}
          </span>
        ),
      )}
    </>
  );
}
