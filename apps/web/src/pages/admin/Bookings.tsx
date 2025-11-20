import { useEffect, useState } from 'react'
import AdminLayout from '@/components/AdminLayout'
import { bookingsAPI } from '@/lib/api'

interface Booking {
  id: string
  resource_type: string
  resource_id: string
  requester_email: string
  requester_name: string
  notes: string
  status: string
  created_at: string
}

export default function Bookings() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'declined'>('all')

  useEffect(() => {
    fetchBookings()
  }, [])

  const fetchBookings = async () => {
    try {
      const response = await bookingsAPI.list()
      setBookings(response.bookings || [])
    } catch (error) {
      console.error('Failed to fetch bookings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (id: string) => {
    try {
      await bookingsAPI.update(id, { status: 'approved' })
      await fetchBookings()
    } catch (error) {
      console.error('Failed to approve booking:', error)
    }
  }

  const handleDecline = async (id: string) => {
    try {
      await bookingsAPI.update(id, { status: 'declined' })
      await fetchBookings()
    } catch (error) {
      console.error('Failed to decline booking:', error)
    }
  }

  const handleCancel = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this booking?')) return
    try {
      await bookingsAPI.update(id, { status: 'cancelled' })
      await fetchBookings()
    } catch (error) {
      console.error('Failed to cancel booking:', error)
    }
  }

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(date)
  }

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; color: string }> = {
      pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-700' },
      approved: { label: 'Approved', color: 'bg-green-100 text-green-700' },
      declined: { label: 'Declined', color: 'bg-red-100 text-red-700' },
      cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-700' },
    }
    return badges[status] || { label: status, color: 'bg-gray-100 text-gray-700' }
  }

  const filteredBookings = bookings.filter((booking) => {
    if (filter === 'all') return true
    return booking.status === filter
  })

  const stats = {
    pending: bookings.filter((b) => b.status === 'pending').length,
    approved: bookings.filter((b) => b.status === 'approved').length,
    declined: bookings.filter((b) => b.status === 'declined').length,
  }

  return (
    <AdminLayout>
      <div>
        <div className="mb-6">
          <h1 className="text-3xl font-display font-extrabold text-brand-neutral">
            Bookings
          </h1>
          <p className="text-brand-muted mt-1">
            Manage facility booking requests from residents
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
            <div className="text-sm font-medium text-yellow-700 mb-1">Pending</div>
            <div className="text-3xl font-bold text-yellow-700">{stats.pending}</div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <div className="text-sm font-medium text-green-700 mb-1">Approved</div>
            <div className="text-3xl font-bold text-green-700">{stats.approved}</div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="text-sm font-medium text-red-700 mb-1">Declined</div>
            <div className="text-3xl font-bold text-red-700">{stats.declined}</div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'all'
                ? 'bg-brand-primary text-white'
                : 'bg-white text-brand-neutral hover:bg-gray-100'
            }`}
          >
            All ({bookings.length})
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'pending'
                ? 'bg-brand-primary text-white'
                : 'bg-white text-brand-neutral hover:bg-gray-100'
            }`}
          >
            Pending ({stats.pending})
          </button>
          <button
            onClick={() => setFilter('approved')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'approved'
                ? 'bg-brand-primary text-white'
                : 'bg-white text-brand-neutral hover:bg-gray-100'
            }`}
          >
            Approved ({stats.approved})
          </button>
          <button
            onClick={() => setFilter('declined')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'declined'
                ? 'bg-brand-primary text-white'
                : 'bg-white text-brand-neutral hover:bg-gray-100'
            }`}
          >
            Declined ({stats.declined})
          </button>
        </div>

        {/* Bookings List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="text-brand-muted">Loading bookings...</div>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="bg-white rounded-2xl border border-brand-border p-12 text-center">
            <div className="text-6xl mb-4">📝</div>
            <h3 className="text-xl font-bold text-brand-neutral mb-2">
              {filter === 'all' ? 'No bookings yet' : `No ${filter} bookings`}
            </h3>
            <p className="text-brand-muted">
              {filter === 'all'
                ? 'Booking requests will appear here when residents submit them'
                : `You don't have any ${filter} bookings at the moment`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredBookings.map((booking) => {
              const statusBadge = getStatusBadge(booking.status)
              return (
                <div
                  key={booking.id}
                  className="bg-white rounded-2xl border border-brand-border p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold text-brand-neutral">
                          {booking.requester_name || 'Anonymous'}
                        </h3>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusBadge.color}`}>
                          {statusBadge.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-brand-muted mb-1">
                        <span>📧</span>
                        <span>{booking.requester_email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-brand-muted">
                        <span>🕒</span>
                        <span>Requested on {formatDateTime(booking.created_at)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-brand-bg rounded-lg p-4 mb-4">
                    <div className="text-sm font-medium text-brand-neutral mb-1">
                      Resource Type: <span className="capitalize">{booking.resource_type.replace('_', ' ')}</span>
                    </div>
                    <div className="text-sm text-brand-muted">
                      Resource ID: {booking.resource_id}
                    </div>
                    {booking.notes && (
                      <div className="mt-3 pt-3 border-t border-brand-border">
                        <div className="text-sm font-medium text-brand-neutral mb-1">Notes:</div>
                        <div className="text-sm text-brand-muted">{booking.notes}</div>
                      </div>
                    )}
                  </div>

                  {booking.status === 'pending' && (
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleApprove(booking.id)}
                        className="flex-1 bg-green-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-green-600 transition-colors"
                      >
                        ✓ Approve
                      </button>
                      <button
                        onClick={() => handleDecline(booking.id)}
                        className="flex-1 bg-red-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-red-600 transition-colors"
                      >
                        ✕ Decline
                      </button>
                    </div>
                  )}

                  {booking.status === 'approved' && (
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleCancel(booking.id)}
                        className="flex-1 bg-gray-100 text-brand-neutral font-semibold py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        Cancel Booking
                      </button>
                    </div>
                  )}

                  {(booking.status === 'declined' || booking.status === 'cancelled') && (
                    <div className="text-sm text-brand-muted italic">
                      This booking has been {booking.status}.
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
