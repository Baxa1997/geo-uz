import { cn } from "@/shared/helpers/utils";

/**
 * A brand's logo, as Peec shows one beside every brand: the image the backend keeps (Brand.logo), or the
 * brand's first letter on gray when it has none. Its name is beside it wherever it stands, so the mark is
 * hidden from screen readers.
 */
export function BrandLogo({ name, logo, className }: { name: string; logo?: string | null; className?: string }) {
  if (logo) {
    return (
      // A small image of ours, from any brand's site: next/image would need every host listed
      // eslint-disable-next-line @next/next/no-img-element
      <img src={logo} alt="" aria-hidden width={20} height={20} loading="lazy" className={cn("size-5 shrink-0 rounded-md object-contain", className)} />
    );
  }
  return (
    <span aria-hidden className={cn("flex size-5 shrink-0 items-center justify-center rounded-md bg-muted text-[0.625rem] font-semibold text-muted-foreground uppercase", className)}>
      {name.trim().charAt(0)}
    </span>
  );
}
