export default function LoadingState({ label = 'Cargando...' }) {
  return (
    <div className="card-soft flex min-h-40 items-center justify-center p-8 text-center">
      <p className="text-sm uppercase tracking-[0.25em] text-slate-500">{label}</p>
    </div>
  )
}
