export default function EmptyState({ title, description, action }) {
  return (
    <div className="card-soft p-8 text-center">
      <h2 className="font-display text-3xl text-slate-700">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-slate-500">{description}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  )
}
