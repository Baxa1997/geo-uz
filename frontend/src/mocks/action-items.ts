// Recommended actions, made from a project's report with the rules the backend will use: sites to get
// listed on, wrong facts to correct, pages to write for questions where the brand is missing, and fixes
// for the problems the site check found on the brand's website.
import { ACTION_STEP_COUNT } from "@/shared/constants";
import { normalizeDomain } from "@/shared/helpers/domain";
import { answersNaming, promptsWithoutYou } from "@/shared/helpers/scores";
import type { Action, ActionImpact, ActionKind, ActionStatus, PromptResult, Report, SourceType } from "@/shared/types/api";
import { PROJECT } from "./data";
import { siteChecks } from "./site-checks";

/** What the client changed on an action. */
export interface ActionState {
  status: ActionStatus;
  doneAt: string | null;
  stepsDone: number[];
}

/** Kinds of sites a business can get onto; its own and its competitors' sites aren't. */
const LISTABLE: SourceType[] = ["directory", "news", "social", "other"];

const IMPACT_ORDER: ActionImpact[] = ["high", "medium", "low"];

/** Questions about what things cost. */
const PRICE_TOPICS = ["prices", "implants", "braces", "veneers", "whitening", "installment"];
const KIND_ORDER: ActionKind[] = ["fact", "listing", "content", "technical"];

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const weeksBefore = (iso: string, weeks: number) => new Date(Date.parse(iso) - weeks * WEEK_MS).toISOString();
const round = (value: number) => Math.round(value * 100) / 100;

/** A site cited by a tenth of the answers or more is worth the most. */
const listingImpact = (share: number): ActionImpact => (share >= 0.1 ? "high" : share >= 0.05 ? "medium" : "low");

const cites = (result: PromptResult, domain: string) =>
  result.answers.filter((answer) => answer.citations.some((citation) => citation.domain === domain)).length;

/** A listing action for one cited site: the questions it feeds and the competitors named alongside. */
function listing(report: Report, domain: string, sourceType: SourceType, answers: number, total: number) {
  const { brand, competitors } = report.project;
  const citing = report.prompts.filter((result) => cites(result, domain) > 0);
  // Questions where the brand is missing come first: those are the ones a listing can win
  const promptIds = [...citing]
    .sort(
      (a, b) =>
        Number(answersNaming(a, brand.id) > 0) - Number(answersNaming(b, brand.id) > 0) ||
        cites(b, domain) - cites(a, domain),
    )
    .map((result) => result.prompt.id);
  const named = new Map<string, number>();
  for (const answer of citing.flatMap((result) => result.answers)) {
    if (!answer.citations.some((citation) => citation.domain === domain)) continue;
    for (const mention of answer.mentions) {
      if (competitors.some((competitor) => competitor.id === mention.brandId)) {
        named.set(mention.brandId, (named.get(mention.brandId) ?? 0) + 1);
      }
    }
  }
  return {
    kind: "listing" as const,
    domain,
    sourceType,
    answers,
    competitorIds: [...named].sort((a, b) => b[1] - a[1]).map(([id]) => id),
    promptIds,
    impact: listingImpact(total ? answers / total : 0),
  };
}

const base = (report: Report) => ({
  status: "new" as const,
  createdAt: report.method.collectedAt,
  doneAt: null,
  stepsDone: [],
  proof: null,
});

