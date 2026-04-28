export default function CategoryFilter({ categories, currentCategory, onChange }) {
  return (
    <div className="flex flex-wrap gap-3">
      <button
        type="button"
        onClick={() => onChange('all')}
        className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
          currentCategory === 'all'
            ? 'bg-slate-700 text-white'
            : 'border border-dashed border-sand bg-white/80 text-slate-600'
        }`}
      >
        Todas
      </button>

      {categories.map((category) => (
        <button
          key={category.id}
          type="button"
          onClick={() => onChange(category.slug)}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
            currentCategory === category.slug
              ? 'bg-mist text-white'
              : 'border border-dashed border-sand bg-white/80 text-slate-600'
          }`}
        >
          {category.name}
        </button>
      ))}
    </div>
  )
}
