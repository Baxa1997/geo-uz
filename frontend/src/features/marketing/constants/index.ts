import { BrowserIcon as Browser } from "@phosphor-icons/react/dist/ssr/Browser";
import { ChatCenteredTextIcon as ChatText } from "@phosphor-icons/react/dist/ssr/ChatCenteredText";
import { EnvelopeSimpleIcon as Envelope } from "@phosphor-icons/react/dist/ssr/EnvelopeSimple";
import { FilePdfIcon as FilePdf } from "@phosphor-icons/react/dist/ssr/FilePdf";
import { HandCoinsIcon as HandCoins } from "@phosphor-icons/react/dist/ssr/HandCoins";
import { LinkIcon as Link2 } from "@phosphor-icons/react/dist/ssr/Link";
import { MapPinAreaIcon as MapPinned } from "@phosphor-icons/react/dist/ssr/MapPinArea";
import { MagnifyingGlassIcon as Search } from "@phosphor-icons/react/dist/ssr/MagnifyingGlass";
import { PaperPlaneTiltIcon as Send } from "@phosphor-icons/react/dist/ssr/PaperPlaneTilt";
import { PlugIcon as Plug } from "@phosphor-icons/react/dist/ssr/Plug";
import { RobotIcon as Bot } from "@phosphor-icons/react/dist/ssr/Robot";
import { SparkleIcon as Sparkles } from "@phosphor-icons/react/dist/ssr/Sparkle";
import { TranslateIcon as Languages } from "@phosphor-icons/react/dist/ssr/Translate";
import { UsersThreeIcon as Users } from "@phosphor-icons/react/dist/ssr/UsersThree";
import { WrenchIcon as Wrench } from "@phosphor-icons/react/dist/ssr/Wrench";
import { IconActions, IconCompetitors, IconMentions, IconPlace, IconRating, IconReports, IconWrongFacts } from "@/shared/components/own-icons";
import { PLAN_PRICES } from "@/shared/constants";
import type { DemoSector } from "@/shared/types/api";
import type { AppIcon } from "@/shared/types/icon";

/** Steps of the progress screen on /check; keys in messages/Check. */
export const CHECK_STEPS = ["stepSite", "stepQuestions", "stepAnswers", "stepResult"] as const;
export const CHECK_STEP_MS = 1200;

/** How much of the free result to show. */
export const PREVIEW_MAX_MISSED = 3;
export const PREVIEW_MAX_DOMAINS = 3;

// ─── Landing page ───────────────────────────────────────────────────────────
// Rebuilt on 16 Nov 2026 after the user's look at vizibleai.com ("not accurate and not structured
// correctly"): the structure of a clear product page (what it is and one field, who we ask, how it works,
// one real product view per feature, who it is for, prices, questions), in our own look and words. Every
// claim is what the product does on that date; what is planned says "soon".

/** Anchor ids of the landing sections, in the page's order (the navbar, footer and buttons link to them). */
export const SECTION = {
  check: "check",
  engines: "engines",
  how: "how",
  metrics: "metrics",
  compare: "compare",
  brand: "brand",
  fixes: "fixes",
  report: "report",
  local: "local",
  audience: "audience",
  pricing: "pricing",
  faq: "faq",
  demo: "demo",
} as const;

export type SectionId = (typeof SECTION)[keyof typeof SECTION];

/** One link inside a navbar menu; title and text in messages/Landing.nav.items. */
export interface NavItem {
  key: "metrics" | "compare" | "brand" | "fixes" | "report" | "audience";
  hash: SectionId;
  icon: AppIcon;
}

/**
 * An icon on the public pages sits in a filled, rounded square, white on a color of its own (the navbar's
 * menu, the "why us" cards). The colors are taken in this order.
 */
export const TILE_COLORS = ["#3b7ddd", "#4a8263", "#cf7a2c", "#8763b4", "#b24f80", "#14182b"] as const;

/** The navbar: the product's menu, then plain links. Labels in messages/Landing.nav. */
export const NAV: ({ key: "product"; items: NavItem[] } | { key: "how" | "pricing" | "faq"; hash: SectionId })[] = [
  {
    key: "product",
    items: [
      { key: "metrics", hash: SECTION.metrics, icon: IconMentions },
      { key: "compare", hash: SECTION.compare, icon: IconCompetitors },
      { key: "brand", hash: SECTION.brand, icon: IconWrongFacts },
      { key: "fixes", hash: SECTION.fixes, icon: IconActions },
      { key: "report", hash: SECTION.report, icon: IconReports },
      { key: "audience", hash: SECTION.audience, icon: Users },
    ],
  },
  { key: "how", hash: SECTION.how },
  { key: "pricing", hash: SECTION.pricing },
  { key: "faq", hash: SECTION.faq },
];

