const colorMap = {
  active: 'bg-sage text-slate-700',
  inactive: 'bg-sand/50 text-slate-700',
  available: 'bg-white text-slate-700',
  reserved: 'bg-sun text-slate-700',
  paid: 'bg-sage text-slate-700',
  winner: 'bg-rose text-slate-700',
  draft: 'bg-sand/50 text-slate-700',
  closed: 'bg-slate-200 text-slate-700',
  completed: 'bg-sage text-slate-700',
  pending: 'bg-sun text-slate-700',
  partial: 'bg-blush text-slate-700',
}

export default function StatusBadge({ children, tone = 'inactive' }) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${colorMap[tone] || colorMap.inactive}`}
    >
      {children}
    </span>
  )
}
