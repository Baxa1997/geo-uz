// What the backend's question suggestions return, for the sample business (a Tashkent dental clinic):
// "Suggest more" for a topic or for all of them, Discovery from services and customer types, and
// questions about imported keywords. The real backend writes them with a model; here they come from
// fixed lists, so a list runs out after a few rounds and then nothing new is suggested.
import { languageOfText } from "@/shared/helpers/prompts";
import type { PromptLanguage } from "@/shared/types/api";

type Pool = Record<PromptLanguage, string[]>;

/** More questions per topic (the codes of messages/Topics), in both languages. */
const MORE: Record<string, Pool> = {
  best: {
    uz: [
      "Toshkentda qaysi stomatologiya klinikasiga ishonsa boʻladi?",
      "Toshkentdagi eng zamonaviy stomatologiya qaysi?",
      "Oilaviy stomatologiya uchun Toshkentda qaysi klinikani tanlash kerak?",
      "Toshkentda shifokorlari tajribali stomatologiya qaysi?",
    ],
    ru: [
      "Какая стоматология в Ташкенте самая надёжная?",
      "Посоветуйте хорошую семейную стоматологию в Ташкенте",
      "Лучшие стоматологические клиники Ташкента по отзывам",
      "В какую стоматологию в Ташкенте пойти впервые?",
    ],
  },
  implants: {
    uz: [
      "Toshkentda bitta implant qoʻyish qancha turadi?",
      "Implant qoʻyish ogʻriqlimi va qancha vaqt oladi?",
      "Toshkentda qaysi klinika Straumann implantlarini qoʻyadi?",
      "Bir kunda implant qoʻyadigan klinika Toshkentda bormi?",
    ],
    ru: [
      "Где в Ташкенте поставить имплант с гарантией?",
      "Сколько стоит имплантация зубов под ключ в Ташкенте?",
      "Какая клиника в Ташкенте ставит импланты за один день?",
      "Отзывы об имплантации зубов в Ташкенте",
    ],
  },
  kids: {
    uz: [
      "Bolani birinchi marta qaysi stomatologga olib borish kerak?",
      "Toshkentda bolalar uchun ogʻriqsiz tish davolash qayerda?",
      "Bolalar stomatologiyasi narxlari Toshkentda",
      "Bolam tish shifokoridan qoʻrqadi — Toshkentda qaysi klinika mos?",
    ],
    ru: [
      "Хороший детский стоматолог в Ташкенте",
      "Где в Ташкенте лечат молочные зубы без боли?",
      "Детская стоматология в Ташкенте с игровой зоной",
      "Сколько стоит лечение зубов ребёнку в Ташкенте?",
    ],
  },
  emergency: {
    uz: [
      "Tishim qattiq ogʻriyapti, Toshkentda hozir qayerga borsam boʻladi?",
      "Toshkentda dam olish kunlari ishlaydigan stomatologiya",
      "Shoshilinch tish olish Toshkentda qayerda?",
      "Toshkentda 24 soat ishlaydigan tish klinikasi bormi?",
    ],
    ru: [
      "Круглосуточная стоматология в Ташкенте",
      "Где срочно вылечить зуб в Ташкенте сегодня?",
      "Стоматология в Ташкенте, работающая в воскресенье",
      "Острая зубная боль ночью — куда обратиться в Ташкенте?",
    ],
  },
  braces: {
    uz: [
      "Toshkentda breket qoʻyish narxi qancha?",
      "Elaynerlar yoki breketlar — qaysi biri yaxshi?",
      "Toshkentda yaxshi ortodont qayerda?",
      "Breketni necha yoshda qoʻyish mumkin?",
    ],
    ru: [
      "Сколько стоят брекеты в Ташкенте?",
      "Хороший ортодонт в Ташкенте с отзывами",
      "Где в Ташкенте поставить элайнеры?",
      "Брекеты взрослым в Ташкенте — где лучше?",
    ],
  },
  whitening: {
    uz: [
      "Toshkentda tish oqartirish qancha turadi?",
      "Tish oqartirish qancha vaqtga yetadi?",
      "Lazer bilan tish oqartirish Toshkentda qayerda?",
      "Tish oqartirishdan keyin tish sezgir boʻladimi?",
    ],
    ru: [
      "Сколько стоит отбеливание зубов в Ташкенте?",
      "Лазерное отбеливание зубов в Ташкенте отзывы",
      "Безопасно ли отбеливание зубов?",
      "Где в Ташкенте сделать отбеливание Zoom?",
    ],
  },
  location: {
    uz: [
      "Chilonzorda yaxshi stomatologiya bormi?",
      "Yunusoboddagi stomatologiya klinikalari",
      "Mirzo Ulugʻbek tumanida tish shifokori",
      "Sergeli tumanida arzon stomatologiya",
    ],
    ru: [
      "Стоматология рядом с метро в Ташкенте",
      "Хорошая стоматология в Юнусабаде",
      "Стоматология на Мирзо-Улугбеке",
      "Стоматология в Сергели недорого",
    ],
  },
  installment: {
    uz: [
      "Toshkentda tish davolashni boʻlib toʻlash mumkinmi?",
      "Implantni muddatli toʻlovga qoʻyadigan klinika",
      "Stomatologiyada Uzum Nasiya bilan toʻlash mumkinmi?",
    ],
    ru: [
      "Лечение зубов в рассрочку в Ташкенте",
      "Импланты в рассрочку без переплаты в Ташкенте",
      "Стоматология с оплатой через Uzum Nasiya",
    ],
  },
  prices: {
    uz: [
      "Toshkentda tish kanalini davolash narxi qancha?",
      "Tish olish Toshkentda necha pul?",
      "Toshkentda stomatologiya narxlari qanday?",
      "Arzon va sifatli stomatologiya Toshkentda",
    ],
    ru: [
      "Цены на лечение кариеса в Ташкенте",
      "Сколько стоит удалить зуб в Ташкенте?",
      "Недорогая и хорошая стоматология в Ташкенте",
      "Сравнение цен стоматологий Ташкента",
    ],
  },
  painless: {
    uz: [
      "Toshkentda ogʻriqsiz tish davolash qayerda?",
      "Narkoz ostida tish davolash Toshkentda",
      "Stomatologdan qoʻrqaman — qaysi klinikaga borsam boʻladi?",
    ],
    ru: [
      "Лечение зубов без боли в Ташкенте",
      "Лечение зубов под седацией в Ташкенте",
      "Боюсь стоматолога — куда пойти в Ташкенте?",
    ],
  },
  veneers: {
    uz: [
      "Toshkentda vinir qoʻyish narxi qancha?",
      "Vinirlar yoki koronkalar — qaysi biri yaxshi?",
      "Toshkentda “Hollywood tabassum” qayerda qilinadi?",
    ],
    ru: [
      "Сколько стоят виниры в Ташкенте?",
      "Где в Ташкенте поставить керамические виниры?",
      "Виниры или коронки — что лучше?",
    ],
  },
  root_canal: {
    uz: [
      "Toshkentda tish kanalini mikroskop bilan davolash",
      "Kanal davolash uchun necha marta borish kerak?",
      "Tish kanalini davolash ogʻriqlimi?",
    ],
    ru: [
      "Лечение каналов под микроскопом в Ташкенте",
      "Сколько стоит лечение каналов зуба в Ташкенте?",
      "Перелечивание каналов в Ташкенте",
    ],
  },
};

