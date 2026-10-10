// In-memory mock of the backend. Runs on the Next.js server only (browser code
// reaches it through ./actions.ts). Changes last until the dev server restarts.
import { randomUUID } from "node:crypto";
import { ApiError, type ApiClient } from "@/shared/api/client";
import { ACTION_STEP_COUNT, FACT_MAX_LENGTH, PLAN_LIMITS, PROMPT_TEXT_MAX_LENGTH, PROMPT_TEXT_MIN_LENGTH } from "@/shared/constants";
import { isValidDomain, normalizeDomain } from "@/shared/helpers/domain";
import { isTracked, sameText } from "@/shared/helpers/prompts";
import type {
  Action,
  Brand,
  DemoRequest,
  Member,
  Plan,
  Project,
  Prompt,
  ReportSettings,
  RunProgress,
  RunStatus,
  Snapshot,
  SuggestedPrompt,
  SuggestionSource,
  SupportMessage,
  TagSummary,
  User,
} from "@/shared/types/api";
import { buildActions, pageAction, type ActionState } from "./action-items";
import { DEMO_USER } from "./accounts";
import { ARCHIVED_PROMPT, BRAND_FACTS, BRANDS, DEFAULT_PLAN, OTHER_CLINICS, PROJECT, PROMPTS, SAMPLE_MEMBER, SITE_FACTS, SUGGESTED_PROMPTS } from "./data";
import * as onboarding from "./onboarding";
import { discoveryDrafts, keywordDrafts, KNOWN_TOPICS, poolFor, type Draft } from "./suggestions";
import { buildPromptReport, buildReport, buildSnapshot, firstRun, METHOD, NO_RUN, pastReport, SEEDED_RUN, type MockRun } from "./report";
import { clearSessionToken, readSessionToken, writeSessionToken } from "./session";

const LATENCY_MS = 300;
const RESEND_SECONDS = 60;
const UZ_PHONE = /^\+998\d{9}$/;

// A run waits in the queue, collects ChatGPT's answers one by one, then analyzes them
const RUN_QUEUED_MS = 1500;
const RUN_MS_PER_ANSWER = 120;
const RUN_ANALYZING_MS = 2000;

interface MockAccount {
  user: User;
  telegramId?: number;
}

interface StoredRun {
  id: string;
  projectId: string;
  run: MockRun;
  /** Epoch ms; progress follows from the time since. */
  startedAt: number;
}

interface MockState {
  accounts: MockAccount[];
  /** Session token → user id. */
  sessions: Map<string, string>;
  projects: Project[];
  /** Project id → owner's user id. */
  owners: Map<string, string>;
  prompts: Map<string, Prompt[]>;
  /** Project id → its latest run. */
  runs: Map<string, StoredRun>;
  snapshots: Map<string, Snapshot>;
  /** Project id → action id → what the client changed on it. */
  actionStates: Map<string, Map<string, ActionState>>;
  /** Project id → the actions the client made with "Add content". */
  addedActions: Map<string, Action[]>;
  /** Project id → its topics in order, once the client added, renamed or deleted one (else they come from its questions). */
  topics: Map<string, string[]>;
  /** Project id → the suggested questions waiting for the client, newest first. */
  suggestions: Map<string, SuggestedPrompt[]>;
  /** Project id → the suggestions the client rejected (as `sameText`), never suggested again. */
  rejectedSuggestions: Map<string, Set<string>>;
  /** Project id → names of the untracked brands the client hid from the suggestions. */
  dismissedBrands: Map<string, Set<string>>;
  /** Project id → where its weekly report goes, once the client changed it. */
  reportSettings: Map<string, ReportSettings>;
  /** Project id → its brand facts, once the client saved them. */
  facts: Map<string, string[]>;
  /** Project id → tags made in Sozlamalar that no question carries yet. */
  tags: Map<string, string[]>;
  /** Owner's user id → the members they invited, once the list changed. */
  members: Map<string, Member[]>;
  /** Plan changes asked for: billing doesn't exist, so they reach us. */
  planRequests: { projectId: string; plan: Plan | "managed" | "cancel"; cycle: "month" | "year"; userId: string; at: string }[];
  demoRequests: DemoRequest[];
  supportMessages: (SupportMessage & { userId: string })[];
  nextId: number;
}

// Kept on globalThis so hot reloads and separate route bundles share one copy.
// Bump the version when MockState changes: a hot reload then starts fresh instead of reading old data.
const STATE_KEY = "__geoMockState_v21";
const globalForMocks = globalThis as typeof globalThis & { [STATE_KEY]?: MockState };
const state: MockState = (globalForMocks[STATE_KEY] ??= {
  accounts: [{ user: DEMO_USER }],
  sessions: new Map(),
  projects: [PROJECT],
  owners: new Map([[PROJECT.id, DEMO_USER.id]]),
  prompts: new Map([[PROJECT.id, [...PROMPTS, ARCHIVED_PROMPT]]]),
  runs: new Map([[PROJECT.id, { id: "run_seeded", projectId: PROJECT.id, run: SEEDED_RUN, startedAt: 0 }]]),
  snapshots: new Map(),
  actionStates: new Map(),
  addedActions: new Map(),
  topics: new Map(),
  suggestions: new Map(),
  rejectedSuggestions: new Map(),
  dismissedBrands: new Map(),
  reportSettings: new Map(),
  facts: new Map(),
  tags: new Map(),
  members: new Map(),
  planRequests: [],
  demoRequests: [],
  supportMessages: [],
  nextId: 1,
});

