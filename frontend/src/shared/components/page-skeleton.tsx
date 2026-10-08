const block = "animate-pulse rounded-xl bg-muted";

/** Loading state inside the workspace panel: the title bar, the filters' strip, then content blocks. */
export function PageSkeleton() {
  return (
    <>
      <div className="flex h-12 shrink-0 items-center border-b px-4 sm:px-6">
        <div className={`${block} h-5 w-40`} />
      </div>
      <div className="flex h-12 shrink-0 items-center gap-2 border-b px-4 sm:px-6">
        <div className={`${block} h-8 w-32 rounded-lg`} />
        <div className={`${block} h-8 w-32 rounded-lg`} />
      </div>
      <div className="flex w-full flex-col gap-4 p-4 sm:gap-5 sm:p-6">
        <div className={`${block} h-28`} />
        <div className={`${block} h-64`} />
        <div className={`${block} h-48`} />
      </div>
    </>
  );
}
