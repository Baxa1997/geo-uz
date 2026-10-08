"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { UserMinus } from "lucide-react";
import { useTranslations } from "next-intl";
import { Hint } from "@/shared/components/hint";
import { Button } from "@/shared/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import { api } from "@/shared/api/client";
import { queryKeys } from "@/shared/api/query-keys";

/**
 * Stops tracking a competitor, from its card. Nothing is lost: the answers keep naming it, so it returns to
 * the brands ChatGPT names that aren't tracked, where one click tracks it again.
 */
export function UntrackButton({ projectId, brand }: { projectId: string; brand: { id: string; name: string } }) {
  const t = useTranslations("Competitors.untrack");
  const router = useRouter();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => api.removeCompetitor(projectId, brand.id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects() });
      router.refresh();
    },
  });

  return (
    <Hint text={mutation.isError ? t("failed") : t("hint")} described={false}>
      {() => (
        <Button variant="ghost" size="icon-sm" disabled={mutation.isPending} aria-label={t("label", { name: brand.name })} onClick={() => mutation.mutate()}>
          <UserMinus aria-hidden />
        </Button>
      )}
    </Hint>
  );
}
