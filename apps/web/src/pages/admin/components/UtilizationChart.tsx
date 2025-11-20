import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface UtilizationPoint {
  weekStart: string
  pct: number
}

interface UtilizationChartProps {
  data: UtilizationPoint[]
  loading?: boolean
}

export default function UtilizationChart({ data, loading }: UtilizationChartProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border-2 border-slate-200 p-6">
        <div className="h-4 bg-slate-200 rounded w-1/3 mb-6 animate-pulse" />
        <div className="h-64 bg-slate-100 rounded animate-pulse" />
      </div>
    )
  }

  // Format data for chart
  const chartData = data.map(point => ({
    week: new Date(point.weekStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    utilization: Math.round(point.pct * 10) / 10
  }))

  return (
    <div className="bg-white rounded-2xl shadow-sm border-2 border-slate-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-slate-900">
          Facility Utilization Trend
        </h3>
        <div className="text-sm text-slate-500">
          Last 8 weeks
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="week"
            stroke="#64748b"
            style={{ fontSize: '12px' }}
          />
          <YAxis
            stroke="#64748b"
            style={{ fontSize: '12px' }}
            domain={[0, 100]}
            tickFormatter={(value) => `${value}%`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#ffffff',
              border: '2px solid #e2e8f0',
              borderRadius: '12px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
            formatter={(value: number) => [`${value}%`, 'Utilization']}
          />
          <Line
            type="monotone"
            dataKey="utilization"
            stroke="#2563EB"
            strokeWidth={3}
            dot={{ fill: '#2563EB', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, fill: '#10B981' }}
          />
        </LineChart>
      </ResponsiveContainer>

      {data.length === 0 && (
        <div className="text-center py-12 text-slate-500">
          <p>No utilization data available yet.</p>
          <p className="text-sm mt-2">Add facilities and slots to see trends.</p>
        </div>
      )}
    </div>
  )
}
