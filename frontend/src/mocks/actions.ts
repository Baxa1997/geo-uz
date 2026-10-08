"use server";

// Mock-only bridge: lets browser code reach the mock data that lives on the
// Next.js server. With NEXT_PUBLIC_USE_MOCKS=false this file is never used.
import { ApiError, type ApiClient, type MockResult } from "@/shared/api/client";
import type {
  AddCompetitorRequest,
  AnalyzeSiteRequest,
  ArchivePromptRequest,
  CreateProjectRequest,
  CreatePromptRequest,
  DemoRequest,
  DismissBrandRequest,
  ReportFilters,
  ReportPeriod,
  SendCodeRequest,
  SnapshotRequest,
  SuggestCompetitorsRequest,
  SuggestPromptsRequest,
  SupportMessage,
  TelegramAuthRequest,
  UpdateActionRequest,
  UpdatePromptRequest,
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

export async function createPrompt(projectId: string, body: CreatePromptRequest) {
  return run((m) => m.createPrompt(projectId, body));
}

export async function updatePrompt(projectId: string, promptId: string, body: UpdatePromptRequest) {
  return run((m) => m.updatePrompt(projectId, promptId, body));
}

export async function archivePrompt(projectId: string, promptId: string, body: ArchivePromptRequest) {
  return run((m) => m.archivePrompt(projectId, promptId, body));
}

export async function getPromptReport(projectId: string, promptId: string) {
  return run((m) => m.getPromptReport(projectId, promptId));
}

export async function getPromptSuggestions(projectId: string) {
  return run((m) => m.getPromptSuggestions(projectId));
}

export async function acceptPromptSuggestion(projectId: string, suggestionId: string) {
  return run((m) => m.acceptPromptSuggestion(projectId, suggestionId));
}

export async function rejectPromptSuggestion(projectId: string, suggestionId: string) {
  return run((m) => m.rejectPromptSuggestion(projectId, suggestionId));
}

export async function getReport(projectId: string, period?: ReportPeriod, filters?: ReportFilters) {
  return run((m) => m.getReport(projectId, period, filters));
}

export async function getActions(projectId: string) {
  return run((m) => m.getActions(projectId));
}

export async function updateAction(projectId: string, actionId: string, body: UpdateActionRequest) {
  return run((m) => m.updateAction(projectId, actionId, body));
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
