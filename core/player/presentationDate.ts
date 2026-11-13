export function resolvePresentationDate(
  deckDate: Date | undefined,
  standaloneBuildDate: string | undefined,
): Date {
  if (deckDate) return new Date(deckDate.getTime());
  if (standaloneBuildDate) {
    const [year, month, day] = standaloneBuildDate.split("-").map(Number);
    return new Date(year, month - 1, day);
  }
  return new Date();
}

export function resolvePdfExportDate(
  deckDate: Date | undefined,
  presentationDate: Date,
  standaloneBuildDate: string | undefined,
  now = new Date(),
): Date {
  if (deckDate) return new Date(deckDate.getTime());
  if (standaloneBuildDate) return new Date(presentationDate.getTime());
  return new Date(now.getTime());
}
