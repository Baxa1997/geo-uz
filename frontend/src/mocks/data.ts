// Mock data: one Tashkent dental clinic and three competitors.
// All clinic names, domains, prices and facts are fictional.
import type { Brand, CreatePromptRequest, NewBrand, Plan, Project, ProjectLimits, Prompt, SourceType } from "@/shared/types/api";

export const BRANDS = {
  oq: {
    id: "brd_oqtabassum",
    name: "Oq Tabassum",
    aliases: ["Oq Tabassum", "Ok Tabassum", "Оқ Табассум", "Ок Табассум"],
    domain: "oqtabassum.uz",
  },
  samo: {
    id: "brd_samodent",
    name: "Samo Dent",
    aliases: ["SamoDent", "Samo Dent Clinic", "Само Дент", "Самодент"],
    domain: "samodent.uz",
  },
  nur: {
    id: "brd_nurstom",
    name: "Nur Stomatologiya",
    aliases: ["Nur Stom", "Nur Dental", "Нур Стоматология", "Нур Стом"],
    domain: "nurstom.uz",
  },
  reg: {
    id: "brd_registandental",
    name: "Registan Dental",
    aliases: ["Registan Dent", "Регистан Дентал", "Регистан Дент"],
    domain: "registandental.uz",
  },
} satisfies Record<string, Brand>;

export type BrandKey = keyof typeof BRANDS;

/**
 * Clinics the answers name without a tone. Untracked, they take list positions but get no Mention;
 * a project can track them (onboarding suggests them), and then they get neutral Mentions.
 */
export const OTHER_CLINICS = {
  "Kamalak Dent": { name: "Kamalak Dent", aliases: ["Kamalak Dental", "Камалак Дент"], domain: "kamalakdent.uz" },
  "Yulduz Stom": { name: "Yulduz Stom", aliases: ["Yulduz Stomatologiya", "Юлдуз Стом"], domain: "yulduzstom.uz" },
  "Denta Lux": { name: "Denta Lux", aliases: ["DentaLux", "Дента Люкс"], domain: "dentalux.uz" },
} satisfies Record<string, NewBrand>;

export type OtherClinic = keyof typeof OTHER_CLINICS;

/** What each plan allows, as on the pricing table. */
export const PLAN_LIMITS: Record<Plan, ProjectLimits> = {
  start: { prompts: 25, competitors: 3 },
  business: { prompts: 75, competitors: 5 },
  agency: { prompts: 300, competitors: 5 },
};

/** Billing doesn't exist yet: every mock project is on the recommended plan. */
export const DEFAULT_PLAN: Plan = "business";

export const PROJECT: Project = {
  id: "prj_oqtabassum",
  brand: BRANDS.oq,
  competitors: [BRANDS.samo, BRANDS.nur, BRANDS.reg],
  category: "dental_clinic",
  city: "tashkent",
  languages: ["uz", "ru"],
  description:
    "Toshkentdagi oilaviy stomatologiya klinikasi: implantlar, breketlar, bolalar stomatologiyasi va tish oqartirish. Har kuni 9:00–21:00 ishlaydi.",
  services: ["Implantlar", "Breketlar", "Bolalar stomatologiyasi", "Tish oqartirish", "Professional gigiyena"],
  plan: DEFAULT_PLAN,
  limits: PLAN_LIMITS[DEFAULT_PLAN],
};

/** The sample project was set up a few days before its first weekly check (10 August). */
const SETUP_AT = "2026-08-05T09:20:00Z";

/** Two questions were added a month later: their own history starts with the check of 7 September. */
const ADDED_LATER: Record<string, string> = {
  prm_10: "2026-09-02T11:05:00Z",
  prm_20: "2026-09-02T11:07:00Z",
};

