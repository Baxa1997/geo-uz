/** "https://www.Example.uz/about" → "example.uz" */
export function normalizeDomain(input: string): string {
  const host = input.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "");
  return host.split(/[/?#]/)[0] ?? host;
}

export const isValidDomain = (domain: string) =>
  /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/.test(domain);
