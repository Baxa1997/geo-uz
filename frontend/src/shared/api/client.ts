import { SESSION_COOKIE } from "@/shared/constants";
import type {
  CreateTagsRequest,
  FactsRequest,
  InviteMemberRequest,
  Member,
  PlanRequest,
  TagSummary,
  UpdateBrandRequest,
  UpdateMeRequest,
  UpdateProjectRequest,
  Action,
  AddCompetitorRequest,
  AddContentActionRequest,
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
  ReportSettings,
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
  UpdateActionsRequest,
  UpdateReportSettingsRequest,
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
  /** The report of one past run, as it stood then (Hisobotlar); the runs are `Report.history`. Readable without login, like the report. */
  getRunReport(projectId: string, runId: string): Promise<Report>;
  getReportSettings(projectId: string): Promise<ReportSettings>;
  updateReportSettings(projectId: string, body: UpdateReportSettingsRequest): Promise<ReportSettings>;
  getActions(projectId: string): Promise<Action[]>;
  updateAction(projectId: string, actionId: string, body: UpdateActionRequest): Promise<Action>;
  /** One status for several actions: accept all, decline all, the rows picked. */
  updateActions(projectId: string, body: UpdateActionsRequest): Promise<Action[]>;
  /** "Add content": an action with a brief for a page of the client's, from its address or its text. */
  addContentAction(projectId: string, body: AddContentActionRequest): Promise<Action>;
  createSnapshot(body: SnapshotRequest): Promise<Snapshot>;
  getSnapshot(id: string): Promise<Snapshot>;
  analyzeSite(body: AnalyzeSiteRequest): Promise<SiteAnalysis>;
  suggestCompetitors(body: SuggestCompetitorsRequest): Promise<CompetitorSuggestion[]>;
  suggestPrompts(body: SuggestPromptsRequest): Promise<PromptSuggestion[]>;
  getRunProgress(id: string): Promise<RunProgress>;
  createDemoRequest(body: DemoRequest): Promise<void>;
  sendSupportMessage(body: SupportMessage): Promise<void>;
  /** Sozlamalar: the user's own name. */
  updateMe(body: UpdateMeRequest): Promise<User>;
  /** Sozlamalar › Profil: the brand profile; 422 for an empty name or a bad website. */
  updateProject(projectId: string, body: UpdateProjectRequest): Promise<Project>;
  /** Sozlamalar › Brendlar: a competitor's name, spellings or website; 409 when the name is tracked already. */
  updateCompetitor(projectId: string, brandId: string, body: UpdateBrandRequest): Promise<Project>;
  /** Sozlamalar › Faktlar: the brand facts the answers are checked against. */
  getFacts(projectId: string): Promise<string[]>;
  /** Replaces them; 409 above the plan's `limits.facts`, 422 for one too long. */
  updateFacts(projectId: string, body: FactsRequest): Promise<string[]>;
  /** Statements read from the brand's website for the client to pick from; nothing is saved. */
  suggestFacts(projectId: string): Promise<string[]>;
  /** Sozlamalar › Teglar: the questions' tags, those on no question yet too, with how many questions carry each. */
  getTags(projectId: string): Promise<TagSummary[]>;
  createTags(projectId: string, body: CreateTagsRequest): Promise<TagSummary[]>;
  /** Renames a tag on all its questions; 409 when the name is taken. */
  renameTag(projectId: string, tag: string, body: TopicRequest): Promise<TagSummary[]>;
  /** Deletes a tag and takes it off its questions. */
  deleteTag(projectId: string, tag: string): Promise<void>;
  /** Sozlamalar › A'zolar: the people with access to the account's projects, the owner first. */
  getMembers(): Promise<Member[]>;
  /** Invites someone by phone number (an SMS with a link); 409 when they are a member already. */
  inviteMember(body: InviteMemberRequest): Promise<Member>;
  /** Takes their access away; 403 for the owner. */
  removeMember(memberId: string): Promise<void>;
  /** Sozlamalar › Tarif: asks to change the project's plan; we change it by hand until billing exists. */
  requestPlan(projectId: string, body: PlanRequest): Promise<void>;
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
  getRunReport: (projectId, runId) => request(`/projects/${id(projectId)}/reports/${id(runId)}`),
  getReportSettings: (projectId) => request(`/projects/${id(projectId)}/report-settings`),
  updateReportSettings: (projectId, body) => send("PATCH", `/projects/${id(projectId)}/report-settings`, body),
  getActions: (projectId) => request(`/projects/${id(projectId)}/actions`),
  updateAction: (projectId, actionId, body) =>
    send("PATCH", `/projects/${id(projectId)}/actions/${id(actionId)}`, body),
  updateActions: (projectId, body) => send("PATCH", `/projects/${id(projectId)}/actions`, body),
  addContentAction: (projectId, body) => send("POST", `/projects/${id(projectId)}/actions`, body),
  createSnapshot: (body) => send("POST", "/snapshot", body),
  getSnapshot: (snapshotId) => request(`/snapshot/${id(snapshotId)}`),
  analyzeSite: (body) => send("POST", "/onboarding/analyze-site", body),
  suggestCompetitors: (body) => send("POST", "/onboarding/suggest-competitors", body),
  suggestPrompts: (body) => send("POST", "/onboarding/suggest-prompts", body),
  getRunProgress: (runId) => request(`/runs/${id(runId)}/progress`),
  createDemoRequest: (body) => send("POST", "/demo-requests", body),
  sendSupportMessage: (body) => send("POST", "/support-messages", body),
  updateMe: (body) => send("PATCH", "/auth/me", body),
  updateProject: (projectId, body) => send("PATCH", `/projects/${id(projectId)}`, body),
  updateCompetitor: (projectId, brandId, body) => send("PATCH", `/projects/${id(projectId)}/competitors/${id(brandId)}`, body),
  getFacts: (projectId) => request(`/projects/${id(projectId)}/facts`),
  updateFacts: (projectId, body) => send("PUT", `/projects/${id(projectId)}/facts`, body),
  suggestFacts: (projectId) => send("POST", `/projects/${id(projectId)}/facts/suggest`),
  getTags: (projectId) => request(`/projects/${id(projectId)}/tags`),
  createTags: (projectId, body) => send("POST", `/projects/${id(projectId)}/tags`, body),
  renameTag: (projectId, tag, body) => send("PATCH", `/projects/${id(projectId)}/tags/${id(tag)}`, body),
  deleteTag: (projectId, tag) => send("DELETE", `/projects/${id(projectId)}/tags/${id(tag)}`),
  getMembers: () => request("/members"),
  inviteMember: (body) => send("POST", "/members", body),
  removeMember: (memberId) => send("DELETE", `/members/${id(memberId)}`),
  requestPlan: (projectId, body) => send("POST", `/projects/${id(projectId)}/plan-requests`, body),
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
      getRunReport: (projectId, runId) => mocks().then((m) => unwrap(m.getRunReport(projectId, runId))),
      getReportSettings: (projectId) => mocks().then((m) => unwrap(m.getReportSettings(projectId))),
      updateReportSettings: (projectId, body) => mocks().then((m) => unwrap(m.updateReportSettings(projectId, body))),
      getActions: (projectId) => mocks().then((m) => unwrap(m.getActions(projectId))),
      updateAction: (projectId, actionId, body) =>
        mocks().then((m) => unwrap(m.updateAction(projectId, actionId, body))),
      updateActions: (projectId, body) => mocks().then((m) => unwrap(m.updateActions(projectId, body))),
      addContentAction: (projectId, body) => mocks().then((m) => unwrap(m.addContentAction(projectId, body))),
      createSnapshot: (body) => mocks().then((m) => unwrap(m.createSnapshot(body))),
      getSnapshot: (snapshotId) => mocks().then((m) => unwrap(m.getSnapshot(snapshotId))),
      analyzeSite: (body) => mocks().then((m) => unwrap(m.analyzeSite(body))),
      suggestCompetitors: (body) => mocks().then((m) => unwrap(m.suggestCompetitors(body))),
      suggestPrompts: (body) => mocks().then((m) => unwrap(m.suggestPrompts(body))),
      getRunProgress: (runId) => mocks().then((m) => unwrap(m.getRunProgress(runId))),
      createDemoRequest: (body) => mocks().then((m) => unwrap(m.createDemoRequest(body))),
      sendSupportMessage: (body) => mocks().then((m) => unwrap(m.sendSupportMessage(body))),
      updateMe: (body) => mocks().then((m) => unwrap(m.updateMe(body))),
      updateProject: (projectId, body) => mocks().then((m) => unwrap(m.updateProject(projectId, body))),
      updateCompetitor: (projectId, brandId, body) => mocks().then((m) => unwrap(m.updateCompetitor(projectId, brandId, body))),
      getFacts: (projectId) => mocks().then((m) => unwrap(m.getFacts(projectId))),
      updateFacts: (projectId, body) => mocks().then((m) => unwrap(m.updateFacts(projectId, body))),
      suggestFacts: (projectId) => mocks().then((m) => unwrap(m.suggestFacts(projectId))),
      getTags: (projectId) => mocks().then((m) => unwrap(m.getTags(projectId))),
      createTags: (projectId, body) => mocks().then((m) => unwrap(m.createTags(projectId, body))),
      renameTag: (projectId, tag, body) => mocks().then((m) => unwrap(m.renameTag(projectId, tag, body))),
      deleteTag: (projectId, tag) => mocks().then((m) => unwrap(m.deleteTag(projectId, tag))),
      getMembers: () => mocks().then((m) => unwrap(m.getMembers())),
      inviteMember: (body) => mocks().then((m) => unwrap(m.inviteMember(body))),
      removeMember: (memberId) => mocks().then((m) => unwrap(m.removeMember(memberId))),
      requestPlan: (projectId, body) => mocks().then((m) => unwrap(m.requestPlan(projectId, body))),
    }
  : httpApi;
