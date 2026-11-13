const MAX_COPYRIGHT_NOTICE_LENGTH = 256;
const MAX_EXPANDED_COPYRIGHT_NOTICE_LENGTH = 512;
const MAX_COPYRIGHT_VALIDATION_DATE = new Date(9999, 11, 31);
const longDateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

/** Validate a notice at deck-definition time so rendering validated deck data cannot fail. */
export function validateCopyrightNotice(notice: string | undefined, date?: Date): void {
  if (notice === undefined || notice === "") return;
  if (typeof notice !== "string") throw new TypeError("Copyright notice must be text");
  if (notice.trim().length === 0) {
    throw new RangeError("Copyright notice must contain visible text or be an empty string");
  }
  if (notice.length > MAX_COPYRIGHT_NOTICE_LENGTH) {
    throw new RangeError(
      `Copyright notice must not exceed ${MAX_COPYRIGHT_NOTICE_LENGTH} characters`,
    );
  }

  const expansionDate = date ?? MAX_COPYRIGHT_VALIDATION_DATE;
  if (Number.isNaN(expansionDate.getTime())) {
    throw new RangeError("Copyright notice date is invalid");
  }
  const expanded = expandCopyrightNotice(notice, expansionDate);
  if (expanded.length > MAX_EXPANDED_COPYRIGHT_NOTICE_LENGTH) {
    throw new RangeError(
      `Expanded copyright notice must not exceed ${MAX_EXPANDED_COPYRIGHT_NOTICE_LENGTH} characters`,
    );
  }
}

/** Expand a notice already validated by `defineDeck`; total and side-effect free at render time. */
export function formatCopyrightNotice(notice: string | undefined, date: Date): string | undefined {
  return notice === undefined ? undefined : expandCopyrightNotice(notice, date);
}

function expandCopyrightNotice(notice: string, date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return notice.replace(/\{(year|date|longDate)\}/g, (placeholder, name: string) => {
    switch (name) {
      case "year":
        return String(date.getFullYear());
      case "date":
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
      case "longDate":
        return longDateFormat.format(date);
      default:
        return placeholder;
    }
  });
}
