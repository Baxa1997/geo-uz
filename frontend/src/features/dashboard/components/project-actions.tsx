"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PencilSimpleIcon as Pencil } from "@phosphor-icons/react/dist/ssr/PencilSimple";
import { TrashIcon as Trash } from "@phosphor-icons/react/dist/ssr/Trash";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Hint } from "@/shared/components/hint";
import { ConfirmModal } from "@/shared/components/modal";
import { Button, buttonVariants } from "@/shared/components/ui/button";
import { Link, useRouter } from "@/i18n/navigation";
import { api } from "@/shared/api/client";
import { queryKeys } from "@/shared/api/query-keys";

/**
 * A project card's two buttons (the user, 16 Nov 2026): edit opens the project's profile in Sozlamalar,
 * delete asks first and then removes the project with its checks and answers.
 */
export function ProjectActions({ projectId, name }: { projectId: string; name: string }) {
  const t = useTranslations("Dashboard");
  const router = useRouter();
  const queryClient = useQueryClient();
  const [asking, setAsking] = useState(false);
  const remove = useMutation({
    mutationFn: () => api.deleteProject(projectId),
    onSuccess: async () => {
      setAsking(false);
      // The sidebar's list and this page both drop it
      await queryClient.invalidateQueries({ queryKey: queryKeys.projects() });
      router.refresh();
    },
  });

  return (
    // Above the card's own link, which covers the whole card
    <div className="relative z-10 flex shrink-0 items-center gap-0.5">
      <Hint text={t("edit")} described={false}>
        {() => (
          <Link href={`/projects/${projectId}/settings`} aria-label={t("editLabel", { name })} className={buttonVariants({ variant: "ghost", size: "icon-sm" })}>
            <Pencil aria-hidden />
          </Link>
        )}
      </Hint>
      <Hint text={t("delete")} described={false}>
        {() => (
          <Button variant="ghost" size="icon-sm" aria-label={t("deleteLabel", { name })} className="hover:bg-destructive/10 hover:text-destructive" onClick={() => setAsking(true)}>
            <Trash aria-hidden />
          </Button>
        )}
      </Hint>
      <ConfirmModal
        open={asking}
        onOpenChange={(open) => !remove.isPending && setAsking(open)}
        title={t("deleteTitle", { name })}
        description={remove.isError ? t("deleteFailed") : t("deleteText")}
        confirm={t("deleteConfirm")}
        cancel={t("cancel")}
        danger
        pending={remove.isPending}
        onConfirm={() => remove.mutate()}
      />
    </div>
  );
}