/** The topic codes the lists cover, in the order "Suggest more" goes through them. */
export const KNOWN_TOPICS = Object.keys(MORE);

const lower = (text: string) => text.charAt(0).toLowerCase() + text.slice(1);
const upper = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** Questions for a topic the lists don't know (one the client named): a couple per language. */
const generic = (topic: string): Pool => ({
  uz: [`${upper(topic)}: Toshkentda qaysi stomatologiya yaxshi?`, `Toshkentda ${lower(topic)} boʻyicha ishonchli klinika qaysi?`],
  ru: [`${upper(topic)}: какую стоматологию в Ташкенте выбрать?`, `${upper(topic)} в Ташкенте — где лучше?`],
});

export interface Draft {
  text: string;
  language: PromptLanguage;
  topic: string;
}

/** The questions a topic offers in the given languages, the languages taking turns. */
export function poolFor(topic: string, languages: PromptLanguage[]): Draft[] {
  const pool = MORE[topic] ?? generic(topic);
  const lists = languages.map((language) => pool[language].map((text) => ({ text, language, topic })));
  const longest = Math.max(0, ...lists.map((list) => list.length));
  return Array.from({ length: longest }, (_, index) => lists.flatMap((list) => list[index] ?? [])).flat();
}

/** What a service is about, by the words in its name: one of the known topics, or the service itself as a new topic. */
const SERVICE_WORDS: [RegExp, string][] = [
  [/implant|имплант/i, "implants"],
  [/breket|elayner|ortodont|брекет|элайнер|ортодонт/i, "braces"],
  [/bola|дет/i, "kids"],
  [/oqart|отбел/i, "whitening"],
  [/vinir|винир/i, "veneers"],
  [/kanal|канал/i, "root_canal"],
  [/ogʻriqsiz|og'riqsiz|narkoz|без боли|седац|наркоз/i, "painless"],
  [/nasiya|boʻlib|bo'lib|рассроч/i, "installment"],
  [/narx|arzon|цен|стоим|недорог/i, "prices"],
  [/tun|kech|shoshilinch|24|круглосуточ|срочн|ночь|ночью/i, "emergency"],
  [/tuman|metro|chilonzor|yunusobod|район|метро/i, "location"],
];

export const topicOfWords = (text: string, fallback: string) => SERVICE_WORDS.find(([words]) => words.test(text))?.[1] ?? fallback;

/** Discovery: a couple of questions per service and per customer type, in each chosen language. */
export function discoveryDrafts(services: string[], customers: string[], languages: PromptLanguage[]): Draft[] {
  const fromServices = services.flatMap((service) => poolFor(topicOfWords(service, service), languages).slice(0, 2 * languages.length));
  const fromCustomers = customers.flatMap((customer) =>
    languages.map((language) => ({
      text:
        language === "uz"
          ? `Toshkentda ${lower(customer)} uchun qaysi stomatologiya mos?`
          : `Какая стоматология в Ташкенте подойдёт (${lower(customer)})?`,
      language,
      topic: upper(customer),
    })),
  );
  return [...fromServices, ...fromCustomers];
}

/** Questions customers ask about each keyword, in the keyword's language. */
export function keywordDrafts(keywords: string[]): Draft[] {
  return keywords.flatMap((keyword): Draft[] => {
    const topic = topicOfWords(keyword, "other");
    return languageOfText(keyword) === "ru"
      ? [
          { text: `${upper(keyword)} в Ташкенте — где лучше?`, language: "ru", topic },
          // A keyword about the price already asks it
          { text: /цен|стоим/i.test(keyword) ? `${upper(keyword)}: где в Ташкенте дешевле?` : `Сколько стоит ${lower(keyword)} в Ташкенте?`, language: "ru", topic },
        ]
      : [
          { text: `Toshkentda ${lower(keyword)} qayerda yaxshi?`, language: "uz", topic },
          { text: /narx/i.test(keyword) ? `${upper(keyword)}: Toshkentda qayerda arzonroq?` : `${upper(keyword)} narxi Toshkentda qancha?`, language: "uz", topic },
        ];
  });
}