/**
 * The assistants, as the product asks them on 21 Nov 2026: ChatGPT in every check; Gemini is paused (Google's terms
 * for Gemini with Google Search don't allow its answers in a report for a business: `ANSWER_ENGINES`), and Google's
 * AI answers in search and Yandex are planned. Generic icons, not the companies' logos. Texts in
 * messages/Landing.engines.
 */
export const ENGINE_TILES: { key: "chatgpt" | "gemini" | "googleAi" | "yandex"; live: boolean; icon: AppIcon }[] = [
  { key: "chatgpt", live: true, icon: Bot },
  { key: "gemini", live: false, icon: Sparkles },
  { key: "googleAi", live: false, icon: Browser },
  { key: "yandex", live: false, icon: Search },
];

/**
 * Where people in Uzbekistan ask, in whole percent: AI chatbots' market share and search engines' market
 * share, StatCounter Global Stats, October 2026 (gs.statcounter.com/ai-chatbot-market-share/all/uzbekistan
 * and /search-engine-market-share/all/uzbekistan, read on 16 Nov 2026: Gemini 58.19, ChatGPT 34.86, Google
 * 75.88, Yandex 21.92). Update the numbers and the month in messages (Landing.engines.figures) together.
 */
export const MARKET_FIGURES = { gemini: 58, chatgpt: 35, google: 76, yandex: 22 } as const;

/** The three steps of "How it works"; texts in messages/Landing.how.steps. */
export const HOW_STEPS = ["site", "check", "results"] as const;

/** The three numbers we report per brand; texts in messages/Landing.metrics.tabs. */
export const METRICS: { key: "visibility" | "position" | "tone"; icon: AppIcon }[] = [
  { key: "visibility", icon: IconMentions },
  { key: "position", icon: IconPlace },
  { key: "tone", icon: IconRating },
];

/** How many cited sites and fixes the product views show. */
export const SHOWN_SOURCES = 6;
export const SHOWN_ACTIONS = 5;

/** Where the report goes; texts in messages/Landing.report.channels. Telegram's bot isn't built yet. */
export const REPORT_CHANNELS: { key: "link" | "pdf" | "email" | "telegram"; icon: AppIcon; soon?: true }[] = [
  { key: "link", icon: Link2 },
  { key: "pdf", icon: FilePdf },
  { key: "email", icon: Envelope },
  { key: "telegram", icon: Send, soon: true },
];

/** What only we do, as cards in the place of customer quotes, which we don't have. */
export const LOCAL: { key: "languages" | "sources" | "answers" | "install" | "price" | "managed"; icon: AppIcon }[] = [
  { key: "languages", icon: Languages },
  { key: "sources", icon: MapPinned },
  { key: "answers", icon: ChatText },
  { key: "install", icon: Plug },
  { key: "price", icon: HandCoins },
  { key: "managed", icon: Wrench },
];

/** Who it is for: the button of each card opens the free check, through the login (`SECTION.check`), or scrolls to the contact form. */
export const AUDIENCE: { key: "business" | "agency"; target: SectionId }[] = [
  { key: "business", target: SECTION.check },
  { key: "agency", target: SECTION.demo },
];

export type PlanKey = "free" | "start" | "business" | "agency";

/**
 * The plans as the user set them on 15 Nov 2026 (PLAN.md, "Prices and the free first check"). Standard and
 * Pro start from the free check too: the plan is then asked for in Sozlamalar › Tarif and switched on by
 * hand; Enterprise is by agreement.
 */
export const PRICING: {
  key: PlanKey;
  /** US dollars a month; null: by agreement. */
  price: number | null;
  /** Shown after the price; the free check has none. */
  period?: "month";
  recommended?: boolean;
  /** `SECTION.check`: the button opens the free check, through the login (`FREE_CHECK`); else the section it scrolls to. */
  target: SectionId;
}[] = [
  { key: "free", price: 0, target: SECTION.check },
  { key: "start", price: PLAN_PRICES.start, period: "month", target: SECTION.check },
  { key: "business", price: PLAN_PRICES.business, period: "month", recommended: true, target: SECTION.check },
  { key: "agency", price: PLAN_PRICES.agency, target: SECTION.demo },
];

export const PRICING_FEATURES = ["f1", "f2", "f3", "f4"] as const;

/**
 * A cell of the plan comparison: yes/no, a number, "soon" (planned, not built yet),
 * or the key of a text in messages/Landing.pricing.compare.values.
 */
export type PlanCell = boolean | number | "soon" | { value: "assistants" | "once" | "weekly" | "twiceWeekly" | "byCountry" | "several" };

