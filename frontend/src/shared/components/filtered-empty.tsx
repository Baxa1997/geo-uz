import { FilterX } from "lucide-react";
import { useTranslations } from "next-intl";
import { EmptyState } from "@/shared/components/empty-state";
import { buttonVariants } from "@/shared/components/ui/button";
import { Link } from "@/i18n/navigation";

/** The filters leave no answered question: say so, and offer the way back to everything. */
export function FilteredEmpty({ resetHref }: { resetHref: string }) {
  const t = useTranslations("Filters");

  return (
    <EmptyState icon={FilterX} title={t("emptyTitle")} text={t("emptyText")}>
      <Link href={resetHref} className={buttonVariants({ variant: "outline", size: "lg" })}>
        {t("reset")}
      </Link>
    </EmptyState>
  );
}
