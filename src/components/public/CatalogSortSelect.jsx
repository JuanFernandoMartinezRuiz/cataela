export default function CatalogSortSelect({ value, options, onChange }) {
  return (
    <div className="card-dashed-blue p-4">
      <label className="field-label">Ordenar por</label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="field-input"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}
