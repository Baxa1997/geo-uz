/** A table's ruler row: "|---|:--:|". */
const TABLE_RULE = /^\|?[\s:|-]+\|?$/;

/**
 * Markdown answer → its first plain-text lines. Inline citations "([site.uz](…))" are dropped
 * (they're listed separately), other links become their text, emphasis and list markers go, and a
 * table row reads as its cells.
 */
export function plainLines(markdown: string, max: number): string[] {
  return markdown
    .replace(/\s*\(\[[^\]]*\]\([^)]*\)\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_`#>]/g, "")
    .split("\n")
    .map((line) => line.replace(/^\s*(?:\d+\.|[-•])\s+/, "").trim())
    .filter((line) => line && !(line.includes("|") && TABLE_RULE.test(line)))
    .map((line) =>
      line.startsWith("|")
        ? line
            .split("|")
            .map((cell) => cell.trim())
            .filter(Boolean)
            .join(", ")
        : line,
    )
    .slice(0, max);
}

/** The answer's opening as one line of plain text, for lists. */
export const answerExcerpt = (markdown: string) => plainLines(markdown, 3).join(" ");
