export default function CourseLoading() {
  return (
    <div className="grid gap-4 px-1">
      <div className="surface-panel-muted h-16 rounded-[24px]" />
      <div className="accent-divider h-px w-full" />
      <div className="grid gap-6 xl:grid-cols-[minmax(260px,0.33fr)_minmax(0,0.67fr)]">
        <div className="surface-panel-muted h-44 rounded-[28px]" />
        <div className="surface-panel-muted h-[340px] rounded-[28px]" />
      </div>
      <div className="accent-divider h-px w-full" />
      <div className="surface-panel-muted h-[330px] rounded-[28px]" />
    </div>
  )
}