const SEEDED_PROMPTS: (CreatePromptRequest & { id: string })[] = [
  { id: "prm_01", language: "uz", topic: "best", text: "Toshkentdagi eng yaxshi stomatologiya klinikasi qaysi?" },
  { id: "prm_02", language: "uz", topic: "implants", text: "Toshkentda implant qoʻyish qayerda arzon va sifatli?" },
  { id: "prm_03", language: "uz", topic: "kids", text: "Toshkentda bolalar uchun yaxshi tish shifokori qayerda bor?" },
  { id: "prm_04", language: "uz", topic: "emergency", text: "Yakshanba kuni tishim ogʻrisa, Toshkentda qaysi klinika ochiq?" },
  { id: "prm_05", language: "uz", topic: "braces", text: "Toshkentda breket qoʻyish narxi qancha va qaysi klinika yaxshi?" },
  { id: "prm_06", language: "uz", topic: "whitening", text: "Tish oqartirish uchun Toshkentda qaysi klinikaga borish kerak?" },
  { id: "prm_07", language: "uz", topic: "location", text: "Chilonzorda yaxshi stomatologiya bormi?" },
  { id: "prm_08", language: "uz", topic: "installment", text: "Toshkentda tish davolashni boʻlib toʻlash mumkin boʻlgan klinikalar bormi?" },
  { id: "prm_09", language: "uz", topic: "prices", text: "Toshkentda tish tozalash (professional gigiyena) narxi qancha?" },
  { id: "prm_10", language: "uz", topic: "painless", text: "Toshkentda ogʻriqsiz tish davolaydigan klinika qaysi?" },
  { id: "prm_11", language: "ru", topic: "best", text: "Какая стоматология в Ташкенте самая лучшая?" },
  { id: "prm_12", language: "ru", topic: "implants", text: "Где в Ташкенте поставить имплант недорого и качественно?" },
  { id: "prm_13", language: "ru", topic: "kids", text: "Посоветуйте детского стоматолога в Ташкенте с хорошими отзывами" },
  { id: "prm_14", language: "ru", topic: "emergency", text: "Круглосуточная стоматология в Ташкенте — куда обратиться ночью?" },
  { id: "prm_15", language: "ru", topic: "braces", text: "Сколько стоят брекеты в Ташкенте и где их лучше ставить?" },
  { id: "prm_16", language: "ru", topic: "veneers", text: "Где в Ташкенте сделать виниры и сколько это стоит?" },
  { id: "prm_17", language: "ru", topic: "location", text: "Хорошая стоматология в Юнусабаде" },
  { id: "prm_18", language: "ru", topic: "installment", text: "Стоматология в Ташкенте с рассрочкой и хорошими отзывами" },
  { id: "prm_19", language: "ru", topic: "prices", text: "Сколько стоит коронка из циркония в Ташкенте?" },
  { id: "prm_20", language: "ru", topic: "root_canal", text: "Где в Ташкенте лечат каналы под микроскопом?" },
];

export const PROMPTS: Prompt[] = SEEDED_PROMPTS.map((prompt) => ({
  ...prompt,
  createdAt: ADDED_LATER[prompt.id] ?? SETUP_AT,
  archivedAt: null,
}));

/** A question the sample client stopped tracking after six checks. */
export const ARCHIVED_PROMPT: Prompt = {
  id: "prm_21",
  language: "uz",
  topic: "prices",
  text: "Toshkentda tishni professional tozalash qayerda arzon?",
  createdAt: SETUP_AT,
  archivedAt: "2026-09-16T08:40:00Z",
};

/** It has no answers of its own: its last check reuses those of the question on the same subject. */
export const ARCHIVED_PROMPT_ANSWERS = "prm_09";

/** Pages ChatGPT cites in the answers. */
export const SOURCES = {
  gisSearch: "https://2gis.uz/tashkent/search/stomatologiya",
  gisOq: "https://2gis.uz/tashkent/firm/70000001062718431",
  gisNur: "https://2gis.uz/tashkent/firm/70000001053381926",
  gisReg: "https://2gis.uz/tashkent/firm/70000001058806612",
  oqPrices: "https://oqtabassum.uz/narxlar",
  oqContacts: "https://oqtabassum.uz/kontaktlar",
  oqInstagram: "https://www.instagram.com/oqtabassum.uz/",
  samoServices: "https://samodent.uz/ru/services",
  samoKids: "https://samodent.uz/uz/bolalar-stomatologiyasi",
  samoInstagram: "https://www.instagram.com/samodent/",
  nurImplants: "https://nurstom.uz/implantatsiya",
  nurPrices: "https://nurstom.uz/ru/prices",
  regEmergency: "https://registandental.uz/24-7",
  kunPrices: "https://kun.uz/news/2026/08/14/toshkentda-stomatologiya-xizmatlari-narxlari",
  gazetaPrices: "https://www.gazeta.uz/ru/2026/07/22/dentistry-prices/",
  topclinicsList: "https://topclinics.uz/tashkent/stomatologiya",
  topclinicsImplants: "https://topclinics.uz/ru/tashkent/implantatsiya",
  med103: "https://103.uz/tashkent/stomatologii/",
} satisfies Record<string, string>;

