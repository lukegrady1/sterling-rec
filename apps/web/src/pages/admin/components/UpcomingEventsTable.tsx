import { useNavigate } from 'react-router-dom'

interface UpcomingEvent {
  id: string
  title: string
  startsAt: string
  endsAt: string
  capacity: number
  registered: number
  location: string
}

interface UpcomingEventsTableProps {
  events: UpcomingEvent[]
  loading?: boolean
}

export default function UpcomingEventsTable({ events, loading }: UpcomingEventsTableProps) {
  const navigate = useNavigate()

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border-2 border-slate-200 p-6">
        <div className="h-4 bg-slate-200 rounded w-1/3 mb-6 animate-pulse" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-slate-100 rounded animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border-2 border-slate-200 p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-6">
          Upcoming Events (7 days)
        </h3>
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-slate-600 font-medium">No upcoming events</p>
          <p className="text-sm text-slate-500 mt-2">Create your first event to get started</p>
          <button
            onClick={() => navigate('/admin/events')}
            className="mt-4 px-4 py-2 bg-brand-primary hover:bg-brand-primaryHover text-white font-semibold rounded-xl transition-colors duration-200"
          >
            Create Event
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border-2 border-slate-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-slate-900">
          Upcoming Events (7 days)
        </h3>
        <button
          onClick={() => navigate('/admin/events')}
          className="text-sm text-brand-primary hover:text-brand-primaryHover font-semibold"
        >
          View all →
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-slate-200">
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Date & Time</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Event</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Location</th>
              <th className="text-right py-3 px-4 text-sm font-semibold text-slate-600">Registered</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) => {
              const startDate = new Date(event.startsAt)
              const capacity = event.capacity || 0
              const registered = event.registered || 0
              const pct = capacity > 0 ? Math.round((registered / capacity) * 100) : 0

              return (
                <tr
                  key={event.id}
                  onClick={() => navigate('/admin/events')}
                  className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors duration-150"
                >
                  <td className="py-3 px-4">
                    <div className="text-sm font-medium text-slate-900">
                      {startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                    <div className="text-xs text-slate-500">
                      {startDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-medium text-slate-900">{event.title}</div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="text-sm text-slate-600">{event.location || '—'}</div>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="inline-flex items-center gap-2">
                      <div className="text-sm font-semibold text-slate-900">
                        {registered}{capacity > 0 && ` / ${capacity}`}
                      </div>
                      {capacity > 0 && (
                        <div className={`text-xs px-2 py-1 rounded-full font-semibold ${
                          pct >= 90 ? 'bg-red-100 text-red-700' :
                          pct >= 70 ? 'bg-yellow-100 text-yellow-700' :
                          'bg-emerald-100 text-emerald-700'
                        }`}>
                          {pct}%
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
