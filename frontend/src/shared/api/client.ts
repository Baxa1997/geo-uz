import { SESSION_COOKIE } from "@/shared/constants";
import type {
  Action,
  AddCompetitorRequest,
  AnalyzeSiteRequest,
  ArchivePromptRequest,
  CompetitorSuggestion,
  CreateProjectRequest,
  CreateProjectResponse,
  CreatePromptsRequest,
  DiscoverPromptsRequest,
  DemoRequest,
  DismissBrandRequest,
  ImportKeywordsRequest,
  Project,
  Prompt,
  PromptSuggestion,
  Report,
  ReportFilters,
  ReportPeriod,
  RunProgress,
  SendCodeRequest,
  SendCodeResponse,
  SiteAnalysis,
  Snapshot,
  SnapshotRequest,
  SuggestCompetitorsRequest,
  SuggestedPrompt,
  SuggestionIdsRequest,
  SuggestMoreRequest,
  SuggestPromptsRequest,
  SupportMessage,
  TelegramAuthRequest,
  TopicRequest,
  UpdateActionRequest,
  UpdatePromptRequest,
  UpdatePromptsRequest,
  User,
  VerifyCodeRequest,
} from "@/shared/types/api";

export const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === "true";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export interface ApiClient {
  sendCode(body: SendCodeRequest): Promise<SendCodeResponse>;
  verifyCode(body: VerifyCodeRequest): Promise<User>;
  loginWithTelegram(body: TelegramAuthRequest): Promise<User>;
  getMe(): Promise<User>;
  logout(): Promise<void>;
  getProjects(): Promise<Project[]>;
  createProject(body: CreateProjectRequest): Promise<CreateProjectResponse>;
  getProject(id: string): Promise<Project>;
  /** Tracks one more competitor; 409 at the plan's limit or when the brand is tracked already. */
  addCompetitor(projectId: string, body: AddCompetitorRequest): Promise<Project>;
  /** Stops tracking a competitor; the answers keep its mentions, so it can be tracked again. */
  removeCompetitor(projectId: string, brandId: string): Promise<Project>;
  /** Hides an untracked brand from the suggestions, or shows it again. */
  dismissBrand(projectId: string, body: DismissBrandRequest): Promise<void>;
  getPrompts(projectId: string): Promise<Prompt[]>;
  /** Adds one question or several; all or none: 409 when they don't all fit the plan, 422 for a repeat. */
  createPrompts(projectId: string, body: CreatePromptsRequest): Promise<Prompt[]>;
  updatePrompt(projectId: string, promptId: string, body: UpdatePromptRequest): Promise<Prompt>;
  /** Archives a question or tracks it again; 409 when tracking it again would pass the plan's limit. */
  archivePrompt(projectId: string, promptId: string, body: ArchivePromptRequest): Promise<Prompt>;
  /** Archives several questions, tracks them again (409 when they don't all fit) or moves them to a topic. */
  updatePrompts(projectId: string, body: UpdatePromptsRequest): Promise<Prompt[]>;
  /** The project's topics in their order, those without a question yet too. */
  getTopics(projectId: string): Promise<string[]>;
  /** Adds an empty topic; 409 when the project has it already. Returns the topics. */
  createTopic(projectId: string, body: TopicRequest): Promise<string[]>;
  /** Renames a topic in its questions and suggestions too; 409 when the new name is taken. Returns the topics. */
  renameTopic(projectId: string, topic: string, body: TopicRequest): Promise<string[]>;
  /** Deletes a topic; its tracked questions are archived (they keep their answers). */
  deleteTopic(projectId: string, topic: string): Promise<void>;
  /** The report over one question, archived or not: its answers, scores, cited sites and its own history. */
  getPromptReport(projectId: string, promptId: string): Promise<Report>;
  getPromptSuggestions(projectId: string): Promise<SuggestedPrompt[]>;
  /** Tracks suggestions (asked from the next run); 409 when they don't all fit the plan. */
  acceptPromptSuggestions(projectId: string, body: SuggestionIdsRequest): Promise<Prompt[]>;
  rejectPromptSuggestions(projectId: string, body: SuggestionIdsRequest): Promise<void>;
  /** "Suggest more": new suggestions for a topic or for all; empty when there is nothing new to suggest. */
  suggestMorePrompts(projectId: string, body: SuggestMoreRequest): Promise<SuggestedPrompt[]>;
  /** Discovery: saves the services and customer types, returns the new suggestions (with suggested topics). */
  discoverPrompts(projectId: string, body: DiscoverPromptsRequest): Promise<SuggestedPrompt[]>;
  /** Questions customers ask about the imported keywords, as new suggestions. */
  importKeywords(projectId: string, body: ImportKeywordsRequest): Promise<SuggestedPrompt[]>;
  getReport(projectId: string, period?: ReportPeriod, filters?: ReportFilters): Promise<Report>;
  getActions(projectId: string): Promise<Action[]>;
  updateAction(projectId: string, actionId: string, body: UpdateActionRequest): Promise<Action>;
  createSnapshot(body: SnapshotRequest): Promise<Snapshot>;
  getSnapshot(id: string): Promise<Snapshot>;
  analyzeSite(body: AnalyzeSiteRequest): Promise<SiteAnalysis>;
  suggestCompetitors(body: SuggestCompetitorsRequest): Promise<CompetitorSuggestion[]>;
  suggestPrompts(body: SuggestPromptsRequest): Promise<PromptSuggestion[]>;
  getRunProgress(id: string): Promise<RunProgress>;
  createDemoRequest(body: DemoRequest): Promise<void>;
  sendSupportMessage(body: SupportMessage): Promise<void>;
}

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/** The browser sends the session cookie itself; calls made on the Next.js server pass it on. */
async function sessionHeaders(): Promise<Record<string, string>> {
  if (typeof window !== "undefined") return {};
  const { cookies } = await import("next/headers");
  const session = (await cookies()).get(SESSION_COOKIE);
  return session ? { Cookie: `${SESSION_COOKIE}=${session.value}` } : {};
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(await sessionHeaders()),
    },
  });
  if (!response.ok) {
    throw new ApiError(
      response.status,
      `${init?.method ?? "GET"} ${path} failed: ${response.status}`,
    );
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

const send = <T>(method: "POST" | "PUT" | "PATCH" | "DELETE", path: string, body?: unknown) =>
  request<T>(path, { method, body: body === undefined ? undefined : JSON.stringify(body) });

const id = encodeURIComponent;

const httpApi: ApiClient = {
  sendCode: (body) => send("POST", "/auth/code", body),
  verifyCode: (body) => send("POST", "/auth/code/verify", body),
  loginWithTelegram: (body) => send("POST", "/auth/telegram", body),
  getMe: () => request("/auth/me"),
  logout: () => send("POST", "/auth/logout"),
  getProjects: () => request("/projects"),
  createProject: (body) => send("POST", "/projects", body),
  getProject: (projectId) => request(`/projects/${id(projectId)}`),
  addCompetitor: (projectId, body) => send("POST", `/projects/${id(projectId)}/competitors`, body),
  removeCompetitor: (projectId, brandId) => send("DELETE", `/projects/${id(projectId)}/competitors/${id(brandId)}`),
  dismissBrand: (projectId, body) => send("PATCH", `/projects/${id(projectId)}/untracked-brands`, body),
  getPrompts: (projectId) => request(`/projects/${id(projectId)}/prompts`),
  createPrompts: (projectId, body) => send("POST", `/projects/${id(projectId)}/prompts`, body),
  updatePrompt: (projectId, promptId, body) =>
    send("PUT", `/projects/${id(projectId)}/prompts/${id(promptId)}`, body),
  archivePrompt: (projectId, promptId, body) =>
    send("PATCH", `/projects/${id(projectId)}/prompts/${id(promptId)}`, body),
  updatePrompts: (projectId, body) => send("PATCH", `/projects/${id(projectId)}/prompts`, body),
  getTopics: (projectId) => request(`/projects/${id(projectId)}/topics`),
  createTopic: (projectId, body) => send("POST", `/projects/${id(projectId)}/topics`, body),
  renameTopic: (projectId, topic, body) => send("PATCH", `/projects/${id(projectId)}/topics/${id(topic)}`, body),
  deleteTopic: (projectId, topic) => send("DELETE", `/projects/${id(projectId)}/topics/${id(topic)}`),
  getPromptReport: (projectId, promptId) => request(`/projects/${id(projectId)}/prompts/${id(promptId)}/report`),
  getPromptSuggestions: (projectId) => request(`/projects/${id(projectId)}/prompt-suggestions`),
  acceptPromptSuggestions: (projectId, body) => send("POST", `/projects/${id(projectId)}/prompt-suggestions/accept`, body),
  rejectPromptSuggestions: (projectId, body) => send("POST", `/projects/${id(projectId)}/prompt-suggestions/reject`, body),
  suggestMorePrompts: (projectId, body) => send("POST", `/projects/${id(projectId)}/prompt-suggestions/more`, body),
  discoverPrompts: (projectId, body) => send("POST", `/projects/${id(projectId)}/prompt-suggestions/discover`, body),
  importKeywords: (projectId, body) => send("POST", `/projects/${id(projectId)}/prompt-suggestions/keywords`, body),
  getReport: (projectId, period = "week", filters = {}) =>
    request(`/projects/${id(projectId)}/report?${new URLSearchParams({ period, ...filters })}`),
  getActions: (projectId) => request(`/projects/${id(projectId)}/actions`),
  updateAction: (projectId, actionId, body) =>
    send("PATCH", `/projects/${id(projectId)}/actions/${id(actionId)}`, body),
  createSnapshot: (body) => send("POST", "/snapshot", body),
  getSnapshot: (snapshotId) => request(`/snapshot/${id(snapshotId)}`),
  analyzeSite: (body) => send("POST", "/onboarding/analyze-site", body),
  suggestCompetitors: (body) => send("POST", "/onboarding/suggest-competitors", body),
  suggestPrompts: (body) => send("POST", "/onboarding/suggest-prompts", body),
  getRunProgress: (runId) => request(`/runs/${id(runId)}/progress`),
  createDemoRequest: (body) => send("POST", "/demo-requests", body),
  sendSupportMessage: (body) => send("POST", "/support-messages", body),
};

/** What the mock bridge returns: server actions can't carry an ApiError's status across. */
export type MockResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; message: string };