const text = (value: Extract<PlanCell, object>["value"]): PlanCell => ({ value });

/**
 * Every plan against every feature, one cell per plan in the order of PRICING; labels in
 * messages/Landing.pricing.compare. As the product works on 16 Nov 2026: the free check is a whole project
 * for one check (answers, sources, what AI says, the fixes, the report's link); a paid plan adds the checks
 * after it and the email after each.
 */
export const PLAN_TABLE: {
  group: "coverage" | "discover" | "measure" | "act" | "report";
  rows: {
    key:
      | "engines" | "prompts" | "frequency" | "answers" | "projects" | "competitors" | "languages"
      | "siteAnalysis" | "competitorSuggestions" | "promptSuggestions" | "brandQuestions" | "ownPrompts"
      | "score" | "trend" | "allAnswers" | "sources" | "newCompetitors" | "brandAccuracy" | "factCheck"
      | "actions" | "audit"
      | "link" | "pdf" | "email" | "telegram" | "whiteLabel";
    cells: [PlanCell, PlanCell, PlanCell, PlanCell];
  }[];
}[] = [
  {
    group: "coverage",
    rows: [
      { key: "engines", cells: [text("assistants"), text("assistants"), text("assistants"), text("assistants")] },
      { key: "prompts", cells: [10, 25, 50, 300] },
      { key: "frequency", cells: [text("once"), text("weekly"), text("twiceWeekly"), text("twiceWeekly")] },
      // Questions × one assistant (ChatGPT; Gemini paused on 21 Nov 2026) × checks a month (4 weekly, 8 twice a
      // week); the free check asks ChatGPT its 10. One answer a question (RUN_SAMPLES=1).
      { key: "answers", cells: [10, 100, 400, 2400] },
      { key: "projects", cells: [1, 1, 1, text("several")] },
      { key: "competitors", cells: [5, 5, 5, 5] },
      { key: "languages", cells: [text("byCountry"), text("byCountry"), text("byCountry"), text("byCountry")] },
    ],
  },
  {
    group: "discover",
    rows: [
      { key: "siteAnalysis", cells: [true, true, true, true] },
      { key: "competitorSuggestions", cells: [true, true, true, true] },
      { key: "promptSuggestions", cells: [true, true, true, true] },
      { key: "brandQuestions", cells: [true, true, true, true] },
      { key: "ownPrompts", cells: [false, true, true, true] },
    ],
  },
  {
    group: "measure",
    rows: [
      { key: "score", cells: [true, true, true, true] },
      { key: "trend", cells: [false, true, true, true] },
      { key: "allAnswers", cells: [true, true, true, true] },
      { key: "sources", cells: [true, true, true, true] },
      { key: "newCompetitors", cells: [true, true, true, true] },
      { key: "brandAccuracy", cells: [true, true, true, true] },
      // Against the facts the client writes in Sozlamalar › Faktlar: Pro 20, Enterprise 50
      { key: "factCheck", cells: [false, false, true, true] },
    ],
  },
  {
    group: "act",
    rows: [
      { key: "actions", cells: [true, true, true, true] },
      { key: "audit", cells: [false, false, "soon", "soon"] },
    ],
  },
  {
    group: "report",
    rows: [
      { key: "link", cells: [true, true, true, true] },
      { key: "pdf", cells: [true, true, true, true] },
      { key: "email", cells: [false, true, true, true] },
      { key: "telegram", cells: [false, "soon", "soon", "soon"] },
      { key: "whiteLabel", cells: [false, false, false, "soon"] },
    ],
  },
];

export const FAQ = ["what", "seo", "engines", "accuracy", "countries", "notMentioned", "free", "install", "time"] as const;

export const DEMO_SECTORS: DemoSector[] = ["clinic", "real_estate", "education", "retail", "other"];

/**
 * The messages the public pages' client components translate in the browser, by path. Everything else on
 * the landing page is rendered on the server and needs none. Add a path here when a client component of
 * the navbar, the landing page or the dashboard preview starts using a new namespace: a missing one shows
 * as an error in the browser's console.
 */
export const LANDING_CLIENT_MESSAGES = [
  "Common",
  "LocaleSwitcher",
  "Tone",
  // The dashboard preview's chart, table and source list
  "MetricChart",
  "BrandTable",
  "SourcesTable",
  "SourceTypes",
  // Mobile menu, the metric tabs, the demo form, the website field
  "Landing.nav",
  "Landing.metrics",
  "Landing.demo",
  "Landing.siteLabel",
  "Landing.sitePlaceholder",
  "Landing.siteInvalid",
  "Landing.submit",
] as const;
