// The onboarding endpoints. The mock only knows Tashkent dental clinics, so it "detects"
// every website as one, and suggests the clinics and questions the answers are written for.
import type { NewBrand, PromptSuggestion, SiteAnalysis, SuggestCompetitorsRequest } from "@/shared/types/api";
import { normalizeDomain } from "@/shared/helpers/domain";
import { BRANDS, OTHER_CLINICS, PROMPTS } from "./data";

const MAX_SUGGESTIONS = 6;

/** Every clinic the answers name, most visible first. */
const CLINICS: NewBrand[] = [BRANDS.samo, BRANDS.nur, BRANDS.oq, BRANDS.reg, ...Object.values(OTHER_CLINICS)].map(
  ({ name, aliases, domain }) => ({ name, aliases, domain }),
);

const DIGRAPHS = [
  ["sh", "ш"], ["ch", "ч"], ["yo", "ё"], ["yu", "ю"], ["ya", "я"],
  ["ts", "ц"], ["oʻ", "ў"], ["o'", "ў"], ["gʻ", "ғ"], ["g'", "ғ"],
];
const LETTERS: Record<string, string> = {
  a: "а", b: "б", c: "к", d: "д", e: "е", f: "ф", g: "г", h: "ҳ", i: "и", j: "ж", k: "к", l: "л", m: "м",
  n: "н", o: "о", p: "п", q: "қ", r: "р", s: "с", t: "т", u: "у", v: "в", w: "в", x: "х", y: "й", z: "з",
};

/** "Shifo Med" → "Шифо Мед": the Cyrillic spelling of a Latin name, letter by letter. */
function toCyrillic(text: string): string {
  let result = "";
  for (let i = 0; i < text.length; ) {
    const rest = text.slice(i).toLowerCase();
    const [latin, cyrillic] = DIGRAPHS.find(([pair]) => rest.startsWith(pair)) ?? [
      rest.charAt(0),
      LETTERS[rest.charAt(0)] ?? text.charAt(i),
    ];
    const upper = text.charAt(i) !== text.charAt(i).toLowerCase();
    result += upper ? cyrillic.toUpperCase() : cyrillic;
    i += latin.length;
  }
  return result;
}

const capitalize = (word: string) => word.charAt(0).toUpperCase() + word.slice(1);

/** What a Tashkent dental clinic's website says it offers, most important first. */
const SERVICES = ["Implantlar", "Breketlar", "Bolalar stomatologiyasi", "Tish oqartirish", "Kanal davolash"];

/** The profile a dental clinic's website gives: its category, city, a line about it and its services. */
const detected = (name: string) => ({
  category: "dental_clinic",
  city: "tashkent",
  description: `${name} — Toshkentdagi stomatologiya klinikasi: implantlar, breketlar, bolalar stomatologiyasi va tish oqartirish.`,
  services: SERVICES,
});

/** A known clinic as it is; any other site gets a name from its domain ("smile-line.uz" → "Smile Line"). */
export function analyzeSite(domain: string): SiteAnalysis {
  const known = CLINICS.find((clinic) => clinic.domain === domain);
  if (known) return { domain, name: known.name, aliases: known.aliases, ...detected(known.name) };

  const words = (domain.split(".")[0] ?? domain).split(/[-_]+/).filter(Boolean).map(capitalize);
  const name = words.join(" ");
  const aliases = [...new Set([words.join(""), toCyrillic(name)])].filter((alias) => alias !== name);
  return { domain, name, aliases, ...detected(name) };
}

/** The clinics other than the user's own. */
export function suggestCompetitors({ domain, name }: SuggestCompetitorsRequest): NewBrand[] {
  const own = normalizeDomain(domain);
  return CLINICS.filter(
    (clinic) => clinic.domain !== own && clinic.name.toLowerCase() !== name.trim().toLowerCase(),
  ).slice(0, MAX_SUGGESTIONS);
}

/** The questions the answers are written for, grouped by topic. */
export function suggestPrompts(): PromptSuggestion[] {
  const topics = [...new Set(PROMPTS.map((prompt) => prompt.topic))];
  return topics.flatMap((topic) =>
    PROMPTS.filter((prompt) => prompt.topic === topic).map(({ text, language }) => ({ text, language, topic })),
  );
}
