// The web searches ChatGPT ran before each answer, as the search tool reports them. Four per seeded
// question, in the question's language with one in the other one: ChatGPT often searches in both.
const SEARCHES: Record<string, readonly [string, string, string, string]> = {
  prm_01: ["Toshkent eng yaxshi stomatologiya klinikasi", "Toshkent stomatologiya reyting 2026", "stomatologiya Toshkent sharhlar", "лучшая стоматология Ташкент отзывы"],
  prm_02: ["Toshkent implant qoʻyish narxi", "Toshkent implantatsiya klinika sharhlar", "arzon implant Toshkent Osstem narxi", "имплантация зубов Ташкент цены"],
  prm_03: ["Toshkent bolalar stomatologiyasi", "bolalar tish shifokori Toshkent sharhlar", "bolalar stomatologi Toshkent narx", "детская стоматология Ташкент отзывы"],
  prm_04: ["Toshkent yakshanba ishlaydigan stomatologiya", "Toshkent 24 soat stomatologiya", "tish ogʻrigʻi shoshilinch yordam Toshkent", "круглосуточная стоматология Ташкент"],
  prm_05: ["Toshkent breket narxi 2026", "breket qoʻyish Toshkent klinika", "ortodont Toshkent sharhlar", "брекеты Ташкент цена"],
  prm_06: ["Toshkent tish oqartirish narxi", "tish oqartirish klinika Toshkent sharhlar", "tish oqartirish ZOOM Toshkent", "отбеливание зубов Ташкент"],
  prm_07: ["Chilonzor stomatologiya", "Chilonzor tumani stomatologiya sharhlar", "Chilonzor tish shifokori 2GIS", "стоматология Чиланзар отзывы"],
  prm_08: ["Toshkent stomatologiya boʻlib toʻlash", "tish davolash muddatli toʻlov Toshkent", "implant boʻlib toʻlash Toshkent", "стоматология в рассрочку Ташкент"],
  prm_09: ["Toshkent professional tish tozalash narxi", "tish gigiyenasi Air Flow narxi Toshkent", "stomatologiya narxlari Toshkent 2026", "чистка зубов Ташкент цена"],
  prm_10: ["ogʻriqsiz tish davolash Toshkent", "sedatsiya bilan tish davolash Toshkent", "Toshkent stomatologiya ogʻriqsizlantirish sharhlar", "лечение зубов без боли Ташкент"],
  prm_11: ["лучшая стоматология Ташкент", "стоматология Ташкент рейтинг 2026", "стоматология Ташкент отзывы 2ГИС", "Toshkent eng yaxshi stomatologiya"],
  prm_12: ["имплантация зубов Ташкент цена", "клиника имплантации Ташкент отзывы", "недорогой имплант Ташкент Osstem", "Toshkent implant narxi"],
  prm_13: ["детский стоматолог Ташкент отзывы", "детская стоматология Ташкент", "лечение зубов детям Ташкент цена", "bolalar stomatologiyasi Toshkent"],
  prm_14: ["круглосуточная стоматология Ташкент", "стоматология ночью Ташкент", "срочная стоматологическая помощь Ташкент", "Toshkent 24 soat stomatologiya"],
  prm_15: ["брекеты Ташкент цена 2026", "где поставить брекеты Ташкент отзывы", "ортодонт Ташкент", "Toshkent breket narxi"],
  prm_16: ["виниры Ташкент цена", "керамические виниры Ташкент клиника", "виниры E-max Ташкент отзывы", "Toshkent vinir narxi"],
  prm_17: ["стоматология Юнусабад", "стоматология Юнусабад отзывы", "стоматология Юнусабадский район 2ГИС", "Yunusobod stomatologiya"],
  prm_18: ["стоматология в рассрочку Ташкент", "лечение зубов в рассрочку Ташкент отзывы", "имплантация в рассрочку Ташкент", "Toshkent stomatologiya boʻlib toʻlash"],
  prm_19: ["циркониевая коронка цена Ташкент", "коронка из циркония Ташкент 2026", "цены на стоматологию Ташкент", "sirkoniy koronka narxi Toshkent"],
  prm_20: ["лечение каналов под микроскопом Ташкент", "эндодонтия микроскоп Ташкент клиника", "лечение каналов Ташкент цена", "kanal davolash mikroskop Toshkent"],
};

/** Which of a question's four searches each of its three answers ran: the first two are the common ones. */
const BY_SAMPLE: readonly (readonly number[])[] = [
  [0, 1],
  [0, 2],
  [1, 3],
];

/** The searches behind one answer of a seeded question (`sample` counts from 0). */
export function searchesFor(seededId: string, sample: number): string[] {
  const queries = SEARCHES[seededId];
  if (!queries) return [];
  return (BY_SAMPLE[sample % BY_SAMPLE.length] ?? []).flatMap((index) => queries[index] ?? []);
}
