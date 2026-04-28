export default function ImagePlaceholder({ label, className = '' }) {
  return (
    <div
      className={`flex items-center justify-center rounded-[1.5rem] border border-dashed border-mist/55 bg-gradient-to-br from-white via-petal to-mist/18 text-center ${className}`}
    >
      <span className="max-w-36 font-display text-2xl text-slate-600">{label}</span>
    </div>
  )
}
