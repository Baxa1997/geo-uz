"use client";

import { useMessages, useTranslations } from "next-intl";
import { labelFor } from "@/shared/helpers/labels";
import { cn } from "@/shared/helpers/utils";
import { CITY_POINTS, MAP_HEIGHT, MAP_WIDTH, NEIGHBOURS, UZBEKISTAN } from "../constants/map";

/**
 * Where the brand operates, as Peec's target-markets map: the countries around in gray, Uzbekistan in the
 * client's blue, and the cities the questions can be asked from as marks. The city chosen is a large dark
 * mark with its name; a click on another city chooses it (`onChoose`), so the map is the choice as well as
 * its picture. The cities are buttons laid over the drawing, for the keyboard and a screen reader.
 */
export function MarketMap({ city, onChoose, large = false }: { city: string; onChoose: (city: string) => void; large?: boolean }) {
  const t = useTranslations("Settings.profile");
  const messages = useMessages();
  const name = (key: string) => labelFor(messages.Cities, key);

  return (
    <div className={cn("relative overflow-hidden rounded-2xl bg-sky-50 ring-1 ring-foreground/10 dark:bg-sky-950/30", large ? "aspect-[749/436]" : "aspect-[749/400]")}>
      <svg viewBox={`0 ${large ? 0 : 18} ${MAP_WIDTH} ${large ? MAP_HEIGHT : 400}`} preserveAspectRatio="xMidYMid slice" aria-hidden className="absolute inset-0 size-full">
        {NEIGHBOURS.map((path, index) => (
          <path key={index} d={path} fill="var(--muted)" stroke="var(--card)" strokeWidth="1.5" strokeLinejoin="round" />
        ))}
        <path d={UZBEKISTAN} fill="color-mix(in oklab, var(--you) 78%, white)" stroke="var(--card)" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
      <ul aria-label={t("mapCities")} className="absolute inset-0">
        {Object.entries(CITY_POINTS).map(([key, point]) => {
          const chosen = key === city;
          // The drawing is cut to 400 of its 436 units high when small, 18 off the top
          const top = large ? point.y / MAP_HEIGHT : (point.y - 18) / 400;
          return (
            <li key={key} className="absolute" style={{ left: `${(point.x / MAP_WIDTH) * 100}%`, top: `${top * 100}%` }}>
              <button
                type="button"
                aria-pressed={chosen}
                onClick={() => onChoose(key)}
                className="group absolute flex -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/60"
              >
                <span
                  aria-hidden
                  className={cn(
                    "block shrink-0 rounded-full ring-2 ring-white transition-transform group-hover:scale-125",
                    chosen ? "size-3.5 bg-foreground" : "size-2.5 bg-white/90 ring-foreground/40",
                  )}
                />
                <span
                  className={cn(
                    "absolute top-1/2 left-full ml-1.5 -translate-y-1/2 rounded-md px-1.5 py-0.5 text-xs whitespace-nowrap",
                    chosen ? "bg-foreground font-medium text-background" : "bg-white/80 text-foreground/80 group-hover:bg-white",
                    // Namangan, Andijan and Fergana sit close together: Namangan's name goes above, Fergana's below
                    key === "namangan" && "-translate-y-[130%]",
                    key === "fergana" && "translate-y-[35%]",
                  )}
                >
                  {name(key)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