const newId = (prefix: string) => `${prefix}_mock${state.nextId++}`;

/** Simulates network latency and JSON serialization, so callers never share mock state. */
async function respond<T>(value: T, latency = LATENCY_MS): Promise<T> {
  await new Promise((resolve) => setTimeout(resolve, latency));
  return structuredClone(value);
}

async function currentUser(): Promise<User> {
  const token = await readSessionToken();
  const userId = token ? state.sessions.get(token) : undefined;
  const account = state.accounts.find((a) => a.user.id === userId);
  if (!account) throw new ApiError(401, "Not logged in");
  return account.user;
}

/** Logs in the matching account, creating it on first login. */
async function logIn(match: (account: MockAccount) => boolean, create: () => MockAccount) {
  let account = state.accounts.find(match);
  if (!account) {
    account = create();
    state.accounts.push(account);
  }
  const token = randomUUID();
  state.sessions.set(token, account.user.id);
  await writeSessionToken(token);
  return respond(account.user);
}

function findProject(id: string): Project {
  const project = state.projects.find((p) => p.id === id);
  if (!project) throw new ApiError(404, `Project ${id} not found`);
  return project;
}

// Reads by id don't check the owner: the client report is opened from a shared link
async function findOwnProject(id: string): Promise<Project> {
  const user = await currentUser();
  const project = findProject(id);
  if (state.owners.get(id) !== user.id) throw new ApiError(404, `Project ${id} not found`);
  return project;
}

/** A changed project replaces the stored one: the seeded project object is also the landing page's sample. */
function replaceProject(project: Project) {
  state.projects = state.projects.map((candidate) => (candidate.id === project.id ? project : candidate));
}

/** What the backend knows of a brand from the answers that name it: its spellings and its website. */
const knownBrand = (name: string) =>
  [...Object.values(BRANDS), ...Object.values(OTHER_CLINICS)].find((clinic) => clinic.name.toLowerCase() === name.toLowerCase());

/** Every question of the project, archived ones too. */
const promptsOf = (projectId: string) => state.prompts.get(projectId) ?? [];

/** The questions the weekly check asks: what the report, the actions and the plan's limit count. */
const trackedOf = (projectId: string) => promptsOf(projectId).filter(isTracked);

/** `count` more tracked questions must fit the plan. */
function assertRoom(project: Project, count = 1) {
  if (trackedOf(project.id).length + count > project.limits.prompts) {
    throw new ApiError(409, `The plan allows ${project.limits.prompts} tracked questions`);
  }
}

/**
 * The project's topics in their order: the list as first read from its questions (kept, so moving a
 * question doesn't reorder it), the client's own topics after it, then any a new question brings.
 */
function topicsOf(projectId: string): string[] {
  let kept = state.topics.get(projectId);
  if (!kept) {
    kept = [...new Set(trackedOf(projectId).map((prompt) => prompt.topic))];
    state.topics.set(projectId, kept);
  }
  return [...new Set([...kept, ...trackedOf(projectId).map((prompt) => prompt.topic)])];
}

/** A topic's name as the client typed it, without stray spaces. */
const cleanName = (name: string) => name.trim().replace(/\s+/g, " ");

/** Topics the sample's first suggestions came from ChatGPT's own web searches for. */
const FROM_SEARCHES = new Set(["emergency", "location", "painless"]);
const DAY_MS = 86_400_000;

/** A new question: asked from the project's city unless it says another, its answers fact-checked, no tags. */
const newPrompt = (body: Pick<Prompt, "text" | "language" | "topic"> & { location?: string }, city: string): Prompt => ({
  id: newId("prm"),
  text: body.text,
  language: body.language,
  topic: body.topic,
  createdAt: new Date().toISOString(),
  archivedAt: null,
  location: body.location ?? city,
  factCheck: true,
  tags: [],
});

/** A tag as the client typed it, without stray spaces; the same tag twice is kept once. */
const cleanTags = (tags: string[]) => [...new Map(tags.map((tag) => cleanName(tag)).filter(Boolean).map((tag) => [tag.toLowerCase(), tag])).values()];

/** The suggestions waiting for the client, newest first; a project's first ones are the sample's (data.ts). */
function suggestionsOf(projectId: string): SuggestedPrompt[] {
  let list = state.suggestions.get(projectId);
  if (!list) {
    list = SUGGESTED_PROMPTS.map((prompt, index) => ({
      id: newId("sug"),
      ...prompt,
      source: FROM_SEARCHES.has(prompt.topic) ? "searches" : "profile",
      createdAt: new Date(Date.now() - ((index % 4) + 1) * DAY_MS).toISOString(),
    }));
    state.suggestions.set(projectId, list);
  }
  // A question the client added by hand meanwhile isn't suggested any more
  const asked = new Set(promptsOf(projectId).map((prompt) => sameText(prompt.text)));
  return list.filter((suggestion) => !asked.has(sameText(suggestion.text)));
}

/**
 * Turns drafts into new suggestions, at most `max`: none the project asks or archived, none waiting
 * already, none the client rejected. The new ones go first.
 */
