import { useNavigate } from 'react-router-dom'

interface RecentBooking {
  id: string
  createdAt: string
  facilityName: string
  slotStartsAt: string
  slotEndsAt: string
  requesterName: string
  requesterEmail: string
  status: string
}

interface RecentBookingsTableProps {
  bookings: RecentBooking[]
  loading?: boolean
}

export default function RecentBookingsTable({ bookings, loading }: RecentBookingsTableProps) {
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

  if (bookings.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border-2 border-slate-200 p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-6">
          Recent Booking Requests
        </h3>
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <p className="text-slate-600 font-medium">No booking requests yet</p>
          <p className="text-sm text-slate-500 mt-2">Bookings will appear here as residents request them</p>
        </div>
      </div>
    )
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-700',
      approved: 'bg-emerald-100 text-emerald-700',
      declined: 'bg-red-100 text-red-700',
      cancelled: 'bg-slate-100 text-slate-700'
    }
    return styles[status as keyof typeof styles] || styles.pending
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border-2 border-slate-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-slate-900">
          Recent Booking Requests
        </h3>
        <button
          onClick={() => navigate('/admin/bookings')}
          className="text-sm text-brand-primary hover:text-brand-primaryHover font-semibold"
        >
          View all →
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-slate-200">
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Created</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Facility & Slot</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Requester</th>
              <th className="text-right py-3 px-4 text-sm font-semibold text-slate-600">Status</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((booking) => {
              const createdDate = new Date(booking.createdAt)
              const slotStart = new Date(booking.slotStartsAt)
              const slotEnd = new Date(booking.slotEndsAt)

              return (
                <tr
                  key={booking.id}
                  onClick={() => navigate('/admin/bookings')}
                  className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors duration-150"
                >
                  <td className="py-3 px-4">
                    <div className="text-sm font-medium text-slate-900">
                      {createdDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                    <div className="text-xs text-slate-500">
                      {createdDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-medium text-slate-900">{booking.facilityName || 'Unknown'}</div>
                    <div className="text-xs text-slate-500">
                      {slotStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })},{' '}
                      {slotStart.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} - {' '}
                      {slotEnd.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="text-sm font-medium text-slate-900">{booking.requesterName || 'Unknown'}</div>
                    <div className="text-xs text-slate-500">{booking.requesterEmail}</div>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold capitalize ${getStatusBadge(booking.status)}`}>
                      {booking.status}
                    </span>
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
