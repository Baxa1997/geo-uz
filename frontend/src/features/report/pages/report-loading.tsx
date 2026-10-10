/** The shared report while it loads: the gray ground and the paper with its first lines. */
export default function Loading() {
  const line = "animate-pulse rounded-[3px] bg-muted";
  return (
    <div className="min-h-svh bg-muted/60">
      <main className="flex w-full flex-col gap-3 px-3 py-4 sm:px-4 sm:py-6">
        <div className="mx-auto flex w-full max-w-224 flex-col gap-6 rounded-xs bg-card px-4 py-5 shadow-sm ring-1 ring-foreground/15 sm:px-8 sm:py-7">
          <div className={`${line} h-10 w-40`} />
          <div className={`${line} mx-auto h-8 w-80 max-w-full`} />
          <div className={`${line} h-14`} />
          <div className={`${line} h-72`} />
          <div className={`${line} h-48`} />
        </div>
      </main>
    </div>
  );
}
