"use client";

import { useFormatter, useTranslations } from "next-intl";
import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import type { Brand, BrandScore } from "@/shared/types/api";

interface Row {
  name: string;
  value: number;
  label: string;
  isYou: boolean;
}

const ROW_HEIGHT = 40;

/** Emphasis bar chart: the client's bar in the accent color, competitors in gray. */
export function ShareOfVoiceChart({
  brands,
  scores,
  youId,
}: {
  brands: Brand[];
  scores: BrandScore[];
  youId: string;
}) {
  const t = useTranslations("ShareOfVoice");
  const format = useFormatter();

  const rows: Row[] = brands
    .flatMap((brand) => {
      const score = scores.find((s) => s.brandId === brand.id);
      if (!score) return [];
      const isYou = brand.id === youId;
      return [
        {
          name: isYou ? t("you", { name: brand.name }) : brand.name,
          value: score.shareOfVoice,
          label: format.number(score.shareOfVoice, { style: "percent", maximumFractionDigits: 0 }),
          isYou,
        },
      ];
    })
    .sort((a, b) => b.value - a.value);

  const labelWidth = Math.min(160, Math.max(...rows.map((row) => row.name.length)) * 8 + 8);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div aria-hidden>
          <ResponsiveContainer width="100%" height={rows.length * ROW_HEIGHT + 8}>
            <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 44, bottom: 4, left: 0 }}>
              <XAxis type="number" hide domain={[0, "dataMax"]} />
              <YAxis
                type="category"
                dataKey="name"
                width={labelWidth}
                tickLine={false}
                axisLine={{ stroke: "var(--color-border)" }}
                tick={{ fill: "var(--color-foreground)", fontSize: 12 }}
              />
              <Tooltip
                cursor={{ fill: "var(--color-muted)" }}
                content={({ active, payload }) => {
                  const row = payload?.[0]?.payload as Row | undefined;
                  if (!active || !row) return null;
                  return (
                    <div className="rounded-md border bg-popover px-2.5 py-1.5 text-xs text-popover-foreground shadow-sm">
                      <span className="font-medium">{row.name}</span>: {row.label}
                    </div>
                  );
                }}
              />
              <Bar dataKey="value" barSize={20} radius={[0, 4, 4, 0]} isAnimationActive={false}>
                {rows.map((row) => (
                  <Cell key={row.name} fill={row.isYou ? "var(--color-you)" : "var(--color-rival)"} />
                ))}
                <LabelList dataKey="label" position="right" fill="var(--color-foreground)" fontSize={12} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Text twin of the chart for screen readers */}
        <table className="sr-only">
          <caption>{t("title")}</caption>
          <thead>
            <tr>
              <th scope="col">{t("brand")}</th>
              <th scope="col">{t("share")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.name}>
                <th scope="row">{row.name}</th>
                <td>{row.label}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