async function unwrap<T>(result: Promise<MockResult<T>>): Promise<T> {
  const settled = await result;
  if (!settled.ok) throw new ApiError(settled.status, settled.message);
  return settled.data;
}

// The mocks run on the Next.js server only, so server-rendered pages and browser
// forms share one copy of the mock data. Loaded lazily: never bundled when mocks are off.
const mocks = () => import("@/mocks/actions");

export const api: ApiClient = USE_MOCKS
  ? {
      sendCode: (body) => mocks().then((m) => unwrap(m.sendCode(body))),
      verifyCode: (body) => mocks().then((m) => unwrap(m.verifyCode(body))),
      loginWithTelegram: (body) => mocks().then((m) => unwrap(m.loginWithTelegram(body))),
      getMe: () => mocks().then((m) => unwrap(m.getMe())),
      logout: () => mocks().then((m) => unwrap(m.logout())),
      getProjects: () => mocks().then((m) => unwrap(m.getProjects())),
      createProject: (body) => mocks().then((m) => unwrap(m.createProject(body))),
      getProject: (projectId) => mocks().then((m) => unwrap(m.getProject(projectId))),
      addCompetitor: (projectId, body) => mocks().then((m) => unwrap(m.addCompetitor(projectId, body))),
      removeCompetitor: (projectId, brandId) => mocks().then((m) => unwrap(m.removeCompetitor(projectId, brandId))),
      dismissBrand: (projectId, body) => mocks().then((m) => unwrap(m.dismissBrand(projectId, body))),
      getPrompts: (projectId) => mocks().then((m) => unwrap(m.getPrompts(projectId))),
      createPrompts: (projectId, body) => mocks().then((m) => unwrap(m.createPrompts(projectId, body))),
      updatePrompt: (projectId, promptId, body) =>
        mocks().then((m) => unwrap(m.updatePrompt(projectId, promptId, body))),
      archivePrompt: (projectId, promptId, body) =>
        mocks().then((m) => unwrap(m.archivePrompt(projectId, promptId, body))),
      updatePrompts: (projectId, body) => mocks().then((m) => unwrap(m.updatePrompts(projectId, body))),
      getTopics: (projectId) => mocks().then((m) => unwrap(m.getTopics(projectId))),
      createTopic: (projectId, body) => mocks().then((m) => unwrap(m.createTopic(projectId, body))),
      renameTopic: (projectId, topic, body) => mocks().then((m) => unwrap(m.renameTopic(projectId, topic, body))),
      deleteTopic: (projectId, topic) => mocks().then((m) => unwrap(m.deleteTopic(projectId, topic))),
      getPromptReport: (projectId, promptId) =>
        mocks().then((m) => unwrap(m.getPromptReport(projectId, promptId))),
      getPromptSuggestions: (projectId) => mocks().then((m) => unwrap(m.getPromptSuggestions(projectId))),
      acceptPromptSuggestions: (projectId, body) => mocks().then((m) => unwrap(m.acceptPromptSuggestions(projectId, body))),
      rejectPromptSuggestions: (projectId, body) => mocks().then((m) => unwrap(m.rejectPromptSuggestions(projectId, body))),
      suggestMorePrompts: (projectId, body) => mocks().then((m) => unwrap(m.suggestMorePrompts(projectId, body))),
      discoverPrompts: (projectId, body) => mocks().then((m) => unwrap(m.discoverPrompts(projectId, body))),
      importKeywords: (projectId, body) => mocks().then((m) => unwrap(m.importKeywords(projectId, body))),
      getReport: (projectId, period, filters) =>
        mocks().then((m) => unwrap(m.getReport(projectId, period, filters))),
      getActions: (projectId) => mocks().then((m) => unwrap(m.getActions(projectId))),
      updateAction: (projectId, actionId, body) =>
        mocks().then((m) => unwrap(m.updateAction(projectId, actionId, body))),
      createSnapshot: (body) => mocks().then((m) => unwrap(m.createSnapshot(body))),
      getSnapshot: (snapshotId) => mocks().then((m) => unwrap(m.getSnapshot(snapshotId))),
      analyzeSite: (body) => mocks().then((m) => unwrap(m.analyzeSite(body))),
      suggestCompetitors: (body) => mocks().then((m) => unwrap(m.suggestCompetitors(body))),
      suggestPrompts: (body) => mocks().then((m) => unwrap(m.suggestPrompts(body))),
      getRunProgress: (runId) => mocks().then((m) => unwrap(m.getRunProgress(runId))),
      createDemoRequest: (body) => mocks().then((m) => unwrap(m.createDemoRequest(body))),
      sendSupportMessage: (body) => mocks().then((m) => unwrap(m.sendSupportMessage(body))),
    }
  : httpApi;
