import {
  CircleAlert,
  FileText,
  Globe,
  LayoutDashboard,
  ListChecks,
  MessageCircleQuestion,
  MessagesSquare,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";

/** Cookie that remembers a collapsed sidebar, so the server renders it that way too. */
export const SIDEBAR_COOKIE = "geo_sidebar";

/** A project page in the sidebar; `key` is its label in messages/Sidebar, `path` follows /projects/[id]. */
export interface NavItem {
  key: "overview" | "prompts" | "answers" | "competitors" | "sources" | "wrongFacts" | "actions" | "reports" | "settings";
  path: string;
  icon: LucideIcon;
}

/**
 * A project's pages, by task rather than by engine (pages switch engines at their top), in sections that
 * follow the work: the overview, what ChatGPT says, what to improve, what to share. Section headings in
 * messages/Sidebar.groups; the first section has none.
 */
export const NAV_GROUPS: { key: "home" | "monitor" | "improve" | "share"; items: NavItem[] }[] = [
  { key: "home", items: [{ key: "overview", path: "", icon: LayoutDashboard }] },
  {
    key: "monitor",
    items: [
      { key: "prompts", path: "/prompts", icon: MessageCircleQuestion },
      { key: "answers", path: "/answers", icon: MessagesSquare },
      { key: "competitors", path: "/competitors", icon: Users },
      { key: "sources", path: "/sources", icon: Globe },
    ],
  },
  {
    key: "improve",
    items: [
      { key: "wrongFacts", path: "/wrong-facts", icon: CircleAlert },
      { key: "actions", path: "/actions", icon: ListChecks },
    ],
  },
  { key: "share", items: [{ key: "reports", path: "/reports", icon: FileText }] },
];

/** At the bottom of the sidebar, above help and the account. */
export const SETTINGS: NavItem = { key: "settings", path: "/settings", icon: Settings };

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
