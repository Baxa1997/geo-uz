/** The countries whose customers type in Russian (`firstrun.RUSSIAN_SPEAKING` in the backend). */
const RUSSIAN_SPEAKING = ["KZ", "KG", "TJ", "TM", "RU", "BY"];

/** The languages the questions are written in, by country, as the backend decides it (`firstrun.languages_for`). */
export const questionLanguages = (country: string) =>
  country === "UZ" ? (["uz", "ru"] as const) : RUSSIAN_SPEAKING.includes(country) ? (["ru"] as const) : (["en"] as const);