function addSuggestions(projectId: string, drafts: Draft[], source: SuggestionSource, max: number): SuggestedPrompt[] {
  const waiting = suggestionsOf(projectId);
  const seen = new Set([
    ...promptsOf(projectId).map((prompt) => sameText(prompt.text)),
    ...waiting.map((suggestion) => sameText(suggestion.text)),
    ...(state.rejectedSuggestions.get(projectId) ?? []),
  ]);
  const created: SuggestedPrompt[] = [];
  for (const draft of drafts) {
    const key = sameText(draft.text);
    if (created.length >= max || seen.has(key)) continue;
    seen.add(key);
    created.push({ id: newId("sug"), ...draft, source, createdAt: new Date().toISOString() });
  }
  state.suggestions.set(projectId, [...created, ...waiting]);
  return created;
}

/** The suggestions with these ids; 404 when one isn't waiting any more. */
function pickSuggestions(projectId: string, ids: string[]): SuggestedPrompt[] {
  const waiting = suggestionsOf(projectId);
  return [...new Set(ids)].map((suggestionId) => {
    const suggestion = waiting.find((candidate) => candidate.id === suggestionId);
    if (!suggestion) throw new ApiError(404, `Suggestion ${suggestionId} not found`);
    return suggestion;
  });
}

/** Drops decided suggestions from the waiting list. */
function dropSuggestions(projectId: string, ids: string[]) {
  state.suggestions.set(projectId, suggestionsOf(projectId).filter((suggestion) => !ids.includes(suggestion.id)));
}

function findPrompt(projectId: string, promptId: string): Prompt {
  const prompt = promptsOf(projectId).find((candidate) => candidate.id === promptId);
  if (!prompt) throw new ApiError(404, `Prompt ${promptId} not found`);
  return prompt;
}

function replacePrompt(projectId: string, prompt: Prompt) {
  state.prompts.set(
    projectId,
    promptsOf(projectId).map((candidate) => (candidate.id === prompt.id ? prompt : candidate)),
  );
}

/** The project's brand facts: the sample clinic starts with the ones it wrote. */
const factsOf = (projectId: string) => state.facts.get(projectId) ?? (projectId === PROJECT.id ? BRAND_FACTS : []);

/** The same name, whatever its letters' case. */
const sameName = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