export type SourceKey = keyof typeof SOURCES;

/**
 * The clinics each cited page names: what the backend finds when it reads the page. Kept in line with
 * LISTINGS: a clinic is on a site when one of the site's cited pages names it.
 */
export const PAGE_MENTIONS: Record<SourceKey, BrandKey[]> = {
  gisSearch: ["samo", "nur", "oq", "reg"],
  gisOq: ["oq"],
  gisNur: ["nur"],
  gisReg: ["reg"],
  oqPrices: ["oq"],
  oqContacts: ["oq"],
  oqInstagram: ["oq"],
  samoServices: ["samo"],
  samoKids: ["samo"],
  samoInstagram: ["samo"],
  nurImplants: ["nur"],
  nurPrices: ["nur"],
  regEmergency: ["reg"],
  // A prices round-up that names no clinic
  kunPrices: [],
  gazetaPrices: ["samo"],
  topclinicsList: ["samo", "nur"],
  topclinicsImplants: ["nur", "samo"],
  med103: ["samo", "nur"],
};

/** Questions offered on the Questions page after onboarding: buyers ask them, the project doesn't track them yet. */
export const SUGGESTED_PROMPTS: CreatePromptRequest[] = [
  { language: "uz", topic: "implants", text: "Toshkentda implant necha yil xizmat qiladi va qaysi klinika kafolat beradi?" },
  { language: "uz", topic: "kids", text: "Yunusobodda yaxshi bolalar stomatologi bormi?" },
  { language: "uz", topic: "whitening", text: "Tish oqartirish zararli emasmi va Toshkentda qancha turadi?" },
  { language: "uz", topic: "emergency", text: "Toshkentda kechasi ochiq stomatologiya bormi?" },
  { language: "uz", topic: "prices", text: "Toshkentda tish plombasi narxi qancha?" },
  { language: "uz", topic: "braces", text: "Kattalar uchun breket yoki elayner — Toshkentda qayerda qilish yaxshi?" },
  { language: "ru", topic: "whitening", text: "Где в Ташкенте сделать отбеливание зубов недорого?" },
  { language: "ru", topic: "implants", text: "Какие импланты лучше ставить в Ташкенте и сколько они стоят?" },
  { language: "ru", topic: "kids", text: "Где в Ташкенте лечат детям зубы под наркозом?" },
  { language: "ru", topic: "location", text: "Хорошая стоматология в Чиланзаре с отзывами" },
  { language: "ru", topic: "painless", text: "Где в Ташкенте лечат зубы во сне?" },
  { language: "ru", topic: "prices", text: "Сколько стоит профессиональная чистка зубов в Ташкенте?" },
];

/** What kind of site a cited domain is; a brand's own site and its competitors' are worked out per project. */
export const SOURCE_TYPES: Record<string, SourceType> = {
  "2gis.uz": "directory",
  "topclinics.uz": "directory",
  "103.uz": "directory",
  "kun.uz": "news",
  "gazeta.uz": "news",
  "instagram.com": "social",
};

/** Domains where each brand has a listing or profile (drives Source.brandListed). */
export const LISTINGS: Record<string, string[]> = {
  [BRANDS.oq.id]: ["2gis.uz", "instagram.com", "oqtabassum.uz"],
  [BRANDS.samo.id]: ["2gis.uz", "instagram.com", "samodent.uz", "topclinics.uz", "103.uz", "gazeta.uz"],
  [BRANDS.nur.id]: ["2gis.uz", "nurstom.uz", "topclinics.uz", "103.uz"],
  [BRANDS.reg.id]: ["2gis.uz", "registandental.uz"],
};

/** Visibility in the previous period, used to derive BrandScore.trend. */
export const PREVIOUS_VISIBILITY: Record<string, number> = {
  [BRANDS.oq.id]: 0.35,
  [BRANDS.samo.id]: 0.75,
  [BRANDS.nur.id]: 0.43,
  [BRANDS.reg.id]: 0.22,
};
