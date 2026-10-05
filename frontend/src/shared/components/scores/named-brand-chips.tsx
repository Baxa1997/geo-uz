import type { NamedBrand } from "@/shared/types/scores";
import { cn } from "@/shared/helpers/utils";
import { ToneIcon } from "./tone-icon";

/** Brands named in a prompt's answers, with one tone icon per answer that named them. */
export function NamedBrandChips({ named, youId }: { named: NamedBrand[]; youId: string }) {
  return (
    <span className="flex flex-wrap gap-1">
      {named.map(({ brand, tones }) => (
        <span
          key={brand.id}
          className={cn(
            "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs",
            brand.id === youId ? "bg-you-soft ring-1 ring-you/40" : "bg-muted",
          )}
        >
          {brand.name}
          <span className="inline-flex gap-px">
            {tones.map((tone, i) => (
              <ToneIcon key={i} tone={tone} />
            ))}
          </span>
        </span>
      ))}
    </span>
  );
}
