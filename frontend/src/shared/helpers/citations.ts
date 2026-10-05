/** "([2gis.uz](url))" → "[2gis.uz](url)": citations show as chips, without the brackets. */
export const unwrapCitations = (text: string) =>
  text.replace(/\((\[[^\]]+\]\(https?:\/\/[^\s)]+\))\)/g, "$1");
