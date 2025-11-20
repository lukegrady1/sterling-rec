interface KpiCardProps {
  title: string
  value: string | number
  icon: React.ReactNode
  trend?: {
    value: number
    isPositive: boolean
  }
  loading?: boolean
}

export default function KpiCard({ title, value, icon, trend, loading }: KpiCardProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border-2 border-slate-200 p-6 animate-pulse">
        <div className="flex items-center justify-between mb-4">
          <div className="h-4 bg-slate-200 rounded w-1/2" />
          <div className="w-10 h-10 bg-slate-200 rounded-xl" />
        </div>
        <div className="h-8 bg-slate-200 rounded w-1/3" />
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border-2 border-slate-200 hover:border-brand-primary hover:shadow-md transition-all duration-200 p-6 group">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm font-semibold text-slate-600 uppercase tracking-wide">
          {title}
        </div>
        <div className="w-10 h-10 bg-gradient-to-br from-brand-primary/10 to-brand-accent/10 rounded-xl flex items-center justify-center text-brand-primary group-hover:scale-110 transition-transform duration-200">
          {icon}
        </div>
      </div>

      {/* Value */}
      <div className="flex items-baseline gap-3">
        <div className="text-3xl font-bold text-slate-900">
          {value}
        </div>

        {/* Trend indicator */}
        {trend && (
          <div className={`flex items-center gap-1 text-sm font-semibold ${
            trend.isPositive ? 'text-emerald-600' : 'text-red-600'
          }`}>
            {trend.isPositive ? (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M12 7a1 1 0 011 1v10a1 1 0 01-2 0V8a1 1 0 011-1zm4-4a1 1 0 011 1v14a1 1 0 01-2 0V4a1 1 0 011-1zM8 10a1 1 0 011 1v8a1 1 0 01-2 0v-8a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M12 13a1 1 0 011-1v-1a1 1 0 00-2 0v1a1 1 0 001 1zm4 0a1 1 0 011-1v-3a1 1 0 00-2 0v3a1 1 0 001 1zm-8 0a1 1 0 011-1V8a1 1 0 00-2 0v4a1 1 0 001 1z" clipRule="evenodd" />
              </svg>
            )}
            <span>{Math.abs(trend.value)}%</span>
          </div>
        )}
      </div>
    </div>
  )
}
