export default function SearchLoading() {
  return (
    <section className="px-2 py-6 md:px-4 md:py-8">
      <div className="grid gap-8 xl:grid-cols-[minmax(280px,0.33fr)_minmax(0,0.67fr)]">
        <section className="grid gap-4">
          <div className="h-11 rounded-[18px] bg-white/70" />
          <div className="h-16 rounded-[22px] bg-white/60" />
          <div className="h-16 rounded-[22px] bg-white/60" />
          <div className="h-11 rounded-[18px] bg-white/70" />
        </section>
        <section className="grid gap-3">
          <div className="h-8 w-40 rounded-[12px] bg-white/65" />
          <div className="h-28 rounded-[28px] bg-white/70" />
          <div className="h-28 rounded-[28px] bg-white/70" />
          <div className="h-28 rounded-[28px] bg-white/70" />
        </section>
      </div>
    </section>
  )
}
