const block = "animate-pulse rounded-xl bg-muted";

/** Loading state inside the workspace panel: the title bar, then content blocks. */
export function PageSkeleton() {
  return (
    <>
      <div className="flex h-14 shrink-0 items-center border-b px-4 sm:px-6">
        <div className={`${block} h-6 w-40`} />
      </div>
      <div className="flex w-full flex-col gap-4 p-4 sm:gap-5 sm:p-6">
        <div className={`${block} h-28`} />
        <div className={`${block} h-64`} />
        <div className={`${block} h-48`} />
      </div>
    </>
  );
}
