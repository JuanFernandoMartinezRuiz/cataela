export default function PageHeading({
  eyebrow,
  title,
  description,
  actions,
  center = false,
}) {
  return (
    <div
      className={center ? 'mx-auto max-w-3xl text-center' : 'max-w-3xl'}
    >
      {eyebrow ? (
        <p className="font-body text-xs uppercase tracking-[0.4em] text-mist">
          {eyebrow}
        </p>
      ) : null}
      <h1 className="mt-3 font-display text-4xl text-slate-700 md:text-5xl">
        {title}
      </h1>
      {description ? (
        <p className="mt-4 text-base leading-7 text-slate-600 md:text-lg">
          {description}
        </p>
      ) : null}
      {actions ? <div className="mt-6 flex flex-wrap gap-3">{actions}</div> : null}
    </div>
  )
}
