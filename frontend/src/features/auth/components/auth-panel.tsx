import { useTranslations } from "next-intl";
import { PANEL_POINTS } from "../constants";

/** Dark panel beside the login form (desktop only): what the product does, in one line and three points. */
export function AuthPanel() {
  const t = useTranslations("Login.panel");

  return (
    <div className="relative isolate flex w-full flex-col justify-between gap-16 overflow-hidden rounded-3xl bg-[linear-gradient(160deg,#3d4046_0%,#1b1c20_38%,#0c0d0f_70%,#1c1e22_100%)] p-10 text-white shadow-2xl xl:p-14">
      {/* Charcoal, lighter toward the top-left, with a soft glow at the bottom */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[radial-gradient(55%_35%_at_65%_100%,rgb(255_255_255/0.09),transparent)]"
      />
      {/* The logo's lens, drawn huge and faint */}
      <svg
        aria-hidden
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.1"
        className="absolute -bottom-40 -left-32 -z-10 size-[38rem] text-white/[0.07]"
      >
        <circle cx="8.5" cy="8.5" r="5.5" />
        <path d="m12.5 12.5 4 4" strokeLinecap="round" />
      </svg>

      <p className="max-w-lg text-4xl/[1.1] font-semibold tracking-tight text-balance text-white/90 xl:text-5xl/[1.08]">
        {t("title")}
      </p>

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
