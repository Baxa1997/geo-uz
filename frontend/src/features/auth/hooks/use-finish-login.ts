"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@/i18n/navigation";
import { api } from "@/shared/api/client";
import { queryKeys } from "@/shared/api/query-keys";
import { afterLoginPath } from "../helpers/login-target";
import type { LoginTarget } from "../types";

/** After the session cookie is set: onboarding on first login, otherwise the page the user came for. */
export function useFinishLogin(target: LoginTarget) {
  const router = useRouter();
  const queryClient = useQueryClient();

  return async () => {
    // Nothing cached for a previous account may show up in this one
    queryClient.clear();
    const projects = await api.getProjects();
    queryClient.setQueryData(queryKeys.projects(), projects);
    router.replace(afterLoginPath(projects.length > 0, target));
  };
}
