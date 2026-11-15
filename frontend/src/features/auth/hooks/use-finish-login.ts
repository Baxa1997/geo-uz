"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@/i18n/navigation";
import { api, FIRST_RUN_LIVE } from "@/shared/api/client";
import { queryKeys } from "@/shared/api/query-keys";
import { afterLoginPath } from "../helpers/login-target";
import type { LoginTarget } from "../types";

/** After the session cookie is set: the first run or onboarding on first login, otherwise the page the user came for. */
export function useFinishLogin(target: LoginTarget) {
  const router = useRouter();
  const queryClient = useQueryClient();

  return async () => {
    // Nothing cached for a previous account may show up in this one
    queryClient.clear();
    const projects = await api.getProjects();
    queryClient.setQueryData(queryKeys.projects(), projects);
    // With the backend's first run live, an account that has never run one starts there: its website first
    // and one that ran it but never finished the setup goes on from that run's statistics
    if (FIRST_RUN_LIVE && !target.next && projects.length === 0) {
      const [latest] = await api.getFirstRuns();
      return router.replace(latest ? { pathname: "/onboarding/first-run", query: { run: latest.id } } : "/onboarding/first-run");
    }
    router.replace(afterLoginPath(projects.length > 0, target));
  };
}
