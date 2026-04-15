function SkeletonBlock({ className }: { className: string }) {
  return <div className={['skeleton-block', className].join(' ')} />
}

export function SearchResultsSkeleton() {
  return (
    <section className="grid gap-3">
      <article className="glass-card px-5 py-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0 flex-1">
            <SkeletonBlock className="h-7 w-3/5 rounded-[14px]" />
            <SkeletonBlock className="mt-3 h-4 w-4/5 rounded-[10px]" />
          </div>
          <div className="flex min-w-[180px] flex-col items-start gap-3 md:items-end">
            <SkeletonBlock className="h-4 w-28 rounded-[10px]" />
            <SkeletonBlock className="h-5 w-14 rounded-[10px]" />
          </div>
        </div>
      </article>

      <article className="glass-card px-5 py-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0 flex-1">
            <SkeletonBlock className="h-7 w-2/3 rounded-[14px]" />
            <SkeletonBlock className="mt-3 h-4 w-3/4 rounded-[10px]" />
          </div>
          <div className="flex min-w-[180px] flex-col items-start gap-3 md:items-end">
            <SkeletonBlock className="h-4 w-[7.5rem] rounded-[10px]" />
            <SkeletonBlock className="h-5 w-14 rounded-[10px]" />
          </div>
        </div>
      </article>

      <article className="glass-card px-5 py-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0 flex-1">
            <SkeletonBlock className="h-7 w-1/2 rounded-[14px]" />
            <SkeletonBlock className="mt-3 h-4 w-2/3 rounded-[10px]" />
          </div>
          <div className="flex min-w-[180px] flex-col items-start gap-3 md:items-end">
            <SkeletonBlock className="h-4 w-24 rounded-[10px]" />
            <SkeletonBlock className="h-5 w-14 rounded-[10px]" />
          </div>
        </div>
      </article>
    </section>
  )
}

export function SearchPageSkeleton() {
  return (
    <section className="page-fade-enter px-2 py-6 md:px-4 md:py-8">
      <div className="grid gap-8 xl:grid-cols-[minmax(280px,0.33fr)_minmax(0,0.67fr)]">
        <section className="glass-card h-fit px-5 py-5 md:px-6">
          <div className="grid gap-5">
            <div className="grid gap-2">
              <SkeletonBlock className="h-4 w-[4.5rem] rounded-[10px]" />
              <SkeletonBlock className="h-12 w-full rounded-[18px]" />
            </div>

            <div className="grid gap-2">
              <SkeletonBlock className="h-4 w-24 rounded-[10px]" />
              <SkeletonBlock className="h-12 w-full rounded-[18px]" />
              <div className="flex flex-wrap gap-2">
                <SkeletonBlock className="h-8 w-[4.5rem] rounded-full" />
                <SkeletonBlock className="h-8 w-24 rounded-full" />
              </div>
            </div>

            <div className="grid gap-2">
              <SkeletonBlock className="h-4 w-28 rounded-[10px]" />
              <SkeletonBlock className="h-12 w-full rounded-[18px]" />
              <div className="flex flex-wrap gap-2">
                <SkeletonBlock className="h-8 w-[5.5rem] rounded-full" />
              </div>
            </div>

            <div className="grid gap-2">
              <SkeletonBlock className="h-4 w-14 rounded-[10px]" />
              <SkeletonBlock className="h-12 w-full rounded-[18px]" />
            </div>

            <div className="flex justify-end gap-3 pt-1">
              <SkeletonBlock className="h-11 w-24 rounded-[18px]" />
              <SkeletonBlock className="h-11 w-24 rounded-[18px]" />
            </div>
          </div>
        </section>

        <section className="grid content-start gap-4">
          <div className="px-1">
            <SkeletonBlock className="h-9 w-36 rounded-[14px]" />
            <SkeletonBlock className="mt-4 h-4 w-44 rounded-[10px]" />
          </div>

          <SearchResultsSkeleton />

          <div className="flex gap-2 px-2 py-2">
            <SkeletonBlock className="h-10 w-10 rounded-[14px]" />
            <SkeletonBlock className="h-10 w-10 rounded-[14px]" />
            <SkeletonBlock className="h-10 w-10 rounded-[14px]" />
          </div>
        </section>
      </div>
    </section>
  )
}

export function MonitorPageSkeleton() {
  return (
    <div className="page-fade-enter grid gap-6">
      <section className="px-2 pb-1 md:px-4">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:items-center">
          <div className="flex flex-col gap-3">
            <SkeletonBlock className="h-10 w-52 rounded-[16px]" />
            <SkeletonBlock className="h-5 w-72 max-w-full rounded-[12px]" />
          </div>

          <div className="flex justify-center lg:-mt-3">
            <SkeletonBlock className="h-12 w-full min-w-[320px] max-w-[420px] rounded-[18px]" />
          </div>

          <div className="justify-self-stretch lg:justify-self-end">
            <div className="surface-panel-muted rounded-[24px] p-4">
              <SkeletonBlock className="h-5 w-40 rounded-[12px]" />
              <SkeletonBlock className="mt-3 h-4 w-[4.5rem] rounded-[10px]" />
            </div>
          </div>
        </div>

        <div className="skeleton-divider mt-6" />

        <div className="flex justify-center pt-4">
          <SkeletonBlock className="h-7 w-52 rounded-[14px]" />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <article
            key={index}
            className="glass-card flex h-full flex-col px-5 py-5"
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0 flex-1">
                <SkeletonBlock className="h-8 w-3/4 rounded-[14px]" />
                <SkeletonBlock className="mt-3 h-4 w-[5.5rem] rounded-[10px]" />
              </div>
              <SkeletonBlock className="h-8 w-24 rounded-full" />
            </div>

            <div className="surface-inner mt-5 grid gap-3 rounded-[24px] px-4 py-4">
              <SkeletonBlock className="h-5 w-full rounded-[12px]" />
              <SkeletonBlock className="h-5 w-11/12 rounded-[12px]" />
              <SkeletonBlock className="h-5 w-4/5 rounded-[12px]" />
            </div>

            <div className="mt-auto flex justify-end pt-4">
              <SkeletonBlock className="h-10 w-24 rounded-[14px]" />
            </div>
          </article>
        ))}
      </section>
    </div>
  )
}
