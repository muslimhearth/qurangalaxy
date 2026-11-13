/** Shortens `text` to at most `max` characters, cut at a space, with "…" when cut. */
export function snippet(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const space = cut.lastIndexOf(' ');
  return `${(space > 0 ? cut.slice(0, space) : cut).replace(/[,;:]$/, '')}…`;
}
