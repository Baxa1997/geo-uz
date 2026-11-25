import { ArrowSquareOutIcon as External } from "@phosphor-icons/react/dist/ssr/ArrowSquareOut";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { AdminProject } from "@/shared/types/api";
import { formatDateTime } from "../helpers/format";
import { AdminTable, Empty, TeamMark, Td, Th } from "./admin-table";

const LINK = "inline-flex items-center gap-1 text-brand underline-offset-2 hover:underline";

/** The brands registered: whose, the plan, the checks, the latest check's count, and their report and snapshot by link. */
export function ProjectsTable({ rows }: { rows: AdminProject[] }) {
  const t = useTranslations("Admin.projects");
  const locale = useLocale();
  if (rows.length === 0) return <Empty>{t("empty")}</Empty>;
  return (
    <AdminTable
      label={t("title")}
      wide
      head={
        <>
          <Th>{t("brand")}</Th>
          <Th>{t("owner")}</Th>
          <Th>{t("created")}</Th>
          <Th>{t("plan")}</Th>
          <Th>{t("checks")}</Th>
          <Th className="text-right">{t("named")}</Th>
          <Th>{t("links")}</Th>
        </>
      }
    >
      {rows.map((row) => (
        <tr key={row.id}>
          <Td>
            <div className="font-medium">{row.name || row.domain}</div>
            <div className="text-xs text-muted-foreground">{row.domain}</div>
          </Td>
          <Td className="whitespace-nowrap">
            {row.owner ?? "—"}
            {row.team && <TeamMark label={t("team")} />}
          </Td>
          <Td className="whitespace-nowrap">{formatDateTime(row.createdAt, locale)}</Td>
          <Td className="whitespace-nowrap">
            {t(`plans.${row.plan}`)} · {row.paid ? t("paid") : t("trial")}
          </Td>
          <Td className="whitespace-nowrap">
            <span className="tabular-nums">{row.checks}</span>
            <div className="text-xs text-muted-foreground">{row.latestCheckAt ? t("latest", { date: formatDateTime(row.latestCheckAt, locale) }) : t("noCheck")}</div>
          </Td>
          <Td className="text-right whitespace-nowrap tabular-nums">{row.answers > 0 ? t("namedValue", { named: row.named, answers: row.answers }) : "—"}</Td>
          <Td>
            <div className="flex flex-col gap-1 whitespace-nowrap">
              {row.checks > 0 && (
                <Link href={`/projects/${row.id}/report`} prefetch={false} target="_blank" className={LINK}>
                  {t("report")}
                  <External aria-hidden className="size-3.5" />
                </Link>
              )}
              {row.firstRunId && (
                <Link href={`/snapshot/${row.firstRunId}`} prefetch={false} target="_blank" className={LINK}>
                  {t("snapshot")}
                  <External aria-hidden className="size-3.5" />
                </Link>
              )}
            </div>
          </Td>
        </tr>
      ))}
    </AdminTable>
  );
}
