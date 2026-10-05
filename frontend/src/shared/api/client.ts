import { SESSION_COOKIE } from "@/shared/constants";
import type {
  Action,
  AnalyzeSiteRequest,
  CompetitorSuggestion,
  CreateProjectRequest,
  CreateProjectResponse,
  CreatePromptRequest,
  DemoRequest,
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
  SuggestPromptsRequest,
  SupportMessage,
  TelegramAuthRequest,
  UpdateActionRequest,
  UpdatePromptRequest,
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
  getPrompts(projectId: string): Promise<Prompt[]>;
  createPrompt(projectId: string, body: CreatePromptRequest): Promise<Prompt>;
  updatePrompt(projectId: string, promptId: string, body: UpdatePromptRequest): Promise<Prompt>;
  getPromptSuggestions(projectId: string): Promise<SuggestedPrompt[]>;
  acceptPromptSuggestion(projectId: string, suggestionId: string): Promise<Prompt>;
  rejectPromptSuggestion(projectId: string, suggestionId: string): Promise<void>;
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
  getPrompts: (projectId) => request(`/projects/${id(projectId)}/prompts`),
  createPrompt: (projectId, body) =>
    send("POST", `/projects/${id(projectId)}/prompts`, body),
  updatePrompt: (projectId, promptId, body) =>
    send("PUT", `/projects/${id(projectId)}/prompts/${id(promptId)}`, body),
  getPromptSuggestions: (projectId) => request(`/projects/${id(projectId)}/prompt-suggestions`),
  acceptPromptSuggestion: (projectId, suggestionId) =>
    send("POST", `/projects/${id(projectId)}/prompt-suggestions/${id(suggestionId)}/accept`),
  rejectPromptSuggestion: (projectId, suggestionId) =>
    send("DELETE", `/projects/${id(projectId)}/prompt-suggestions/${id(suggestionId)}`),
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
      getPrompts: (projectId) => mocks().then((m) => unwrap(m.getPrompts(projectId))),
      createPrompt: (projectId, body) =>
        mocks().then((m) => unwrap(m.createPrompt(projectId, body))),
      updatePrompt: (projectId, promptId, body) =>
        mocks().then((m) => unwrap(m.updatePrompt(projectId, promptId, body))),
      getPromptSuggestions: (projectId) => mocks().then((m) => unwrap(m.getPromptSuggestions(projectId))),
      acceptPromptSuggestion: (projectId, suggestionId) =>
        mocks().then((m) => unwrap(m.acceptPromptSuggestion(projectId, suggestionId))),
      rejectPromptSuggestion: (projectId, suggestionId) =>
        mocks().then((m) => unwrap(m.rejectPromptSuggestion(projectId, suggestionId))),
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
