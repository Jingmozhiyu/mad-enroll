export default function MonitorLoading() {
  return (
    <div className="grid gap-6">
      <section className="glass-card px-6 py-8 md:px-8 md:py-9">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="h-20 rounded-[24px] bg-white/65" />
          <div className="h-24 rounded-[24px] bg-white/65" />
        </div>
      </section>
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="h-52 rounded-[28px] bg-white/65" />
        <div className="h-52 rounded-[28px] bg-white/65" />
      </section>
    </div>
  )
}
