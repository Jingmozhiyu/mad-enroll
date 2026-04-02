export default function CourseLoading() {
  return (
    <div className="grid gap-4 px-1">
      <div className="h-16 rounded-[24px] bg-white/65" />
      <div className="h-px w-full bg-[rgba(154,238,222,0.4)]" />
      <div className="grid gap-6 xl:grid-cols-[minmax(260px,0.33fr)_minmax(0,0.67fr)]">
        <div className="h-44 rounded-[28px] bg-white/65" />
        <div className="h-[340px] rounded-[28px] bg-white/65" />
      </div>
      <div className="h-px w-full bg-[rgba(154,238,222,0.4)]" />
      <div className="h-[330px] rounded-[28px] bg-white/65" />
    </div>
  )
}
