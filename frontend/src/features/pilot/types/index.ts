/**
 * A pilot report: one measurement of how ChatGPT answers a category's questions, written up for one
 * business. The file is made by `backend/pilot` (see its README) and may be edited by hand before it is
 * sent: every sentence in it is in the report's own language.
 */

export type PilotLanguage = "uz" | "ru" | "en";
export type Level = "high" | "medium" | "low";
export type FactStatus = "found" | "partial" | "missing";
export type PlanKind = "site" | "external" | "measure";
/** `competitor`: the own website of a business the answers name; the client can't be listed there. */
export type SourceKind = "media" | "catalog" | "competitor" | "own" | "social" | "other";
export type TargetTone = "bad" | "warn" | "ok";

/** A short point: its first words in bold, then the rest. */
export interface PilotPoint {
  lead: string;
  text: string;
}

/** A section's heading, written as its finding, with an optional conclusion beside it. */
export interface PilotSectionText {
  title: string;
  note: string | null;
}

/** A fact ChatGPT states about the businesses of this category: programme, price, district. */
export interface PilotAttribute {
  key: string;
  label: string;
}

export interface PilotQuestion {
  text: string;
  language: "uz" | "ru";
  /** Answers collected for it (the samples). */
  answers: number;
  /** Answers naming the client, and answers recommending it. */
  named: number;
  recommended: number;
  /** Different businesses over its answers: recommended in at least one, and named in all. */
  brandsRecommended: number;
  brandsNamed: number;
  recommendedNames: string[];
}

export interface PilotBrand {
  name: string;
  isClient: boolean;
  /** Answers naming it, and answers recommending it, out of `method.answers`. */
  named: number;
  recommended: number;
  /** By `PilotAttribute.key`; null when ChatGPT says nothing. */
  attributes: Record<string, string | null>;
  /** How ChatGPT describes it, in a line. */
  description: string | null;
  /** A business with a profile close to the client's. */
  peer: boolean;
  /** Where it is, for the peers' table. */
  place: string | null;
}

/** A price as ChatGPT names it, for the peers' chart. `high` null: "from …". Both null: not published. */
export interface PilotRange {
  name: string;
  low: number | null;
  high: number | null;
  label: string;
}

export interface PilotSource {
  name: string;
  url: string | null;
  title: string | null;
  kind: SourceKind;
  /** Answers citing it. */
  answers: number;
  /** Whether the client is on it; null when it wasn't checked or couldn't be read. */
  brandListed: boolean | null;
}

export interface PilotReason {
  reason: string;
  confidence: Level;
  evidence: string;
}

export interface PilotFact {
  fact: string;
  /** How ChatGPT words this fact about other businesses. */
  example: string | null;
  found: string;
  status: FactStatus;
}

export interface PilotDecision {
  question: string;
  recommendation: string;
  why: string;
  options: string[];
  risk: string;
  when: string;
  effect: Level;
  cost: Level;
}

export interface PilotTask {
  task: string;
  done: string;
  owner: string;
  /** Weeks, from 1, both ends included. */
  from: number;
  to: number;
  kind: PlanKind;
}

export interface PilotTarget {
  metric: string;
  now: string;
  tone: TargetTone;
  goal: string;
}

export interface PilotLimit {
  limit: string;
  text: string;
  action: string;
}

/** A count out of the answers (or sources, or facts) it was taken from: "3 of 15". */
export interface PilotCount {
  n: number;
  of: number;
}

export interface PilotShift {
  before: PilotCount;
  after: PilotCount;
}

/**
 * What changed since the measurement before, for a client's second report and every one after it. The
 * counts are compared by `backend/pilot` (`steps.compare`); the sentences and whether a goal was met are
 * drafted with the analysis.
 */
export interface PilotComparison {
  /** The earlier report: its address and the ISO date of its measurement. */
  slug: string;
  collectedAt: string;
  title: string;
  note: string | null;
  callout: PilotPoint | null;
  named: PilotShift;
  recommended: PilotShift;
  /** The sites ChatGPT cites that include the client, of those that could be read; null when either report read none. */
  listed: PilotShift | null;
  /** The facts found in full, of the facts checked. */
  facts: PilotShift | null;
  /** The goals the earlier report set, and where each stands now. `met` null: not measured this time. */
  targets: { metric: string; goal: string; was: string; now: string; met: boolean | null }[];
  /** The client, then the businesses that moved most. `before` null: new in the answers; `after` null: gone. */
  brands: { name: string; isClient: boolean; before: { named: number; recommended: number } | null; after: { named: number; recommended: number } | null }[];
  factChanges: { fact: string; before: FactStatus | null; after: FactStatus }[];
  sourceChanges: { name: string; before: boolean | null; after: boolean | null }[];
}

export interface Pilot {
  slug: string;
  language: PilotLanguage;
  brand: { name: string; aliases: string[]; domain: string | null; city: string };
  /** The category's word in the report's language: "школа", "школу", "школ". */
  terms: { one: string; acc: string; genPlural: string };
  preparedFor: string;
  method: {
    engine: string;
    model: string | null;
    webSearch: boolean;
    /** ISO date of the measurement. */
    collectedAt: string;
    questions: number;
    samples: number;
    answers: number;
    languages: ("uz" | "ru")[];
  };
  attributes: PilotAttribute[];
  totals: {
    named: number;
    recommended: number;
    /** Other businesses named, and how many of them were recommended. */
    othersNamed: number;
    othersRecommended: number;
  };
  summary: {
    /** Under the cover's title: what the report answers, in a sentence. */
    coverLead: string;
    headline: string;
    /** Under the client's name: what ChatGPT says about it, or that it says nothing. */
    brandLead: string;
    brandNote: string;
    /** How ChatGPT describes the leader, in its words. */
    leaderQuote: string | null;
    profilesNote: string;
    flags: PilotPoint[];
    strengths: PilotPoint[];
    firstSteps: PilotPoint[];
  };
  sections: Record<"questions" | "leaders" | "peers" | "reasons" | "facts" | "decisions" | "plan" | "targets" | "limits", PilotSectionText>;
  questions: PilotQuestion[];
  /** A sentence of an answer worth showing, shortened. */
  quote: { text: string; source: string } | null;
  /** Every business the answers name, the most recommended first; the client among them. */
  brands: PilotBrand[];
  leadersNote: PilotPoint | null;
  peers: { profile: string; unit: string | null; ranges: PilotRange[] };
  reasons: PilotReason[];
  sources: PilotSource[];
  sourcesNote: PilotPoint | null;
  sourcesFootnote: string | null;
  facts: PilotFact[];
  factsNote: PilotPoint | null;
  factsFootnote: string | null;
  decisions: PilotDecision[];
  plan: { weeks: number; tasks: PilotTask[] };
  targets: PilotTarget[];
  limits: PilotLimit[];
  checks: PilotPoint[];
  contact: { phone: string | null; telegram: string | null; email: string | null };
  /** Set from a client's second report on: what changed since the one before. */
  previous?: PilotComparison | null;
}
