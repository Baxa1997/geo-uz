import { useTranslations } from "next-intl";
import { LogoMark, ROUNDS, Wordmark } from "@/shared/components/logo";
import { PANEL_POINTS } from "../constants";

/**
 * Navy panel beside the login form (desktop only), in the brand's gradient: the name, what the product does
 * in one line and three points, and the mark's two rounds drawn huge and faint behind them.
 */
export function AuthPanel() {
  const t = useTranslations("Login.panel");

  return (
    <div className="relative isolate flex w-full flex-col justify-between gap-16 overflow-hidden rounded-3xl bg-[linear-gradient(155deg,#0b1335_0%,#1c2e6e_52%,#3f63c8_100%)] p-10 text-white shadow-2xl xl:p-14">
      {/* The mark's two rounds, drawn huge and faint */}
      <svg aria-hidden viewBox="0 0 32 32" fill="#fff" fillOpacity="0.06" className="absolute -right-56 -bottom-40 -z-10 size-[40rem]">
        {ROUNDS.map((round) => (
          <circle key={round.cx} cx={round.cx} cy={round.cy} r={round.r} />
        ))}
      </svg>

      <div className="flex flex-col gap-10">
        <span className="flex items-center gap-2.5">
          <LogoMark className="size-8 text-white" />
          <Wordmark tone="dark" className="text-2xl" />
        </span>
        <p className="max-w-lg text-4xl/[1.1] font-semibold tracking-tight text-balance text-white/90 xl:text-5xl/[1.08]">
          {t("title")}
        </p>
      </div>

      <ul className="flex max-w-xl flex-col divide-y divide-white/10">
        {PANEL_POINTS.map((key) => (
          <li key={key} className="flex gap-3 py-5 first:pt-0 last:pb-0">
            <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-white/50" />
            <div className="flex flex-col gap-1">
              <p className="font-medium">{t(`items.${key}.title`)}</p>
              <p className="text-sm text-white/60">{t(`items.${key}.text`)}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