/** The project's tags, made ones and the questions' (archived ones too), each with its tracked questions. */
function tagsOf(projectId: string): TagSummary[] {
  const names: string[] = [];
  for (const tag of [...(state.tags.get(projectId) ?? []), ...promptsOf(projectId).flatMap((prompt) => prompt.tags)]) {
    if (!names.some((name) => sameName(name, tag))) names.push(tag);
  }
  const tracked = trackedOf(projectId);
  return names
    .map((name) => ({ name, prompts: tracked.filter((prompt) => prompt.tags.some((tag) => sameName(tag, name))).length }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Changes a tag on every question of the project: renames it, or takes it off (`to` null). */
function retag(projectId: string, from: string, to: string | null) {
  state.prompts.set(
    projectId,
    promptsOf(projectId).map((prompt) =>
      prompt.tags.some((tag) => sameName(tag, from))
        ? { ...prompt, tags: cleanTags(prompt.tags.flatMap((tag) => (sameName(tag, from) ? (to === null ? [] : [to]) : [tag]))) }
        : prompt,
    ),
  );
}

/** The account's owner as a member, from the user, with every project they own. */
const ownerMember = (user: User): Member => ({
  id: `mbr_${user.id}`,
  name: user.name,
  phone: user.phone,
  telegramUsername: user.telegramUsername,
  role: "owner",
  status: "active",
  projectIds: state.projects.filter((project) => state.owners.get(project.id) === user.id).map((project) => project.id),
});

/** The members an owner invited: the sample account starts with its marketer. */
const invitedOf = (user: User) => state.members.get(user.id) ?? (user.id === DEMO_USER.id ? [SAMPLE_MEMBER] : []);

const runDuration = (answers: number) => RUN_QUEUED_MS + answers * RUN_MS_PER_ANSWER + RUN_ANALYZING_MS;

function progressOf({ id, projectId, run, startedAt }: StoredRun): RunProgress {
  const total = run.answeredWith.size * METHOD.samples;
  const answering = Date.now() - startedAt - RUN_QUEUED_MS;
  const answered = Math.min(total, Math.max(0, Math.floor(answering / RUN_MS_PER_ANSWER)));
  const status: RunStatus =
    answering < 0
      ? "queued"
      : answered < total
        ? "running"
        : Date.now() - startedAt < runDuration(total)
          ? "analyzing"
          : "done";
  return { id, projectId, status, answered, total };
}

/** Weekly runs start on Monday at 06:00 in Tashkent (01:00 UTC). */
const WEEKLY_RUN = { day: 1, hourUtc: 1 };

/** The first weekly run after `now`. */
function nextWeeklyRun(now: number): string {
  const date = new Date(now);
  date.setUTCHours(WEEKLY_RUN.hourUtc, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + ((WEEKLY_RUN.day - date.getUTCDay() + 7) % 7));
  if (date.getTime() <= now) date.setUTCDate(date.getUTCDate() + 7);
  return date.toISOString();
}

/** The project's latest run once it is done; until then the report has no results. */
function finishedRun(projectId: string): MockRun {
  const stored = state.runs.get(projectId);
  return stored && progressOf(stored).status === "done" ? stored.run : NO_RUN;
}

export const mockApi: ApiClient = {
  sendCode: async ({ phone }) => {
    if (!UZ_PHONE.test(phone)) throw new ApiError(422, `Invalid phone number ${phone}`);
    return respond({ resendIn: RESEND_SECONDS });
  },

  // Any 6-digit code works
  verifyCode: async ({ phone, code }) => {
    if (!/^\d{6}$/.test(code)) throw new ApiError(400, "Wrong code");
    return logIn(
      (account) => account.user.phone === phone,
      () => ({ user: { id: newId("usr"), name: null, phone, telegramUsername: null } }),
    );
  },

  loginWithTelegram: async (auth) =>
    logIn(
      (account) => account.telegramId === auth.id,
      () => ({
        telegramId: auth.id,
        user: {
          id: newId("usr"),
          name: [auth.first_name, auth.last_name].filter(Boolean).join(" "),
          phone: null,
          telegramUsername: auth.username ?? null,
        },
      }),
    ),

  getMe: async () => respond(await currentUser()),

  logout: async () => {
    const token = await readSessionToken();
    if (token) state.sessions.delete(token);
    await clearSessionToken();
    return respond(undefined);
  },

  getProjects: async () => {
    const user = await currentUser();
    return respond(state.projects.filter((p) => state.owners.get(p.id) === user.id));
  },

  createProject: async ({ name, aliases, domain, category, city, competitors, prompts = [], description = "", services = [] }) => {
    const user = await currentUser();
    const project: Project = {
      id: newId("prj"),
      brand: { id: newId("brd"), name, aliases, domain },
      competitors: competitors.map((c) => ({ ...c, id: newId("brd") })),
      category,
      city,
      languages: ["uz", "ru"],
      description: description.trim(),
      services,
      customers: [],
      identity: [],
      plan: DEFAULT_PLAN,
      limits: PLAN_LIMITS[DEFAULT_PLAN],
      // A month from today; billing doesn't exist, so nothing is charged
      billing: { cycle: "month", renewsAt: new Date(Date.now() + 30 * DAY_MS).toISOString() },
    };
    state.projects.push(project);
    state.owners.set(project.id, user.id);
    const created = prompts.map((prompt) => newPrompt(prompt, city));
    state.prompts.set(project.id, created);
    if (created.length === 0) return respond({ project, runId: null });
    // The first run starts right away and takes a few seconds
    const startedAt = Date.now();
    const finishedAt = new Date(startedAt + runDuration(created.length * METHOD.samples)).toISOString();
    const run: StoredRun = { id: newId("run"), projectId: project.id, run: firstRun(created, finishedAt), startedAt };
    state.runs.set(project.id, run);
    return respond({ project, runId: run.id });
  },

  getProject: async (id) => respond(findProject(id)),

  // The report is made from the answers it already has, so a new competitor's numbers appear at once
  addCompetitor: async (projectId, { name, aliases, domain }) => {
    const project = await findOwnProject(projectId);
    const known = knownBrand(name.trim());
    const competitor: Brand = {
      id: newId("brd"),
      name: known?.name ?? name.trim(),
      aliases: aliases ?? known?.aliases ?? [],
      domain: domain ? normalizeDomain(domain) : (known?.domain ?? ""),
      // The backend finds the logo on the website; the mock knows the sample clinics'
      logo: known?.logo ?? null,
    };
    if (!competitor.name) throw new ApiError(422, "A brand needs a name");
    if ([project.brand, ...project.competitors].some((brand) => brand.name.toLowerCase() === competitor.name.toLowerCase())) {
      throw new ApiError(409, `${competitor.name} is already tracked`);
    }
    if (project.competitors.length >= project.limits.competitors) {
      throw new ApiError(409, `The plan allows ${project.limits.competitors} competitors`);
    }
    const updated: Project = { ...project, competitors: [...project.competitors, competitor] };
    replaceProject(updated);
    state.dismissedBrands.get(projectId)?.delete(competitor.name);
    return respond(updated);
  },

  // Its mentions stay in the answers: it goes back to the untracked brands and can be tracked again
  removeCompetitor: async (projectId, brandId) => {
    const project = await findOwnProject(projectId);
    if (!project.competitors.some((competitor) => competitor.id === brandId)) {
      throw new ApiError(404, `Competitor ${brandId} not found`);
    }
    const updated: Project = { ...project, competitors: project.competitors.filter((competitor) => competitor.id !== brandId) };
    replaceProject(updated);
    return respond(updated);
  },

  dismissBrand: async (projectId, { name, dismissed }) => {
    await findOwnProject(projectId);
    const hidden = state.dismissedBrands.get(projectId) ?? new Set<string>();
    if (dismissed) hidden.add(name);
    else hidden.delete(name);
    state.dismissedBrands.set(projectId, hidden);
    return respond(undefined);
  },

  getPrompts: async (projectId) => {
    findProject(projectId);
    return respond(promptsOf(projectId));
  },

  // All or none: every question must be long enough, new, and fit the plan with the others
  createPrompts: async (projectId, { prompts }) => {
    const project = await findOwnProject(projectId);
    if (prompts.length === 0) throw new ApiError(422, "No questions");
    assertRoom(project, prompts.length);
    const seen = new Set(promptsOf(projectId).map((prompt) => sameText(prompt.text)));
    const created = prompts.map(({ text, language, topic, location }) => {
      const clean = text.trim().replace(/\s+/g, " ");
      if (clean.length < PROMPT_TEXT_MIN_LENGTH || clean.length > PROMPT_TEXT_MAX_LENGTH) throw new ApiError(422, `Bad length: ${clean}`);
      if (!cleanName(topic)) throw new ApiError(422, "A question needs a topic");
      if (seen.has(sameText(clean))) throw new ApiError(422, `Asked already: ${clean}`);
      seen.add(sameText(clean));
      return newPrompt({ text: clean, language, topic: cleanName(topic), location }, project.city);
    });
    state.prompts.set(projectId, [...promptsOf(projectId), ...created]);
    return respond(created);
  },

  updatePrompt: async (projectId, promptId, { text, language, topic, location }) => {
    await findOwnProject(projectId);
    const current = findPrompt(projectId, promptId);
    const prompt: Prompt = { ...current, text, language, topic, location: location ?? current.location };
    replacePrompt(projectId, prompt);
    return respond(prompt);
  },

  // An archived question isn't asked any more and leaves the report at once; tracking it again needs room in the plan
  archivePrompt: async (projectId, promptId, { archived }) => {
    const project = await findOwnProject(projectId);
    const current = findPrompt(projectId, promptId);
    if (archived === !isTracked(current)) return respond(current);
    if (!archived) assertRoom(project);
    const prompt: Prompt = { ...current, archivedAt: archived ? new Date().toISOString() : null };
    replacePrompt(projectId, prompt);
    return respond(prompt);
  },

  updatePrompts: async (projectId, { ids, archived, topic, tags, factCheck }) => {
    const project = await findOwnProject(projectId);
    const chosen = [...new Set(ids)].map((promptId) => findPrompt(projectId, promptId));
    if (archived === false) assertRoom(project, chosen.filter((prompt) => !isTracked(prompt)).length);
    if (topic !== undefined && !cleanName(topic)) throw new ApiError(422, "A topic needs a name");
    const now = new Date().toISOString();
    const updated = chosen.map((prompt) => ({
      ...prompt,
      ...(archived === undefined ? {} : { archivedAt: archived ? (prompt.archivedAt ?? now) : null }),
      ...(topic === undefined ? {} : { topic: cleanName(topic) }),
      ...(tags === undefined ? {} : { tags: cleanTags(tags) }),
      ...(factCheck === undefined ? {} : { factCheck }),
    }));
    for (const prompt of updated) replacePrompt(projectId, prompt);
    return respond(updated);
  },

  getTopics: async (projectId) => {
    await findOwnProject(projectId);
    return respond(topicsOf(projectId));
  },

  createTopic: async (projectId, { name }) => {
    await findOwnProject(projectId);
    const topic = cleanName(name);
    const topics = topicsOf(projectId);
    if (!topic) throw new ApiError(422, "A topic needs a name");
    if (topics.some((candidate) => candidate.toLowerCase() === topic.toLowerCase())) throw new ApiError(409, `${topic} exists`);
    state.topics.set(projectId, [...topics, topic]);
    return respond(topicsOf(projectId));
  },

  // The questions and the waiting suggestions of the topic move with it
  renameTopic: async (projectId, topic, { name }) => {
    await findOwnProject(projectId);
    const next = cleanName(name);
    const topics = topicsOf(projectId);
    if (!topics.includes(topic)) throw new ApiError(404, `Topic ${topic} not found`);
    if (!next) throw new ApiError(422, "A topic needs a name");
    if (next !== topic && topics.some((candidate) => candidate.toLowerCase() === next.toLowerCase())) throw new ApiError(409, `${next} exists`);
    state.topics.set(projectId, topics.map((candidate) => (candidate === topic ? next : candidate)));
    state.prompts.set(projectId, promptsOf(projectId).map((prompt) => (prompt.topic === topic ? { ...prompt, topic: next } : prompt)));
    state.suggestions.set(projectId, suggestionsOf(projectId).map((suggestion) => (suggestion.topic === topic ? { ...suggestion, topic: next } : suggestion)));
    return respond(topicsOf(projectId));
  },

  // Its tracked questions are archived: they keep their answers and can be tracked again
  deleteTopic: async (projectId, topic) => {
    await findOwnProject(projectId);
    const topics = topicsOf(projectId);
    if (!topics.includes(topic)) throw new ApiError(404, `Topic ${topic} not found`);
    const now = new Date().toISOString();
    state.prompts.set(projectId, promptsOf(projectId).map((prompt) => (prompt.topic === topic && isTracked(prompt) ? { ...prompt, archivedAt: now } : prompt)));
    state.topics.set(projectId, topics.filter((candidate) => candidate !== topic));
    return respond(undefined);
  },

  getPromptReport: async (projectId, promptId) => {
    const project = await findOwnProject(projectId);
    const prompt = findPrompt(projectId, promptId);
    const report = buildPromptReport(project, prompt, "week", finishedRun(projectId));
    return respond({ ...report, nextRunAt: isTracked(prompt) ? nextWeeklyRun(Date.now()) : null });
  },

  getPromptSuggestions: async (projectId) => {
    await findOwnProject(projectId);
    return respond(suggestionsOf(projectId));
  },

  // Tracking adds the questions, asked from the next weekly run; all or none must fit the plan
  acceptPromptSuggestions: async (projectId, { ids }) => {
    const project = await findOwnProject(projectId);
    const chosen = pickSuggestions(projectId, ids);
    assertRoom(project, chosen.length);
    const created = chosen.map((suggestion) => newPrompt(suggestion, project.city));
    state.prompts.set(projectId, [...promptsOf(projectId), ...created]);
    dropSuggestions(projectId, ids);
    return respond(created);
  },

  rejectPromptSuggestions: async (projectId, { ids }) => {
    await findOwnProject(projectId);
    const chosen = pickSuggestions(projectId, ids);
    const rejected = state.rejectedSuggestions.get(projectId) ?? new Set<string>();
    for (const suggestion of chosen) rejected.add(sameText(suggestion.text));
    state.rejectedSuggestions.set(projectId, rejected);
    dropSuggestions(projectId, ids);
    return respond(undefined);
  },

  // A topic's own questions; for all, the project's topics and then new ones, taking turns
  suggestMorePrompts: async (projectId, { topic }) => {
    const project = await findOwnProject(projectId);
    const topics = topic ? [topic] : [...new Set([...topicsOf(projectId), ...KNOWN_TOPICS])];
    const pools = topics.map((candidate) => poolFor(candidate, project.languages));
    const rounds = Math.max(0, ...pools.map((pool) => pool.length));
    const drafts = Array.from({ length: rounds }, (_, round) => pools.flatMap((pool) => pool[round] ?? [])).flat();
    return respond(addSuggestions(projectId, drafts, "profile", topic ? 6 : 10), 1500);
  },

  // The services and customer types are saved to the project; the extra context only steers the real model
  discoverPrompts: async (projectId, { services, customers, languages }) => {
    const project = await findOwnProject(projectId);
    const clean = (list: string[]) => [...new Set(list.map(cleanName).filter(Boolean))];
    const updated: Project = { ...project, services: clean(services), customers: clean(customers) };
    if (updated.services.length + updated.customers.length === 0) throw new ApiError(422, "Nothing to suggest from");
    replaceProject(updated);
    const asked = languages.length > 0 ? languages : project.languages;
    return respond(addSuggestions(projectId, discoveryDrafts(updated.services, updated.customers, asked), "discovery", 40), 2000);
  },

  importKeywords: async (projectId, { keywords }) => {
    await findOwnProject(projectId);
    const words = [...new Set(keywords.map(cleanName).filter((word) => word.length >= 2))].slice(0, 50);
    if (words.length === 0) throw new ApiError(422, "No keywords");
    return respond(addSuggestions(projectId, keywordDrafts(words), "keywords", 40), 1500);
  },

  getReport: async (projectId, period = "week", filters) => {
    const project = findProject(projectId);
    const prompts = trackedOf(projectId);
    const report = buildReport(project, prompts, period, finishedRun(projectId), filters);
    const hidden = state.dismissedBrands.get(projectId);
    return respond({
      ...report,
      untrackedBrands: report.untrackedBrands.map((brand) => ({ ...brand, dismissed: hidden?.has(brand.name) ?? false })),
      nextRunAt: prompts.length > 0 ? nextWeeklyRun(Date.now()) : null,
    });
  },

  getRunReport: async (projectId, runId) => {
    const project = findProject(projectId);
    const prompts = trackedOf(projectId);
    const latest = buildReport(project, prompts, "week", finishedRun(projectId));
    const report = pastReport({ ...latest, nextRunAt: prompts.length > 0 ? nextWeeklyRun(Date.now()) : null }, runId);
    if (!report) throw new ApiError(404, `Run ${runId} not found`);
    return respond(report);
  },

  getReportSettings: async (projectId) => {
    await findOwnProject(projectId);
    return respond(state.reportSettings.get(projectId) ?? { telegramChat: null, email: "", language: "uz", agencyName: "" });
  },

  // The bot's handshake is the backend's: the mock ties a chat at once
  updateReportSettings: async (projectId, { telegram, email, language, agencyName }) => {
    const project = await findOwnProject(projectId);
    const current = state.reportSettings.get(projectId) ?? { telegramChat: null, email: "", language: "uz", agencyName: "" };
    const address = email?.trim();
    if (address && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(address)) throw new ApiError(422, "Bad email");
    if (agencyName !== undefined && agencyName.trim() && project.plan !== "agency") throw new ApiError(403, "The agency plan names the report");
    const next: ReportSettings = {
      telegramChat: telegram === "connect" ? `${project.brand.name} · Telegram` : telegram === "disconnect" ? null : current.telegramChat,
      email: address ?? current.email,
      language: language ?? current.language,
      agencyName: agencyName?.trim() ?? current.agencyName,
    };
    state.reportSettings.set(projectId, next);
    return respond(next);
  },

  // Read without login, like the report: the public report lists its recommendations
  getActions: async (projectId) => {
    const project = findProject(projectId);
    const report = buildReport(project, trackedOf(projectId), "week", finishedRun(projectId));
    return respond(buildActions(report, state.actionStates.get(projectId), state.addedActions.get(projectId)));
  },

  updateAction: async (projectId, actionId, { status, stepsDone }) => {
    const project = await findOwnProject(projectId);
    const report = buildReport(project, trackedOf(projectId), "week", finishedRun(projectId));
    const changed = state.actionStates.get(projectId) ?? new Map<string, ActionState>();
    const added = state.addedActions.get(projectId) ?? [];
    const action = buildActions(report, changed, added).find((candidate) => candidate.id === actionId);
    if (!action) throw new ApiError(404, `Action ${actionId} not found`);
    if (stepsDone?.some((step) => !Number.isInteger(step) || step < 0 || step >= ACTION_STEP_COUNT)) {
      throw new ApiError(422, `Steps must be whole numbers from 0 to ${ACTION_STEP_COUNT - 1}`);
    }
    const next = status ?? action.status;
    const doneAt = next !== "done" ? null : action.status === "done" ? action.doneAt : new Date().toISOString();
    const steps = stepsDone ? [...new Set(stepsDone)].sort((a, b) => a - b) : action.stepsDone;
    state.actionStates.set(projectId, changed.set(actionId, { status: next, doneAt, stepsDone: steps }));
    const updated = buildActions(report, changed, added).find((candidate) => candidate.id === actionId);
    return respond(updated ?? action);
  },

  // One status for several; their checked steps stay as they were
  updateActions: async (projectId, { ids, status }) => {
    const project = await findOwnProject(projectId);
    const report = buildReport(project, trackedOf(projectId), "week", finishedRun(projectId));
    const changed = state.actionStates.get(projectId) ?? new Map<string, ActionState>();
    const added = state.addedActions.get(projectId) ?? [];
    const all = buildActions(report, changed, added);
    const chosen = [...new Set(ids)].map((actionId) => {
      const action = all.find((candidate) => candidate.id === actionId);
      if (!action) throw new ApiError(404, `Action ${actionId} not found`);
      return action;
    });
    const now = new Date().toISOString();
    for (const action of chosen) {
      const doneAt = status !== "done" ? null : action.status === "done" ? action.doneAt : now;
      changed.set(action.id, { status, doneAt, stepsDone: action.stepsDone });
    }
    state.actionStates.set(projectId, changed);
    const updated = buildActions(report, changed, added);
    return respond(chosen.map((action) => updated.find((candidate) => candidate.id === action.id) ?? action));
  },

  // The backend reads the page (or the text) and writes the brief; here it comes from the topic
  addContentAction: async (projectId, { url, document, pageType, topic }) => {
    const project = await findOwnProject(projectId);
    const typed = url?.trim() ?? "";
    const address = typed ? (/^https?:\/\//i.test(typed) ? typed : `https://${typed}`) : null;
    if (!address && !document?.trim()) throw new ApiError(422, "A page's address or its text is needed");
    if (!cleanName(topic)) throw new ApiError(422, "A topic is needed");
    const report = buildReport(project, trackedOf(projectId), "week", finishedRun(projectId));
    const action = pageAction(report, { url: address, pageType, topic: cleanName(topic) }, newId("act_page"));
    state.addedActions.set(projectId, [...(state.addedActions.get(projectId) ?? []), action]);
    return respond(action, 1500);
  },

  createSnapshot: (body) => {
    const snapshot = buildSnapshot(body, newId("snp"));
    state.snapshots.set(snapshot.id, snapshot);
    return respond(snapshot, 1200);
  },

  getSnapshot: async (id) => {
    const snapshot = state.snapshots.get(id);
    if (!snapshot) throw new ApiError(404, `Snapshot ${id} not found`);
    return respond(snapshot);
  },

  analyzeSite: async ({ domain }) => {
    await currentUser();
    const normalized = normalizeDomain(domain);
    if (!isValidDomain(normalized)) throw new ApiError(422, `Invalid domain ${domain}`);
    return respond(onboarding.analyzeSite(normalized), 1500);
  },

  suggestCompetitors: async (body) => {
    await currentUser();
    return respond(onboarding.suggestCompetitors(body), 1000);
  },

  suggestPrompts: async () => {
    await currentUser();
    return respond(onboarding.suggestPrompts(), 1200);
  },

  getRunProgress: async (id) => {
    const user = await currentUser();
    const run = [...state.runs.values()].find((r) => r.id === id);
    if (!run || state.owners.get(run.projectId) !== user.id) throw new ApiError(404, `Run ${id} not found`);
    return respond(progressOf(run), 150);
  },

  createDemoRequest: async (body) => {
    if (!UZ_PHONE.test(body.phone)) throw new ApiError(422, `Invalid phone number ${body.phone}`);
    state.demoRequests.push(body);
    return respond(undefined, 600);
  },

  sendSupportMessage: async (body) => {
    const user = await currentUser();
    state.supportMessages.push({ ...body, userId: user.id });
    return respond(undefined, 600);
  },

  updateMe: async ({ name }) => {
    const user = await currentUser();
    const clean = cleanName(name);
    if (!clean) throw new ApiError(422, "A name is needed");
    const account = state.accounts.find((candidate) => candidate.user.id === user.id);
    if (!account) throw new ApiError(401, "Not logged in");
    account.user = { ...account.user, name: clean };
    return respond(account.user);
  },

  // The suggested questions are the backend's to write again from the new profile
  updateProject: async (projectId, body) => {
    const project = await findOwnProject(projectId);
    const name = body.name === undefined ? project.brand.name : cleanName(body.name);
    if (!name) throw new ApiError(422, "A brand needs a name");
    const domain = body.domain === undefined ? project.brand.domain : normalizeDomain(body.domain);
    if (body.domain !== undefined && !isValidDomain(domain)) throw new ApiError(422, "Not a website");
    const list = (values: string[] | undefined, current: string[]) => (values === undefined ? current : cleanTags(values));
    const updated: Project = {
      ...project,
      brand: { ...project.brand, name, domain, aliases: list(body.aliases, project.brand.aliases) },
      description: body.description === undefined ? project.description : body.description.trim(),
      category: body.category ?? project.category,
      city: body.city ?? project.city,
      services: list(body.services, project.services),
      customers: list(body.customers, project.customers),
      identity: list(body.identity, project.identity),
    };
    replaceProject(updated);
    return respond(updated);
  },

  updateCompetitor: async (projectId, brandId, body) => {
    const project = await findOwnProject(projectId);
    const competitor = project.competitors.find((candidate) => candidate.id === brandId);
    if (!competitor) throw new ApiError(404, `Brand ${brandId} not found`);
    const name = body.name === undefined ? competitor.name : cleanName(body.name);
    if (!name) throw new ApiError(422, "A brand needs a name");
    if ([project.brand, ...project.competitors].some((brand) => brand.id !== brandId && sameName(brand.name, name))) {
      throw new ApiError(409, `${name} is already tracked`);
    }
    const domain = body.domain === undefined ? competitor.domain : normalizeDomain(body.domain);
    if (domain && !isValidDomain(domain)) throw new ApiError(422, "Not a website");
    const changed: Brand = { ...competitor, name, domain, aliases: body.aliases === undefined ? competitor.aliases : cleanTags(body.aliases) };
    const updated: Project = { ...project, competitors: project.competitors.map((candidate) => (candidate.id === brandId ? changed : candidate)) };
    replaceProject(updated);
    return respond(updated);
  },

  getFacts: async (projectId) => {
    await findOwnProject(projectId);
    return respond(factsOf(projectId));
  },

  updateFacts: async (projectId, { facts }) => {
    const project = await findOwnProject(projectId);
    const clean: string[] = [];
    for (const fact of facts.map(cleanName).filter(Boolean)) if (!clean.some((kept) => sameName(kept, fact))) clean.push(fact);
    if (clean.some((fact) => fact.length > FACT_MAX_LENGTH)) throw new ApiError(422, `A fact is at most ${FACT_MAX_LENGTH} characters`);
    if (clean.length > project.limits.facts) throw new ApiError(409, `The plan allows ${project.limits.facts} facts`);
    state.facts.set(projectId, clean);
    return respond(clean);
  },

  // The backend reads the website; the mock knows the sample clinic's, and writes a few lines for any other
  suggestFacts: async (projectId) => {
    const project = await findOwnProject(projectId);
    const found =
      projectId === PROJECT.id
        ? SITE_FACTS
        : [
            ...(project.description ? [project.description] : []),
            ...project.services.slice(0, 3).map((service) => `${project.brand.name}: ${service}`),
            `Sayt: ${project.brand.domain}`,
          ];
    const have = factsOf(projectId);
    return respond(found.filter((fact) => !have.some((kept) => sameName(kept, fact))), 900);
  },

  getTags: async (projectId) => {
    await findOwnProject(projectId);
    return respond(tagsOf(projectId));
  },

  createTags: async (projectId, { names }) => {
    await findOwnProject(projectId);
    const made = [...(state.tags.get(projectId) ?? [])];
    const existing = tagsOf(projectId).map((tag) => tag.name);
    for (const name of names.map(cleanName).filter(Boolean)) {
      if (![...existing, ...made].some((tag) => sameName(tag, name))) made.push(name);
    }
    state.tags.set(projectId, made);
    return respond(tagsOf(projectId));
  },

  renameTag: async (projectId, tag, { name }) => {
    await findOwnProject(projectId);
    const current = tagsOf(projectId).find((candidate) => sameName(candidate.name, tag));
    if (!current) throw new ApiError(404, `Tag ${tag} not found`);
    const next = cleanName(name);
    if (!next) throw new ApiError(422, "A tag needs a name");
    if (tagsOf(projectId).some((candidate) => !sameName(candidate.name, tag) && sameName(candidate.name, next))) {
      throw new ApiError(409, `${next} exists`);
    }
    state.tags.set(projectId, (state.tags.get(projectId) ?? []).map((made) => (sameName(made, tag) ? next : made)));
    retag(projectId, current.name, next);
    return respond(tagsOf(projectId));
  },

  deleteTag: async (projectId, tag) => {
    await findOwnProject(projectId);
    state.tags.set(projectId, (state.tags.get(projectId) ?? []).filter((made) => !sameName(made, tag)));
    retag(projectId, tag, null);
    return respond(undefined);
  },

  getMembers: async () => {
    const user = await currentUser();
    return respond([ownerMember(user), ...invitedOf(user)]);
  },

  // The backend sends the SMS with the link; the member is "invited" until they log in
  inviteMember: async ({ phone }) => {
    const user = await currentUser();
    if (!UZ_PHONE.test(phone)) throw new ApiError(422, "Not an Uzbek mobile number");
    const invited = invitedOf(user);
    if (phone === user.phone || invited.some((member) => member.phone === phone)) throw new ApiError(409, "Already a member");
    const member: Member = {
      id: newId("mbr"),
      name: null,
      phone,
      telegramUsername: null,
      role: "member",
      status: "invited",
      projectIds: ownerMember(user).projectIds,
    };
    state.members.set(user.id, [...invited, member]);
    return respond(member);
  },

  removeMember: async (memberId) => {
    const user = await currentUser();
    if (memberId === ownerMember(user).id) throw new ApiError(403, "The owner can't be removed");
    const invited = invitedOf(user);
    if (!invited.some((member) => member.id === memberId)) throw new ApiError(404, `Member ${memberId} not found`);
    state.members.set(user.id, invited.filter((member) => member.id !== memberId));
    return respond(undefined);
  },

  requestPlan: async (projectId, { plan, cycle }) => {
    const user = await currentUser();
    const project = await findOwnProject(projectId);
    state.planRequests.push({ projectId, plan, cycle: cycle ?? project.billing.cycle, userId: user.id, at: new Date().toISOString() });
    return respond(undefined, 600);
  },
};
