"use server";

// Mock-only bridge: lets browser code reach the mock data that lives on the
// Next.js server. With NEXT_PUBLIC_USE_MOCKS=false this file is never used.
import { ApiError, type ApiClient, type MockResult } from "@/shared/api/client";
import type {
  AddCompetitorRequest,
  AddContentActionRequest,
  AnalyzeSiteRequest,
  ArchivePromptRequest,
  CreateProjectRequest,
  CreatePromptsRequest,
  DiscoverPromptsRequest,
  DemoRequest,
  DismissBrandRequest,
  ImportKeywordsRequest,
  ReportFilters,
  ReportPeriod,
  UpdateReportSettingsRequest,
  SendCodeRequest,
  SnapshotRequest,
  SuggestCompetitorsRequest,
  SuggestionIdsRequest,
  SuggestMoreRequest,
  SuggestPromptsRequest,
  SupportMessage,
  TelegramAuthRequest,
  TopicRequest,
  UpdateActionRequest,
  UpdateActionsRequest,
  UpdatePromptRequest,
  UpdatePromptsRequest,
  VerifyCodeRequest,
} from "@/shared/types/api";
import { mockApi } from "./api";

async function run<T>(call: (api: ApiClient) => Promise<T>): Promise<MockResult<T>> {
  try {
    return { ok: true, data: await call(mockApi) };
  } catch (error) {
    if (error instanceof ApiError) return { ok: false, status: error.status, message: error.message };
    throw error;
  }
}

export async function sendCode(body: SendCodeRequest) {
  return run((m) => m.sendCode(body));
}

export async function verifyCode(body: VerifyCodeRequest) {
  return run((m) => m.verifyCode(body));
}

export async function loginWithTelegram(body: TelegramAuthRequest) {
  return run((m) => m.loginWithTelegram(body));
}

export async function getMe() {
  return run((m) => m.getMe());
}

export async function logout() {
  return run((m) => m.logout());
}

export async function getProjects() {
  return run((m) => m.getProjects());
}

export async function createProject(body: CreateProjectRequest) {
  return run((m) => m.createProject(body));
}

export async function getProject(id: string) {
  return run((m) => m.getProject(id));
}

export async function addCompetitor(projectId: string, body: AddCompetitorRequest) {
  return run((m) => m.addCompetitor(projectId, body));
}

export async function removeCompetitor(projectId: string, brandId: string) {
  return run((m) => m.removeCompetitor(projectId, brandId));
}

export async function dismissBrand(projectId: string, body: DismissBrandRequest) {
  return run((m) => m.dismissBrand(projectId, body));
}

export async function getPrompts(projectId: string) {
  return run((m) => m.getPrompts(projectId));
}

export async function createPrompts(projectId: string, body: CreatePromptsRequest) {
  return run((m) => m.createPrompts(projectId, body));
}

export async function updatePrompt(projectId: string, promptId: string, body: UpdatePromptRequest) {
  return run((m) => m.updatePrompt(projectId, promptId, body));
}

export async function archivePrompt(projectId: string, promptId: string, body: ArchivePromptRequest) {
  return run((m) => m.archivePrompt(projectId, promptId, body));
}

export async function updatePrompts(projectId: string, body: UpdatePromptsRequest) {
  return run((m) => m.updatePrompts(projectId, body));
}

export async function getTopics(projectId: string) {
  return run((m) => m.getTopics(projectId));
}

export async function createTopic(projectId: string, body: TopicRequest) {
  return run((m) => m.createTopic(projectId, body));
}

export async function renameTopic(projectId: string, topic: string, body: TopicRequest) {
  return run((m) => m.renameTopic(projectId, topic, body));
}

export async function deleteTopic(projectId: string, topic: string) {
  return run((m) => m.deleteTopic(projectId, topic));
}

export async function getPromptReport(projectId: string, promptId: string) {
  return run((m) => m.getPromptReport(projectId, promptId));
}

export async function getPromptSuggestions(projectId: string) {
  return run((m) => m.getPromptSuggestions(projectId));
}

export async function acceptPromptSuggestions(projectId: string, body: SuggestionIdsRequest) {
  return run((m) => m.acceptPromptSuggestions(projectId, body));
}

export async function rejectPromptSuggestions(projectId: string, body: SuggestionIdsRequest) {
  return run((m) => m.rejectPromptSuggestions(projectId, body));
}

export async function suggestMorePrompts(projectId: string, body: SuggestMoreRequest) {
  return run((m) => m.suggestMorePrompts(projectId, body));
}

export async function discoverPrompts(projectId: string, body: DiscoverPromptsRequest) {
  return run((m) => m.discoverPrompts(projectId, body));
}

export async function importKeywords(projectId: string, body: ImportKeywordsRequest) {
  return run((m) => m.importKeywords(projectId, body));
}

export async function getReport(projectId: string, period?: ReportPeriod, filters?: ReportFilters) {
  return run((m) => m.getReport(projectId, period, filters));
}

export async function getRunReport(projectId: string, runId: string) {
  return run((m) => m.getRunReport(projectId, runId));
}

export async function getReportSettings(projectId: string) {
  return run((m) => m.getReportSettings(projectId));
}

export async function updateReportSettings(projectId: string, body: UpdateReportSettingsRequest) {
  return run((m) => m.updateReportSettings(projectId, body));
}

export async function getActions(projectId: string) {
  return run((m) => m.getActions(projectId));
}

export async function updateAction(projectId: string, actionId: string, body: UpdateActionRequest) {
  return run((m) => m.updateAction(projectId, actionId, body));
}

export async function updateActions(projectId: string, body: UpdateActionsRequest) {
  return run((m) => m.updateActions(projectId, body));
}

export async function addContentAction(projectId: string, body: AddContentActionRequest) {
  return run((m) => m.addContentAction(projectId, body));
}

export async function createSnapshot(body: SnapshotRequest) {
  return run((m) => m.createSnapshot(body));
}

export async function getSnapshot(id: string) {
  return run((m) => m.getSnapshot(id));
}

export async function analyzeSite(body: AnalyzeSiteRequest) {
  return run((m) => m.analyzeSite(body));
}

export async function suggestCompetitors(body: SuggestCompetitorsRequest) {
  return run((m) => m.suggestCompetitors(body));
}

export async function suggestPrompts(body: SuggestPromptsRequest) {
  return run((m) => m.suggestPrompts(body));
}

export async function getRunProgress(id: string) {
  return run((m) => m.getRunProgress(id));
}

export async function createDemoRequest(body: DemoRequest) {
  return run((m) => m.createDemoRequest(body));
}

export async function sendSupportMessage(body: SupportMessage) {
  return run((m) => m.sendSupportMessage(body));
}
