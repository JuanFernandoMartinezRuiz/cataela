export default function CategoryFilter({ categories, currentCategory, onChange }) {
  return (
    <div className="flex flex-wrap gap-3">
      <button
        type="button"
        onClick={() => onChange('all')}
        className={`filter-pill ${
          currentCategory === 'all' ? 'filter-pill-active' : 'filter-pill-idle'
        }`}
      >
        Todos
      </button>

      {categories.map((category) => (
        <button
          key={category.id}
          type="button"
          onClick={() => onChange(category.slug)}
          className={`filter-pill ${
            currentCategory === category.slug
              ? 'filter-pill-active'
              : 'filter-pill-idle'
          }`}
        >
          {category.name}
        </button>
      ))}
    </div>
  )
}
