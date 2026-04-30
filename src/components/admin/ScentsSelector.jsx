export default function ScentsSelector({
  label = 'Esencias',
  scents = [],
  selectedValues = [],
  onChange,
  emptyMessage = 'No hay esencias disponibles por ahora.',
}) {
  const selectedSet = new Set(selectedValues ?? [])

  function toggleValue(value) {
    const nextValues = selectedSet.has(value)
      ? selectedValues.filter((item) => item !== value)
      : [...selectedValues, value]

    onChange(nextValues)
  }

  return (
    <div>
      <label className="field-label">{label}</label>

      {!scents.length ? (
        <div className="rounded-[1.4rem] border border-dashed border-sand/55 bg-petal/60 px-4 py-4 text-sm text-slate-500">
          {emptyMessage}
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {scents.map((scent) => {
              const active = selectedSet.has(scent.name)

              return (
                <button
                  key={scent.id}
                  type="button"
                  onClick={() => toggleValue(scent.name)}
                  className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                    active
                      ? 'border-mistDeep bg-mist/18 text-slate-700 shadow-soft'
                      : 'border-dashed border-sand/55 bg-white/82 text-slate-600 hover:bg-white'
                  }`}
                  title={scent.description || scent.name}
                >
                  {scent.name}
                </button>
              )
            })}
          </div>

          {selectedValues.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {selectedValues.map((value) => (
                <span
                  key={value}
                  className="inline-flex rounded-full border border-sageDeep/80 bg-sage px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700"
                >
                  {value}
                </span>
              ))}
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}
