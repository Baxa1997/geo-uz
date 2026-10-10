import { CircleAlert, Globe, PenLine, Wrench, type LucideIcon } from "lucide-react";
import { useMessages, useTranslations } from "next-intl";
import { labelFor } from "@/shared/helpers/labels";
import type { Action, ActionKind, SourceType } from "@/shared/types/api";

export const ACTION_KIND_ICONS: Record<ActionKind, LucideIcon> = {
  listing: Globe,
  fact: CircleAlert,
  content: PenLine,
  technical: Wrench,
};

/** A business can't "get listed" on its own or a competitor's site; those read as any other site. */
export const listingKind = (type: SourceType) => (type === "directory" || type === "news" || type === "social" ? type : "other");

/** The action's title in the interface language: the backend sends what to do, the words are ours. */
export function useActionTitle() {
  const t = useTranslations("Actions.titles");
  const messages = useMessages();
  return (action: Action): string => {
    switch (action.kind) {
      case "listing":
        return t(listingKind(action.sourceType), { domain: action.domain });
      case "fact":
        return t("fact");
      case "content":
        // A page the client added ("Add a page") is reworked, not written
        return t(action.url !== null || action.pageType !== null ? "rework" : "content", { topic: labelFor(messages.Topics, action.topic) });
      case "technical":
        return t(action.check);
    }
  };
}

export function ActionTitle({ action }: { action: Action }) {
  return useActionTitle()(action);
}
