import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatCurrency } from '../../utils/formatters'

export default function FinanceChart({ data, groupedBy }) {
  return (
    <div className="admin-panel p-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="font-display text-3xl text-slate-700">Evolucion financiera</h2>
          <p className="mt-2 text-sm text-slate-500">
            Comparativo de ingresos pagados, egresos pagados y utilidad {groupedBy === 'month' ? 'por mes' : 'por fecha'}.
          </p>
        </div>
      </div>

      {data.length ? (
        <div className="mt-6 h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e9dfd5" />
              <XAxis dataKey="label" stroke="#7a8088" fontSize={12} />
              <YAxis
                stroke="#7a8088"
                fontSize={12}
                tickFormatter={(value) => shortCurrency(value)}
              />
              <Tooltip formatter={(value) => formatCurrency(Number(value || 0))} />
              <Legend />
              <Bar
                dataKey="paidIncome"
                name="Ingresos pagados"
                fill="#c7dcc1"
                radius={[10, 10, 0, 0]}
              />
              <Bar
                dataKey="paidExpense"
                name="Egresos pagados"
                fill="#a9b8c8"
                radius={[10, 10, 0, 0]}
              />
              <Line
                type="monotone"
                dataKey="realProfit"
                name="Ganancia real"
                stroke="#bea18c"
                strokeWidth={3}
                dot={{ r: 4, fill: '#bea18c' }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="expectedProfit"
                name="Ganancia esperada"
                stroke="#d3bcc4"
                strokeDasharray="6 5"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 5 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="mt-6 rounded-[1.5rem] border border-dashed border-mist/55 bg-white/82 p-6 text-sm text-slate-500">
          Aun no hay datos suficientes en este rango para mostrar la evolucion financiera.
        </div>
      )}
    </div>
  )
}

function shortCurrency(value) {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`
  }

  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}k`
  }

  return `$${value}`
}
