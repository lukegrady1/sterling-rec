import { useNavigate } from 'react-router-dom'

export default function QuickActions() {
  const navigate = useNavigate()

  const actions = [
    {
      label: 'New Program',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      ),
      href: '/admin/programs',
      color: 'bg-blue-500 hover:bg-blue-600'
    },
    {
      label: 'New Event',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      href: '/admin/events',
      color: 'bg-emerald-500 hover:bg-emerald-600'
    },
    {
      label: 'New Facility',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      href: '/admin/facilities',
      color: 'bg-purple-500 hover:bg-purple-600'
    },
    {
      label: 'Add Slot',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      href: '/admin/facilities',
      color: 'bg-orange-500 hover:bg-orange-600'
    },
    {
      label: 'Website Builder',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      ),
      href: '/admin/pages',
      color: 'bg-pink-500 hover:bg-pink-600'
    }
  ]

  return (
    <div className="bg-white rounded-2xl shadow-sm border-2 border-slate-200 p-6">
      <h3 className="text-lg font-bold text-slate-900 mb-4">Quick Actions</h3>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {actions.map((action, index) => (
          <button
            key={index}
            onClick={() => navigate(action.href)}
            className={`${action.color} text-white rounded-xl p-4 flex flex-col items-center justify-center gap-2 transition-all duration-200 transform hover:scale-105 shadow-sm hover:shadow-md`}
          >
            {action.icon}
            <span className="text-sm font-semibold">{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
