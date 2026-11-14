/**
 * Corpus segment tags ("V|PERF|VF:1|3MP") in plain English for the word card.
 * Tag names follow the Quranic Arabic Corpus tag set (corpus.quran.com/documentation/tagset.jsp).
 */

/** One segment of a word: Corpus text and tag (see `MorphTags`). */
export interface Segment {
  text: string;
  tag: string;
}

/** A segment ready for display. */
export interface Part {
  text: string;
  role: 'prefix' | 'stem' | 'suffix';
  /** Short plain label, e.g. "the", "and", "they", "verb". */
  label: string;
  /** Grammar name for the hover title, e.g. "Determiner". */
  title: string;
}

// Noun kinds, in the order they are looked for among a noun's features.
const NOUN_KINDS: Record<string, [name: string, label: string]> = {
  ACT_PCPL: ['Active participle', 'participle'],
  PASS_PCPL: ['Passive participle', 'participle'],
  VN: ['Verbal noun', 'verbal noun'],
  PN: ['Proper noun', 'name'],
  ADJ: ['Adjective', 'adjective'],
  PRON: ['Pronoun', 'pronoun'],
  DEM: ['Demonstrative pronoun', 'this, that'],
  REL: ['Relative pronoun', 'who, which'],
  T: ['Time adverb', 'time'],
  LOC: ['Place adverb', 'place'],
  NV: ['Imperative verbal noun', 'command'],
  COND: ['Conditional noun', 'if'],
  INTG: ['Interrogative noun', 'question'],
  ADDR: ['Address pronoun', 'you'],
};

// Particle kinds (the first feature of a "P" segment).
const PARTICLE_KINDS: Record<string, [name: string, label: string]> = {
  P: ['Preposition', 'preposition'],
  DET: ['Determiner', 'the'],
  CONJ: ['Coordinating conjunction', 'and'],
  SUB: ['Subordinating conjunction', 'that'],
  ACC: ['Accusative particle', 'particle'],
  ADDR: ['Address particle', 'you'],
  AMD: ['Amendment particle', 'but'],
  ANS: ['Answer particle', 'answer'],
  ATT: ['Attention particle', 'look'],
  AVR: ['Aversion particle', 'particle'],
  CAUS: ['Particle of cause', 'so'],
  CERT: ['Particle of certainty', 'certainly'],
  CIRC: ['Circumstantial particle', 'while'],
  COM: ['Comitative particle', 'with'],
  COND: ['Conditional particle', 'if'],
  DIST: ['Particle of distance', 'far'],
  EMPH: ['Emphatic particle', 'surely'],
  EQ: ['Equalization particle', 'question'],
  EXH: ['Exhortation particle', 'why not'],
  EXL: ['Explanation particle', 'namely'],
  EXP: ['Exceptive particle', 'except'],
  FUT: ['Future particle', 'will'],
  IMPV: ['Imperative particle', 'let'],
  INC: ['Inceptive particle', 'particle'],
  INL: ['Quranic initials', 'initials'],
  INT: ['Particle of interpretation', 'that is'],
  INTG: ['Interrogative particle', 'question'],
  NEG: ['Negative particle', 'not'],
  PREV: ['Preventive particle', 'particle'],
  PRO: ['Prohibition particle', 'do not'],
  PRP: ['Particle of purpose', 'so that'],
  REM: ['Resumption particle', 'and'],
  RES: ['Restriction particle', 'only'],
  RET: ['Retraction particle', 'rather'],
  RSLT: ['Particle of result', 'then'],
  SUP: ['Supplemental particle', 'particle'],
  SUR: ['Particle of surprise', 'suddenly'],
  VOC: ['Vocative particle', 'O'],
};

