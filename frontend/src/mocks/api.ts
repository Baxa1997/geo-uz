// In-memory mock of the backend. Runs on the Next.js server only (browser code
// reaches it through ./actions.ts). Changes last until the dev server restarts.
import { randomUUID } from "node:crypto";
import { ApiError, type ApiClient } from "@/shared/api/client";
import { ACTION_STEP_COUNT } from "@/shared/constants";
import { isValidDomain, normalizeDomain } from "@/shared/helpers/domain";
import { isTracked } from "@/shared/helpers/prompts";
import type {
  Brand,
  DemoRequest,
  Project,
  Prompt,
  RunProgress,
  RunStatus,
  Snapshot,
  SuggestedPrompt,
  SupportMessage,
  User,
} from "@/shared/types/api";
import { buildActions, type ActionState } from "./action-items";
import { DEMO_USER } from "./accounts";
import { ARCHIVED_PROMPT, BRANDS, DEFAULT_PLAN, OTHER_CLINICS, PLAN_LIMITS, PROJECT, PROMPTS, SUGGESTED_PROMPTS } from "./data";
import * as onboarding from "./onboarding";
import { buildPromptReport, buildReport, buildSnapshot, firstRun, METHOD, NO_RUN, SEEDED_RUN, type MockRun } from "./report";
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
  /** Project id → ids of the suggested questions the client rejected. */
  rejectedSuggestions: Map<string, Set<string>>;
  /** Project id → names of the untracked brands the client hid from the suggestions. */
  dismissedBrands: Map<string, Set<string>>;
  demoRequests: DemoRequest[];
  supportMessages: (SupportMessage & { userId: string })[];
  nextId: number;
}

// Kept on globalThis so hot reloads and separate route bundles share one copy.
// Bump the version when MockState changes: a hot reload then starts fresh instead of reading old data.
const STATE_KEY = "__geoMockState_v13";
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
  rejectedSuggestions: new Map(),
  dismissedBrands: new Map(),
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

/** One more tracked question must fit the plan. */
function assertRoom(project: Project) {
  if (trackedOf(project.id).length >= project.limits.prompts) {
    throw new ApiError(409, `The plan allows ${project.limits.prompts} tracked questions`);
  }
}

const newPrompt = (body: Pick<Prompt, "text" | "language" | "topic">): Prompt => ({
  id: newId("prm"),
  text: body.text,
  language: body.language,
  topic: body.topic,
  createdAt: new Date().toISOString(),
  archivedAt: null,
});

/** Suggested questions the project doesn't have (tracked or archived) and the client hasn't rejected. */
function suggestionsOf(projectId: string): SuggestedPrompt[] {
  const tracked = new Set(promptsOf(projectId).map((prompt) => prompt.text));
  const rejected = state.rejectedSuggestions.get(projectId) ?? new Set<string>();
  return SUGGESTED_PROMPTS.map((prompt, index) => ({ id: `sug_${String(index + 1).padStart(2, "0")}`, ...prompt })).filter(
    (suggestion) => !tracked.has(suggestion.text) && !rejected.has(suggestion.id),
  );
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

function findSuggestion(projectId: string, suggestionId: string): SuggestedPrompt {
  const suggestion = suggestionsOf(projectId).find((candidate) => candidate.id === suggestionId);
  if (!suggestion) throw new ApiError(404, `Suggestion ${suggestionId} not found`);
  return suggestion;
}

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
      plan: DEFAULT_PLAN,
      limits: PLAN_LIMITS[DEFAULT_PLAN],
    };
    state.projects.push(project);
    state.owners.set(project.id, user.id);
    const created = prompts.map(newPrompt);
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

  createPrompt: async (projectId, body) => {
    assertRoom(await findOwnProject(projectId));
    const prompt = newPrompt(body);
    state.prompts.set(projectId, [...promptsOf(projectId), prompt]);
    return respond(prompt);
  },

  updatePrompt: async (projectId, promptId, { text, language, topic }) => {
    await findOwnProject(projectId);
    const prompt: Prompt = { ...findPrompt(projectId, promptId), text, language, topic };
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

  // Accepting adds the question; it is asked from the next weekly run
  acceptPromptSuggestion: async (projectId, suggestionId) => {
    assertRoom(await findOwnProject(projectId));
    const prompt = newPrompt(findSuggestion(projectId, suggestionId));
    state.prompts.set(projectId, [...promptsOf(projectId), prompt]);
    return respond(prompt);
  },

  rejectPromptSuggestion: async (projectId, suggestionId) => {
    await findOwnProject(projectId);
    findSuggestion(projectId, suggestionId);
    state.rejectedSuggestions.set(projectId, (state.rejectedSuggestions.get(projectId) ?? new Set()).add(suggestionId));
    return respond(undefined);
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

  getActions: async (projectId) => {
    const project = await findOwnProject(projectId);
    const report = buildReport(project, trackedOf(projectId), "week", finishedRun(projectId));
    return respond(buildActions(report, state.actionStates.get(projectId)));
  },

  updateAction: async (projectId, actionId, { status, stepsDone }) => {
    const project = await findOwnProject(projectId);
    const report = buildReport(project, trackedOf(projectId), "week", finishedRun(projectId));
    const changed = state.actionStates.get(projectId) ?? new Map<string, ActionState>();
    const action = buildActions(report, changed).find((candidate) => candidate.id === actionId);
    if (!action) throw new ApiError(404, `Action ${actionId} not found`);
    if (stepsDone?.some((step) => !Number.isInteger(step) || step < 0 || step >= ACTION_STEP_COUNT)) {
      throw new ApiError(422, `Steps must be whole numbers from 0 to ${ACTION_STEP_COUNT - 1}`);
    }
    const next = status ?? action.status;
    const doneAt = next !== "done" ? null : action.status === "done" ? action.doneAt : new Date().toISOString();
    const steps = stepsDone ? [...new Set(stepsDone)].sort((a, b) => a - b) : action.stepsDone;
    state.actionStates.set(projectId, changed.set(actionId, { status: next, doneAt, stepsDone: steps }));
    const updated = buildActions(report, changed).find((candidate) => candidate.id === actionId);
    return respond(updated ?? action);
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
};
