import { CircleNotchIcon as CircleNotch } from "@phosphor-icons/react/dist/ssr/CircleNotch";
import { useLocale, useTranslations } from "next-intl";
import type { AdminRunningCheck, AdminWaitingCheck } from "@/shared/types/api";
import { formatDateTime } from "../helpers/format";
import { AdminTable, Empty, TeamMark, Td, Th } from "./admin-table";
import { ApproveButton } from "./approve-button";

/** The free checks in the queue, in order, each with Approve. */
export function WaitingTable({ rows, usd }: { rows: AdminWaitingCheck[]; usd: string }) {
  const t = useTranslations("Admin.waiting");
  const locale = useLocale();
  if (rows.length === 0) return <Empty>{t("empty")}</Empty>;
  return (
    <AdminTable
      label={t("title")}
      wide
      head={
        <>
          <Th>{t("place")}</Th>
          <Th>{t("website")}</Th>
          <Th>{t("account")}</Th>
          <Th>{t("since")}</Th>
          <Th>{t("questions")}</Th>
          <Th>
            <span className="sr-only">{t("approve")}</span>
          </Th>
        </>
      }
    >
      {rows.map((row) => (
        <tr key={row.id}>
          <Td className="tabular-nums">{row.place}</Td>
          <Td>
            <div className="font-medium">{row.domain}</div>
            {row.name && <div className="text-xs text-muted-foreground">{row.name}</div>}
          </Td>
          <Td className="whitespace-nowrap">
            {row.email ?? "—"}
            {row.team && <TeamMark label={t("team")} />}
            <div className="text-xs text-muted-foreground">{t("emailIn", { language: t(`languages.${row.language}`) })}</div>
          </Td>
          <Td className="whitespace-nowrap">{formatDateTime(row.since, locale)}</Td>
          <Td className="tabular-nums">{row.questions}</Td>
          <Td className="text-right">
            <ApproveButton runId={row.id} usd={usd} />
          </Td>
        </tr>
      ))}
    </AdminTable>
  );
}

/** The free checks being asked now, with their answers so far. */
export function RunningList({ rows }: { rows: AdminRunningCheck[] }) {
  const t = useTranslations("Admin.waiting");
  const locale = useLocale();
  if (rows.length === 0) return <Empty>{t("runningEmpty")}</Empty>;
  return (
    <ul className="flex flex-col divide-y rounded-xl border bg-card">
      {rows.map((row) => (
        <li key={row.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-sm">
          <span className="font-medium">{row.domain}</span>
          <span className="text-muted-foreground">{row.email ?? "—"}</span>
          <span className="text-xs text-muted-foreground">{t("startedAt", { date: formatDateTime(row.since, locale) })}</span>
          <span className="ml-auto inline-flex items-center gap-2 whitespace-nowrap">
            <CircleNotch aria-hidden className="size-4 animate-spin text-brand motion-reduce:animate-none" />
            {t(`status.${row.status}`)}
            {/* The total is known once the check has planned its answers */}
            {row.total > 0 && ` · ${t("progress", { answered: row.answered, total: row.total })}`}
          </span>
        </li>
      ))}
    </ul>
  );
}
