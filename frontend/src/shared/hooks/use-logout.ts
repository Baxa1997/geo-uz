"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@/i18n/navigation";
import { api } from "@/shared/api/client";

export function useLogout() {
  const router = useRouter();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.logout(),
    onSuccess: () => {
      // The next account must not see this one's cached projects
      queryClient.clear();
      router.replace("/login");
    },
  });
}
