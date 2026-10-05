const block = "animate-pulse rounded-xl bg-muted";

export default function Loading() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6 sm:gap-6 sm:py-10">
      <div className="flex flex-col gap-2">
        <div className={`${block} h-4 w-32`} />
        <div className={`${block} h-8 w-48`} />
        <div className={`${block} h-4 w-64`} />
      </div>
      <div className={`${block} h-72`} />
      <div className={`${block} h-48`} />
      <div className={`${block} h-64`} />
    </main>
  );
}
