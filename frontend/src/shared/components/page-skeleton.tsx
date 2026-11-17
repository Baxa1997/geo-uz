import { useTranslations } from "next-intl";
import { cn } from "@/shared/helpers/utils";

/** A gray block with a light passing over it (the `skeleton` utility in globals.css). */
function Bone({ className }: { className?: string }) {
  return <div aria-hidden className={cn("skeleton", className)} />;
}

/** A card of the page in outline, with its title's place and what it holds. */
function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("flex flex-col gap-4 rounded-xl border bg-card p-4 sm:p-5", className)}>{children}</div>;
}

/**
 * The workspace panel while a page loads, shaped like a data page so the page takes its place without a jump:
 * the breadcrumb bar, the filters' strip, the row of numbers, then a chart beside a table. It appears after a
 * beat (`animate-arrive`), so a page that comes quickly never flashes gray.
 */
export function PageSkeleton() {
  const t = useTranslations("Common");
  return (
    <div role="status" data-skeleton className="flex min-h-0 flex-1 animate-arrive flex-col">
      <span className="sr-only">{t("loading")}</span>
      <div className="flex h-12 shrink-0 items-center gap-2 border-b px-4 sm:px-6">
        <Bone className="h-4 w-24" />
        <Bone className="h-4 w-3 rounded-sm opacity-60" />
        <Bone className="h-4 w-36" />
      </div>
      <div className="flex h-12 shrink-0 items-center gap-2 border-b px-4 sm:px-6">
        <Bone className="h-8 w-28" />
        <Bone className="h-8 w-28" />
        <Bone className="ml-auto hidden h-8 w-36 sm:block" />
      </div>
      <div className="flex w-full flex-col gap-4 p-4 sm:gap-5 sm:p-6">
        <Bone className="h-5 w-full max-w-xl" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }, (_, index) => (
            <Card key={index} className={cn("gap-3", index > 1 && "hidden sm:flex", index > 2 && "sm:hidden lg:flex")}>
              <Bone className="h-3.5 w-20" />
              <Bone className="h-7 w-16" />
              <Bone className="h-3 w-12" />
            </Card>
          ))}
        </div>
        <div className="grid gap-4 sm:gap-5 xl:grid-cols-[3fr_2fr]">
          <Card>
            <div className="flex items-center justify-between gap-3">
              <Bone className="h-4 w-32" />
              <Bone className="h-7 w-40" />
            </div>
            {/* A chart's ground: four gridlines and a line rising across them */}
            <div className="relative h-56">
              {[0, 1, 2, 3].map((line) => (
                <div key={line} className="absolute inset-x-0 border-t border-dashed" style={{ top: `${line * 33}%` }} />
              ))}
              <Bone className="absolute inset-x-0 bottom-0 h-1/2 rounded-md opacity-70 [clip-path:polygon(0_80%,18%_62%,36%_70%,54%_38%,72%_46%,100%_12%,100%_100%,0_100%)]" />
            </div>
          </Card>
          <Card>
            <Bone className="h-4 w-28" />
            {Array.from({ length: 5 }, (_, index) => (
              <div key={index} className="flex items-center gap-3">
                <Bone className="size-7 shrink-0 rounded-full" />
                <Bone className="h-3.5 flex-1" />
                <Bone className="h-3.5 w-10" />
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}
