import { BuildingsIcon as Building2 } from "@phosphor-icons/react/dist/ssr/Buildings";
import { ChatCircleTextIcon as ChatCircleText } from "@phosphor-icons/react/dist/ssr/ChatCircleText";
import { CreditCardIcon as CreditCard } from "@phosphor-icons/react/dist/ssr/CreditCard";
import { SealCheckIcon as FileCheck2 } from "@phosphor-icons/react/dist/ssr/SealCheck";
import { SlidersHorizontalIcon as SlidersHorizontal } from "@phosphor-icons/react/dist/ssr/SlidersHorizontal";
import { TagIcon as Tag } from "@phosphor-icons/react/dist/ssr/Tag";
import { UserIcon as UserRound } from "@phosphor-icons/react/dist/ssr/User";
import { UsersThreeIcon as UsersRound } from "@phosphor-icons/react/dist/ssr/UsersThree";
import { IconActions, IconAnswers, IconCompetitors, IconOverview, IconQuestions, IconReports, IconSettings, IconSources, IconWrongFacts } from "@/shared/components/own-icons";
import type { AppIcon } from "@/shared/types/icon";

/** Cookie that remembers a collapsed sidebar, so the server renders it that way too. */
export const SIDEBAR_COOKIE = "geo_sidebar";

/** A project page in the sidebar; `key` is its label in messages/Sidebar, `path` follows /projects/[id]. */
export interface NavItem {
  key: "overview" | "prompts" | "answers" | "competitors" | "sources" | "wrongFacts" | "actions" | "reports" | "settings";
  path: string;
  icon: AppIcon;
}

/**
 * A project's pages, by task rather than by engine (pages switch engines at their top), in sections that
 * follow the work: the overview, what ChatGPT says, what to improve, what to share. Section headings in
 * messages/Sidebar.groups; the first section has none.
 */
export const NAV_GROUPS: { key: "home" | "monitor" | "improve" | "share"; items: NavItem[] }[] = [
  { key: "home", items: [{ key: "overview", path: "", icon: IconOverview }] },
  {
    key: "monitor",
    items: [
      { key: "prompts", path: "/prompts", icon: IconQuestions },
      { key: "answers", path: "/answers", icon: IconAnswers },
      { key: "competitors", path: "/competitors", icon: IconCompetitors },
      { key: "sources", path: "/sources", icon: IconSources },
    ],
  },
  {
    key: "improve",
    items: [
      { key: "wrongFacts", path: "/wrong-facts", icon: IconWrongFacts },
      { key: "actions", path: "/actions", icon: IconActions },
    ],
  },
  { key: "share", items: [{ key: "reports", path: "/reports", icon: IconReports }] },
];

/** At the bottom of the sidebar, above help and the account. */
export const SETTINGS: NavItem = { key: "settings", path: "/settings", icon: IconSettings };

/**
 * The settings' own menu, which takes the sidebar's place on a settings page, as Peec's does: the
 * project's settings, then the account's. `path` follows /projects/[id]; labels in messages/Sidebar.settingsNav.
 */
export const SETTINGS_GROUPS: { key: "project" | "account"; items: { key: "profile" | "facts" | "brandQuestions" | "brands" | "tags" | "account" | "members" | "plan"; path: string; icon: AppIcon }[] }[] = [
  {
    key: "project",
    items: [
      { key: "profile", path: "/settings", icon: UserRound },
      { key: "facts", path: "/settings/facts", icon: FileCheck2 },
      { key: "brandQuestions", path: "/settings/brand-questions", icon: ChatCircleText },
      { key: "brands", path: "/settings/brands", icon: Building2 },
      { key: "tags", path: "/settings/tags", icon: Tag },
    ],
  },
  {
    key: "account",
    items: [
      { key: "account", path: "/settings/account", icon: SlidersHorizontal },
      { key: "members", path: "/settings/members", icon: UsersRound },
      { key: "plan", path: "/settings/plan", icon: CreditCard },
    ],
  },
];

/**
 * The "Start here" checklist at the foot of the sidebar: the pages that give a new client their first
 * result. A step is done once its page has been opened (the first one, when the project exists).
 * Texts in messages/Sidebar.start.steps.
 */
export const START_STEPS = [
  { key: "project", path: null },
  { key: "overview", path: "" },
  { key: "answers", path: "/answers" },
  { key: "sources", path: "/sources" },
  { key: "actions", path: "/actions" },
] as const;

export type StartStep = (typeof START_STEPS)[number]["key"];

/** Example questions in the GEO AI panel and the help sheet; texts in messages. */
export const ASSISTANT_SUGGESTIONS = ["s1", "s2", "s3", "s4", "s5"] as const;
export const SUPPORT_EXAMPLES = ["e1", "e2", "e3"] as const;
