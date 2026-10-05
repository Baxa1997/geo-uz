/** Translated label for a code from the API (category, city, topic), or the code itself. */
export const labelFor = (dictionary: Record<string, string>, key: string) => dictionary[key] ?? key;