/** What this week's report suggests. */
function suggested(report: Report): Action[] {
  const { brand, competitors } = report.project;
  const total = report.prompts.reduce((sum, result) => sum + result.answers.length, 0);
  const listings: Action[] = report.topSources
    .filter((source) => !source.brandListed && LISTABLE.includes(source.type))
    .map((source) => ({
      id: `act_listing_${source.domain}`,
      ...base(report),
      ...listing(report, source.domain, source.type, source.count, total),
    }));
  const facts: Action[] = report.wrongFacts.map((fact, index) => ({
    id: `act_fact_${fact.promptId}_${index}`,
    ...base(report),
    kind: "fact",
    claim: fact.claim,
    correct: fact.correct,
    promptIds: [fact.promptId],
    // A wrong price or opening hour costs customers directly
    impact: "high",
  }));
  const missing = promptsWithoutYou(
    report.prompts,
    brand.id,
    competitors.map((competitor) => competitor.id),
  );
  const topics = [...new Set(missing.map((result) => result.prompt.topic))];
  const pages: Action[] = topics.map((topic) => {
    const promptIds = missing.filter((result) => result.prompt.topic === topic).map((result) => result.prompt.id);
    return {
      id: `act_content_${topic}`,
      ...base(report),
      kind: "content",
      topic,
      promptIds,
      impact: promptIds.length > 1 ? "high" : "medium",
    };
  });
  const technical: Action[] = siteChecks(normalizeDomain(brand.domain))
    .filter((result) => !result.passed)
    .map(({ check }) => ({
      id: `act_technical_${check}`,
      ...base(report),
      kind: "technical",
      check,
      // Prices as pictures cost the price questions; the other fixes help every question
      promptIds: report.prompts
        .filter((result) => check !== "prices_as_images" || PRICE_TOPICS.includes(result.prompt.topic))
        .map((result) => result.prompt.id)
        .slice(0, 5),
      impact: check === "prices_as_images" || check === "ai_bots_blocked" ? "high" : "medium",
    }));
  return [...facts, ...listings, ...pages, ...technical];
}

/** The brand's visibility (0–1) over the answers to some questions. */
function visibilityOn(report: Report, promptIds: string[]) {
  const results = report.prompts.filter((result) => promptIds.includes(result.prompt.id));
  const answers = results.reduce((sum, result) => sum + result.answers.length, 0);
  const named = results.reduce((sum, result) => sum + answersNaming(result, report.project.brand.id), 0);
  return answers ? named / answers : 0;
}

/**
 * The sample project's past: an Instagram page made three weeks ago, with what it changed on its
 * questions since, and one listing in progress with its first step done.
 */
const SAMPLE_STATES: Record<string, Pick<ActionState, "status" | "stepsDone">> = {
  "act_listing_topclinics.uz": { status: "in_progress", stepsDone: [0] },
};

function sampleHistory(report: Report): Action[] {
  const source = report.topSources.find((candidate) => candidate.domain === "instagram.com");
  if (!source) return [];
  const total = report.prompts.reduce((sum, result) => sum + result.answers.length, 0);
  const done = listing(report, source.domain, source.type, source.count, total);
  const after = visibilityOn(report, done.promptIds);
  return [
    {
      id: "act_listing_instagram.com",
      ...done,
      status: "done",
      createdAt: weeksBefore(report.method.collectedAt, 5),
      doneAt: weeksBefore(report.method.collectedAt, 3),
      stepsDone: Array.from({ length: ACTION_STEP_COUNT }, (_, index) => index),
      proof: { before: round(Math.max(0, after - 0.17)), after: round(after), runs: 3 },
    },
  ];
}

const byPriority = (a: Action, b: Action) =>
  IMPACT_ORDER.indexOf(a.impact) - IMPACT_ORDER.indexOf(b.impact) ||
  KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind) ||
  (b.kind === "listing" ? b.answers : 0) - (a.kind === "listing" ? a.answers : 0);

/** The project's actions with the client's changes applied, most important first. None before the first run. */
export function buildActions(report: Report, changed: ReadonlyMap<string, ActionState> = new Map()): Action[] {
  if (report.prompts.length === 0) return [];
  const sample = report.project.id === PROJECT.id;
  const history = sample ? sampleHistory(report) : [];
  const actions = [...history, ...suggested(report).filter((action) => !history.some((past) => past.id === action.id))];
  return actions
    .map((action): Action => {
      const initial = sample ? SAMPLE_STATES[action.id] : undefined;
      const change = changed.get(action.id);
      if (!change) return initial ? { ...action, ...initial } : action;
      // The proof belongs to the time it was done: marking it done again starts over
      const sameDone = change.status === "done" && change.doneAt === action.doneAt;
      return {
        ...action,
        status: change.status,
        doneAt: change.doneAt,
        stepsDone: change.stepsDone,
        proof: sameDone ? action.proof : null,
      };
    })
    .sort(byPriority);
}
