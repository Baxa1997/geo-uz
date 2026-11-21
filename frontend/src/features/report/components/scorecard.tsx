import { useTranslations } from "next-intl";
import type { Report, WaveBrand, WaveMetrics } from "@/shared/types/api";
import { useCountWords } from "@/shared/hooks/use-count-words";
import { ReportCard, ReportTable, Share } from "./report-parts";

type Row = "visibility" | "coverage" | "shareOfVoice" | "sentiment" | "position" | "usedAsSource";

/**
 * The report's key figures for this check (report spec Phase 0 item 0.2: counts, no score): each number with
 * what it is counted over, the client's beside the strongest competitor's, every competitor that ties named
 * together. Share of voice waits for enough mentions, tone is counted per mention and is N/A when the client
 * isn't named, and a place in an answer is read only from numbered lists. What changed between checks is
 * section 3's; comparing matched answers over checks comes with the change log (spec §4.12, Phase 1).
 */
export function Scorecard({ report, metrics }: { report: Pick<Report, "project">; metrics: WaveMetrics }) {
  const t = useTranslations("Report.scorecard");
  const words = useCountWords();
  const seen = metrics.visibility;
  const { rows: brands, rivals_top: top } = metrics.brands;
  const client = brands.find((brand) => brand.own);
  const byId = (ids: string[]) => ids.flatMap((id) => brands.filter((brand) => brand.id === id));
  const shown = metrics.brands.share_of_voice.shown;
  // A brand's share of voice beside its count, or why there is none yet
  const voice = (id: string) => {
    const value = metrics.brands.share_of_voice.shares?.[id];
    return value ? <Share k={value.k} n={value.n} /> : words.shareOfVoice(metrics.brands, id);
  };

  // The strongest competitors on a count: their names, and the count they share
  const strongest = (ids: string[], value: React.ReactNode) =>
    ids.length === 0 ? (
      <span className="text-muted-foreground">—</span>
    ) : (
      <>
        <span className="block">{value}</span>
        <span className="block text-xs text-pretty text-muted-foreground">
          {words.names(byId(ids).map((brand) => brand.name))}
          {ids.length > 1 && ` · ${t("tied")}`}
        </span>
      </>
    );
  // Tone and place: each of the most named competitors with its own
  const each = (show: (brand: WaveBrand) => string) =>
    top.named.ids.length === 0 ? (
      <span className="text-muted-foreground">—</span>
    ) : (
      <ul className="flex flex-col gap-0.5">
        {byId(top.named.ids).map((brand) => (
          <li key={brand.id}>
            <span className="block">{show(brand)}</span>
            <span className="block text-xs text-muted-foreground">{brand.name}</span>
          </li>
        ))}
      </ul>
    );

  const rows: { row: Row; you: React.ReactNode; rival: React.ReactNode }[] = [
    {
      row: "visibility",
      you: <Share k={seen.named} n={seen.answers} text={words.count(seen.named, seen.answers)} />,
      rival: strongest(top.named.ids, <Share k={top.named.value} n={seen.answers} text={words.count(top.named.value, seen.answers)} />),
    },
    {
      row: "coverage",
      you: <Share k={seen.prompts_named} n={seen.prompts} text={words.count(seen.prompts_named, seen.prompts)} />,
      rival: strongest(top.prompts_named.ids, <Share k={top.prompts_named.value} n={seen.prompts} text={words.count(top.prompts_named.value, seen.prompts)} />),
    },
    {
      row: "shareOfVoice",
      you: <span data-metric="share_of_voice">{client ? voice(client.id) : words.na}</span>,
      rival: shown ? strongest(top.mentions.ids, voice(top.mentions.ids[0] ?? "")) : <span className="text-muted-foreground">—</span>,
    },
    { row: "sentiment", you: client ? words.tone(client) : words.na, rival: each(words.tone) },
    { row: "position", you: client ? words.position(client) : words.na, rival: each(words.position) },
    {
      row: "usedAsSource",
      you: seen.cited_answers > 0 ? <Share k={seen.client_cited} n={seen.cited_answers} text={words.count(seen.client_cited, seen.cited_answers)} /> : words.na,
      rival: seen.cited_answers > 0 ? strongest(top.cited.ids, <Share k={top.cited.value} n={seen.cited_answers} text={words.count(top.cited.value, seen.cited_answers)} />) : <span className="text-muted-foreground">—</span>,
    },
  ];

  return (
    // The columns follow the sheet's own width, not the screen's: beside the contents, and on paper
    <ReportCard className="@container print:break-inside-avoid">
      <ReportTable
        head={
          <>
            <th scope="col">{t("metric")}</th>
            <th scope="col" className="w-[38%] @lg:w-[30%]">
              {t("you", { brand: report.project.brand.name })}
            </th>
            <th scope="col" className="w-[30%] @lg:w-[28%]">
              {t("best")}
            </th>
          </>
        }
      >
        {rows.map(({ row, you, rival }) => (
          <tr key={row} className="align-top">
            <th scope="row" className="text-left font-normal">
              <span className="block font-medium">{t(`labels.${row}`)}</span>
              <span className="block text-xs text-pretty text-muted-foreground">{t(`about.${row}`, { minimum: metrics.brands.share_of_voice.minimum })}</span>
            </th>
            <td className="font-semibold text-pretty">{you}</td>
            <td className="text-pretty">{rival}</td>
          </tr>
        ))}
      </ReportTable>
    </ReportCard>
  );
}
