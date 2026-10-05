"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { api } from "@/shared/api/client";
import { queryKeys } from "@/shared/api/query-keys";
import type { Project } from "@/shared/types/api";

/** All projects (kept fresh by TanStack Query) and the one in the URL, if any. */
export function useProjects(initialProjects: Project[]) {
  const params = useParams<{ id?: string }>();
  const { data: projects } = useQuery({
    queryKey: queryKeys.projects(),
    queryFn: () => api.getProjects(),
    initialData: initialProjects,
  });
  return { projects, current: projects.find((project) => project.id === params.id) };
}