const ASPECT: Record<string, string> = { PERF: 'perfect (past)', IMPF: 'imperfect (present)', IMPV: 'imperative (command)' };
const MOOD: Record<string, string> = { 'MOOD:IND': 'indicative', 'MOOD:SUBJ': 'subjunctive', 'MOOD:JUS': 'jussive' };
const CASE: Record<string, string> = { NOM: 'nominative case', ACC: 'accusative case', GEN: 'genitive case' };
const PERSON: Record<string, string> = { '1': '1st person', '2': '2nd person', '3': '3rd person' };
const GENDER: Record<string, string> = { M: 'masculine', F: 'feminine' };
const NUMBER: Record<string, string> = { S: 'singular', D: 'dual', P: 'plural' };
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

// Pronouns by person+gender+number key ("3MP"), as subject, object and possessive.
const PRONOUNS: Record<string, [subject: string, object: string, possessive: string]> = {
  '1S': ['I', 'me', 'my'],
  '1P': ['we', 'us', 'our'],
  '2': ['you', 'you', 'your'],
  '3MS': ['he', 'him', 'his'],
  '3FS': ['she', 'her', 'her'],
  '3D': ['they two', 'them two', 'their'],
  '3P': ['they', 'them', 'their'],
};

/** Splits a tag into its Corpus tag (N, V, P) and features. */
function split(tag: string): { top: string; feats: string[] } {
  const [top = '', ...feats] = tag.split('|');
  return { top, feats };
}

/**
 * The part of speech code of a segment: "V" for verbs, the particle kind ("P", "CONJ", ...) for
 * particles, and the noun kind ("ADJ", "PN", ...) or "N" for nouns.
 */
export function segmentKind(tag: string): string {
  const { top, feats } = split(tag);
  if (top === 'V') return 'V';
  if (top === 'P') return feats[0] ?? 'P';
  return Object.keys(NOUN_KINDS).find((k) => feats.includes(k)) ?? 'N';
}

/** Grammar name and short label of a segment. */
function names(tag: string): [name: string, label: string] {
  const kind = segmentKind(tag);
  if (kind === 'V') return ['Verb', 'verb'];
  if (split(tag).top === 'P') return PARTICLE_KINDS[kind] ?? ['Particle', 'particle'];
  return NOUN_KINDS[kind] ?? ['Noun', 'noun'];
}

/** Person, gender and number of a segment, e.g. { person: '3', gender: 'M', number: 'P' }. */
function pgn(tag: string): { person?: string; gender?: string; number?: string } {
  const { top, feats } = split(tag);
  // A particle's first feature is its kind ("P" = preposition), not a number.
  const list = top === 'P' ? feats.slice(1) : feats;
  const hit = list.map((f) => /^([123])?([MF])?([SDP])?$/.exec(f)).find((m) => m && m[0] !== '');
  return hit ? { person: hit[1], gender: hit[2], number: hit[3] } : {};
}

/** Person, gender and number in words, e.g. ["3rd person", "masculine", "plural"]. */
function pgnWords(tag: string): string[] {
  const p = pgn(tag);
  return [p.person && PERSON[p.person], p.gender && GENDER[p.gender], p.number && NUMBER[p.number]].filter(
    (x): x is string => !!x,
  );
}

/** The first base letter of a segment, without vowel marks. */
function firstLetter(text: string): string {
  return text.replace(/[ـً-ٰٟۖ-ۭ]/g, '')[0] ?? '';
}

/** Plain word for a prefix: the article, "and", "so", "with", ... */
function prefixLabel(s: Segment): string {
  const kind = segmentKind(s.tag);
  const letter = firstLetter(s.text);
  if (kind === 'P') return { ب: 'with', ل: 'for', ك: 'like', ت: 'by', و: 'by' }[letter] ?? 'preposition';
  if (letter === 'و' && ['CONJ', 'REM', 'CIRC', 'SUP'].includes(kind)) return 'and';
  if (letter === 'ف' && ['CONJ', 'REM', 'CAUS', 'RSLT', 'SUP', 'EXL'].includes(kind)) return 'so';
  return names(s.tag)[1];
}

