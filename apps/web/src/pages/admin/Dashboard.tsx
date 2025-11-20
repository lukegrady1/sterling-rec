import { useEffect, useState } from 'react'
import AdminLayout from '@/components/AdminLayout'
import { getAPI } from '@/lib/api'
import KpiCard from './components/KpiCard'
import UtilizationChart from './components/UtilizationChart'
import UpcomingEventsTable from './components/UpcomingEventsTable'
import RecentBookingsTable from './components/RecentBookingsTable'
import OnboardingChecklist from './components/OnboardingChecklist'
import QuickActions from './components/QuickActions'

interface DashboardSummary {
  activePrograms: number
  upcomingEvents7d: number
  pendingBookings: number
  registrationsMTD: number
  utilization7dPct: number
  payments: {
    enabled: boolean
    grossMTD: number
  }
}

interface UpcomingEvent {
  id: string
  title: string
  startsAt: string
  endsAt: string
  capacity: number
  registered: number
  location: string
}

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

interface UtilizationPoint {
  weekStart: string
  pct: number
}

interface OnboardingState {
  logoUploaded: boolean
  homepagePublished: boolean
  firstProgram: boolean
  firstFacility: boolean
  firstBooking: boolean
}

export default function Dashboard() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [events, setEvents] = useState<UpcomingEvent[]>([])
  const [bookings, setBookings] = useState<RecentBooking[]>([])
  const [utilizationSeries, setUtilizationSeries] = useState<UtilizationPoint[]>([])
  const [onboarding, setOnboarding] = useState<OnboardingState>({
    logoUploaded: false,
    homepagePublished: false,
    firstProgram: false,
    firstFacility: false,
    firstBooking: false
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const api = getAPI()

      // Fetch all dashboard data in parallel
      const [summaryRes, eventsRes, bookingsRes, utilizationRes, onboardingRes] = await Promise.all([
        api.get('/admin/dashboard/summary').catch(() => ({ data: null })),
        api.get('/admin/dashboard/upcoming-events').catch(() => ({ data: { events: [] } })),
        api.get('/admin/dashboard/recent-bookings').catch(() => ({ data: { bookings: [] } })),
        api.get('/admin/dashboard/utilization-series').catch(() => ({ data: { series: [] } })),
        api.get('/admin/onboarding').catch(() => ({ data: null }))
      ])

      if (summaryRes.data) {
        setSummary(summaryRes.data)
      }

      if (eventsRes.data?.events) {
        setEvents(eventsRes.data.events)
      }

      if (bookingsRes.data?.bookings) {
        setBookings(bookingsRes.data.bookings)
      }

      if (utilizationRes.data?.series) {
        setUtilizationSeries(utilizationRes.data.series)
      }

      if (onboardingRes.data) {
        setOnboarding({
          logoUploaded: onboardingRes.data.logoUploaded || false,
          homepagePublished: onboardingRes.data.homepagePublished || false,
          firstProgram: onboardingRes.data.firstProgram || false,
          firstFacility: onboardingRes.data.firstFacility || false,
          firstBooking: onboardingRes.data.firstBooking || false
        })
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Welcome back — here's what's happening this week.
          </h1>
          <p className="text-slate-600">
            Monitor your recreation department's key metrics and activity
          </p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          <KpiCard
            title="Active Programs"
            value={summary?.activePrograms ?? 0}
            loading={loading}
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            }
          />

          <KpiCard
            title="Upcoming Events (7 days)"
            value={summary?.upcomingEvents7d ?? 0}
            loading={loading}
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            }
          />

          <KpiCard
            title="Pending Bookings"
            value={summary?.pendingBookings ?? 0}
            loading={loading}
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />

          <KpiCard
            title="Facility Utilization (7 days)"
            value={`${summary?.utilization7dPct.toFixed(1) ?? 0}%`}
            loading={loading}
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            }
          />

          <KpiCard
            title="Registrations (MTD)"
            value={summary?.registrationsMTD ?? 0}
            loading={loading}
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            }
          />
        </div>

        {/* Onboarding Checklist */}
        <OnboardingChecklist items={onboarding} />

        {/* Quick Actions */}
        <QuickActions />

        {/* Charts and Tables Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Utilization Chart */}
          <div className="lg:col-span-2">
            <UtilizationChart data={utilizationSeries} loading={loading} />
          </div>

          {/* Upcoming Events */}
          <UpcomingEventsTable events={events} loading={loading} />

          {/* Recent Bookings */}
          <RecentBookingsTable bookings={bookings} loading={loading} />
        </div>
      </div>
    </AdminLayout>
  )
}
