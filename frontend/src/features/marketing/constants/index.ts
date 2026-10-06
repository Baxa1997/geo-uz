import {
  CircleAlert,
  CircleQuestionMark,
  Eye,
  FileText,
  HandCoins,
  Languages,
  Link2,
  ListChecks,
  MapPinned,
  PhoneCall,
  ScanSearch,
  Send,
  Smile,
  Sparkles,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import type { DemoSector } from "@/shared/types/api";

/** Steps of the progress screen on /check; keys in messages/Check. */
export const CHECK_STEPS = ["stepSite", "stepQuestions", "stepAnswers", "stepResult"] as const;
export const CHECK_STEP_MS = 1200;

/** How much of the free result to show. */
export const PREVIEW_MAX_MISSED = 3;
export const PREVIEW_MAX_DOMAINS = 3;

// ─── Landing page ───────────────────────────────────────────────────────────
// Section order follows peec.ai's home page; the content is ours (see CLAUDE.md, "Landing page").

/** Anchor ids of the landing sections (navbar, footer and CTAs link to them). */
export const SECTION = {
  check: "check",
  metrics: "metrics",
  features: "features",
  method: "method",
  telegram: "telegram",
  reports: "reports",
  local: "local",
  pricing: "pricing",
  faq: "faq",
  demo: "demo",
} as const;

type SectionId = (typeof SECTION)[keyof typeof SECTION];

/** One link inside a navbar menu; title and text in messages/Landing.nav.items. */
export interface NavItem {
  key: "visibility" | "features" | "reports" | "telegram" | "check" | "method" | "faq" | "demo";
  hash: SectionId;
  icon: LucideIcon;
}

/** The navbar: a menu of section links, or a plain link. Labels in messages/Landing.nav. */
export const NAV: ({ key: "product" | "resources"; items: NavItem[] } | { key: "pricing" | "agencies"; hash: SectionId })[] =
  [
    {
      key: "product",
      items: [
        { key: "visibility", hash: SECTION.metrics, icon: Eye },
        { key: "features", hash: SECTION.features, icon: ListChecks },
        { key: "reports", hash: SECTION.reports, icon: FileText },
        { key: "telegram", hash: SECTION.telegram, icon: Send },
      ],
    },
    { key: "pricing", hash: SECTION.pricing },
    {
      key: "resources",
      items: [
        { key: "check", hash: SECTION.check, icon: ScanSearch },
        { key: "method", hash: SECTION.method, icon: Sparkles },
        { key: "faq", hash: SECTION.faq, icon: CircleQuestionMark },
        { key: "demo", hash: SECTION.demo, icon: PhoneCall },
      ],
    },
    { key: "agencies", hash: SECTION.demo },
  ];

/** The three numbers we report per brand; texts in messages/Landing.metrics.tabs. */
export const METRICS: { key: "visibility" | "position" | "tone"; icon: LucideIcon }[] = [
  { key: "visibility", icon: Eye },
  { key: "position", icon: ListChecks },
  { key: "tone", icon: Smile },
];

/** How many questions and sources the feature cards show. */
export const FEATURE_PROMPTS = 3;
export const FEATURE_SOURCES = 4;

/** Key features, in the order of the bento grid (wide, narrow / narrow, wide / wide, narrow). */
export const KEY_FEATURES = ["prompts", "suggested", "brands", "engines", "sources", "facts"] as const;

export const REPORT_CHANNELS: { key: "pdf" | "telegram" | "link"; icon: LucideIcon }[] = [
  { key: "pdf", icon: FileText },
  { key: "telegram", icon: Send },
  { key: "link", icon: Link2 },
];

/** What only we do: the cards in place of customer quotes, which we don't have yet. */
export const LOCAL: { key: "languages" | "sources" | "facts" | "telegram" | "price" | "managed"; icon: LucideIcon }[] = [
  { key: "languages", icon: Languages },
  { key: "sources", icon: MapPinned },
  { key: "facts", icon: CircleAlert },
  { key: "telegram", icon: Send },
  { key: "price", icon: HandCoins },
  { key: "managed", icon: Wrench },
];

/** Monthly plans, in soums; the free check is the sales tool. Names and features in messages/Landing.pricing. */
export const PRICING: {
  key: PlanKey;
  price: number;
  /** Shown after the price; the free check has none. */
  period?: "month";
  recommended?: boolean;
  /** Landing section the button scrolls to. */
  target: SectionId;
}[] = [
  { key: "free", price: 0, target: SECTION.check },
  { key: "start", price: 199_000, period: "month", target: SECTION.demo },
  { key: "business", price: 490_000, period: "month", recommended: true, target: SECTION.demo },
  { key: "agency", price: 1_490_000, period: "month", target: SECTION.demo },
];

export type PlanKey = "free" | "start" | "business" | "agency";

/** "Managed GEO": the Business plan plus us applying the fixes; price per month from. */
export const MANAGED_PRICE_FROM = 3_000_000;

export const PRICING_FEATURES = ["f1", "f2", "f3", "f4"] as const;

/**
 * A cell of the plan comparison: yes/no, a number, "soon" (planned, not built yet),
 * or the key of a text in messages/Landing.pricing.compare.values.
 */
export type PlanCell = boolean | number | "soon" | { value: "chatgpt" | "once" | "weekly" | "uzRu" | "unlimited" | "top3" | "telegram" };

const text = (value: Extract<PlanCell, object>["value"]): PlanCell => ({ value });

/** Plan comparison table; one cell per plan in the order of PRICING. Labels in messages/Landing.pricing.compare. */
export const PLAN_TABLE: {
  group: "coverage" | "discover" | "measure" | "act" | "report";
  rows: {
    key:
      | "engines" | "prompts" | "frequency" | "answers" | "brands" | "competitors" | "languages" | "users"
      | "siteAnalysis" | "competitorSuggestions" | "promptSuggestions" | "ownPrompts"
      | "score" | "trend" | "allAnswers" | "sources" | "newCompetitors" | "wrongFacts"
      | "actions" | "audit"
      | "link" | "telegram" | "pdf" | "whiteLabel" | "support";
    cells: [PlanCell, PlanCell, PlanCell, PlanCell];
  }[];
}[] = [
  {
    group: "coverage",
    rows: [
      { key: "engines", cells: [text("chatgpt"), text("chatgpt"), text("chatgpt"), text("chatgpt")] },
      { key: "prompts", cells: [10, 25, 75, 300] },
      { key: "frequency", cells: [text("once"), text("weekly"), text("weekly"), text("weekly")] },
      // prompts × 3 samples × 4 weeks
      { key: "answers", cells: [30, 300, 900, 3600] },
      { key: "brands", cells: [1, 1, 1, 5] },
      { key: "competitors", cells: [3, 3, 5, 5] },
      { key: "languages", cells: [text("uzRu"), text("uzRu"), text("uzRu"), text("uzRu")] },
      { key: "users", cells: [false, text("unlimited"), text("unlimited"), text("unlimited")] },
    ],
  },
  {
    group: "discover",
    rows: [
      { key: "siteAnalysis", cells: [true, true, true, true] },
      { key: "competitorSuggestions", cells: [true, true, true, true] },
      { key: "promptSuggestions", cells: [true, true, true, true] },
      { key: "ownPrompts", cells: [false, true, true, true] },
    ],
  },
  {
    group: "measure",
    rows: [
      { key: "score", cells: [true, true, true, true] },
      { key: "trend", cells: [false, true, true, true] },
      { key: "allAnswers", cells: [false, true, true, true] },
      { key: "sources", cells: [text("top3"), true, true, true] },
      { key: "newCompetitors", cells: [false, true, true, true] },
      { key: "wrongFacts", cells: [false, false, true, true] },
    ],
  },
  {
    group: "act",
    rows: [
      { key: "actions", cells: [false, false, "soon", "soon"] },
      { key: "audit", cells: [false, false, "soon", "soon"] },
    ],
  },
  {
    group: "report",
    rows: [
      { key: "link", cells: [false, true, true, true] },
      { key: "telegram", cells: [false, true, true, true] },
      { key: "pdf", cells: [false, true, true, true] },
      { key: "whiteLabel", cells: [false, false, false, true] },
      { key: "support", cells: [false, text("telegram"), text("telegram"), text("telegram")] },
    ],
  },
];

export const FAQ = ["what", "seo", "notMentioned", "engines", "accuracy", "install", "time"] as const;

export const DEMO_SECTORS: DemoSector[] = ["clinic", "real_estate", "education", "retail", "other"];

/** Placeholder contacts: replace with the real ones before launch. */
export const CONTACT = { email: "hello@geo.uz", telegram: "@geo_uz" } as const;

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
