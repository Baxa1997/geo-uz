// The landing page's product views: the Tashkent dental clinic's report, what the assistants say of it,
// its fixes and its site checks. Unlike the rest of mocks/, this is also used with the real backend. It is
// sample data shown as an illustration, never a visitor's own results.
import type { BrandView } from "@/shared/types/api";
import { buildActions } from "./action-items";
import { PROJECT, PROMPTS } from "./data";
import { buildReport, SEEDED_RUN } from "./report";
import { siteChecks } from "./site-checks";

export const DEMO_REPORT = buildReport(PROJECT, PROMPTS, "week", SEEDED_RUN);

/** The sample clinic's recommended fixes, as Harakatlar would list them. */
export const DEMO_ACTIONS = buildActions(DEMO_REPORT);

/** The four checks of the sample clinic's website. */
export const DEMO_SITE_CHECKS = siteChecks(PROJECT.brand.domain);

/**
 * What ChatGPT says when asked about the sample clinic by name, in Russian and in Uzbek (Gemini with Google Search
 * is paused since 21 Nov 2026), each statement against its website
 * (mocks/data: open every day 9:00–21:00, implants from $450, Yunusobod, the first exam free).
 */
export const DEMO_BRAND_VIEW: BrandView[] = [
  {
    engine: "chatgpt",
    name: "ChatGPT",
    language: "ru",
    question: "Что вы знаете о «Oq Tabassum» (Ташкент)?",
    known: "knows",
    citations: [],
    statements: [
      {
        topic: "what",
        check: "confirmed",
        text: {
          uz: "Toshkentdagi oilaviy stomatologiya klinikasi: implantlar, breketlar va bolalar stomatologiyasi.",
          ru: "Семейная стоматология в Ташкенте: импланты, брекеты и детская стоматология.",
          en: "A family dental clinic in Tashkent: implants, braces and children's dentistry.",
        },
        correct: null,
      },
      {
        topic: "prices",
        check: "contradicted",
        text: { uz: "Implant oʻrnatish 300 $ dan.", ru: "Установка импланта — от 300 $.", en: "An implant costs from $300." },
        correct: { uz: "implant 450 $ dan (Osstem).", ru: "имплант от 450 $ (Osstem).", en: "implants from $450 (Osstem)." },
      },
      {
        topic: "place",
        check: "confirmed",
        text: {
          uz: "Yunusobod tumanida, Amir Temur shoh koʻchasida joylashgan.",
          ru: "Находится в Юнусабадском районе, на проспекте Амира Темура.",
          en: "It is in Yunusobod district, on Amir Temur avenue.",
        },
        correct: null,
      },
      {
        topic: "reputation",
        check: "unverified",
        text: {
          uz: "2GIS’da mijozlar ogʻriqsiz davolashni maqtashadi.",
          ru: "На 2GIS клиенты хвалят безболезненное лечение.",
          en: "On 2GIS, customers praise its painless treatment.",
        },
        correct: null,
      },
    ],
  },
  {
    engine: "chatgpt",
    name: "ChatGPT",
    language: "uz",
    question: "Oq Tabassum (Tashkent) haqida nima bilasiz?",
    known: "knows",
    citations: [],
    statements: [
      {
        topic: "contacts",
        check: "contradicted",
        text: { uz: "Yakshanba kuni ishlamaydi.", ru: "По воскресеньям не работает.", en: "It is closed on Sundays." },
        correct: {
          uz: "har kuni, yakshanba ham, 9:00–21:00 ishlaydi.",
          ru: "работает каждый день, включая воскресенье, с 9:00 до 21:00.",
          en: "open every day, Sundays included, 9:00–21:00.",
        },
      },
      {
        topic: "prices",
        check: "confirmed",
        text: { uz: "Birinchi koʻrik va maslahat bepul.", ru: "Первый осмотр и консультация бесплатны.", en: "The first exam and consultation are free." },
        correct: null,
      },
      {
        topic: "other",
        check: "unverified",
        text: { uz: "Toshkentda ikkita filiali bor.", ru: "В Ташкенте у клиники два филиала.", en: "It has two branches in Tashkent." },
        correct: null,
      },
    ],
  },
];