/** True when a verb with this tag carries its subject in a suffix (e.g. قَالُوا, not قَالَ). */
function subjectInSuffix(tag: string): boolean {
  const { feats } = split(tag);
  const { person, gender, number } = pgn(tag);
  if (feats.includes('PERF')) return !(person === '3' && number === 'S');
  if (feats.includes('IMPV')) return !(gender === 'M' && number === 'S');
  // Imperfect: duals, plurals (not 1st person) and "you (feminine)" have a subject suffix.
  return (person !== '1' && (number === 'D' || number === 'P')) || (person === '2' && gender === 'F' && number === 'S');
}

/** Plain pronoun for a pronoun suffix in a role (0 subject, 1 object, 2 possessive). */
function pronoun(tag: string, role: 0 | 1 | 2): string {
  const { person = '3', gender = '', number = 'S' } = pgn(tag);
  const key = person === '2' ? '2' : person === '1' ? `1${number === 'S' ? 'S' : 'P'}` : number === 'S' ? `3${gender}S` : `3${number}`;
  return PRONOUNS[key]?.[role] ?? 'pronoun';
}

/**
 * The parts of a word, in reading order (right to left), with short labels and grammar names.
 * The stem is the first segment that is not a prefix.
 */
export function describeParts(segments: Segment[]): Part[] {
  const stemAt = Math.max(0, segments.findIndex((s) => !split(s.tag).feats.includes('PREF')));
  const stem = segments[stemAt]!;
  const stemKind = segmentKind(stem.tag);
  let subjectDone = false;
  return segments.map((s, i): Part => {
    const [name, label] = names(s.tag);
    if (i < stemAt) return { text: s.text, role: 'prefix', label: prefixLabel(s), title: name };
    if (i === stemAt) return { text: s.text, role: 'stem', label, title: name };
    if (segmentKind(s.tag) !== 'PRON') return { text: s.text, role: 'suffix', label, title: name };
    // Pronoun suffix: subject (first one on a verb that needs it), object, or possessive.
    let role: 0 | 1 | 2 = stemKind === 'V' || split(stem.tag).top === 'P' ? 1 : 2;
    if (stemKind === 'V' && !subjectDone && subjectInSuffix(stem.tag)) role = 0;
    if (stemKind === 'V') subjectDone = true;
    const what = ['Subject pronoun', 'Object pronoun', 'Possessive pronoun'][role]!;
    const pgnText = pgnWords(s.tag).join(' ');
    return { text: s.text, role: 'suffix', label: pronoun(s.tag, role), title: pgnText ? `${what}: ${pgnText}` : what };
  });
}

/**
 * The grammar of the word's stem in plain English, as two lines of items, e.g.
 * [["Verb", "Form I", "perfect (past)", "active"], ["3rd person", "masculine", "plural"]].
 */
export function grammarLines(segments: Segment[]): [string[], string[]] {
  const parts = describeParts(segments);
  const stemAt = Math.max(0, parts.findIndex((p) => p.role === 'stem'));
  const stem = segments[stemAt]!;
  const { top, feats } = split(stem.tag);
  const [name] = names(stem.tag);
  const form = feats.find((f) => f.startsWith('VF:'));
  const formText = form ? [`Form ${ROMAN[Number(form.slice(3))] ?? form.slice(3)}`] : [];
  if (top === 'P') return [[name], []];
  if (top === 'V') {
    const aspect = feats.map((f) => ASPECT[f]).find(Boolean);
    const mood = feats.map((f) => MOOD[f]).find(Boolean);
    const line1 = [name, ...formText, aspect, feats.includes('PASS') ? 'passive' : 'active', mood];
    return [line1.filter((x): x is string => !!x), pgnWords(stem.tag)];
  }
  const kase = feats.map((f) => CASE[f]).find(Boolean);
  const definite = segments.slice(0, stemAt).some((s) => segmentKind(s.tag) === 'DET');
  const state = definite ? 'definite' : feats.includes('INDEF') ? 'indefinite' : undefined;
  return [[name, ...formText, kase, state].filter((x): x is string => !!x), pgnWords(stem.tag)];
}
