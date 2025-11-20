import { useState } from 'react'

interface OnboardingChecklistProps {
  items: {
    logoUploaded: boolean
    homepagePublished: boolean
    firstProgram: boolean
    firstFacility: boolean
    firstBooking: boolean
  }
  onToggle?: (key: string, value: boolean) => void
}

export default function OnboardingChecklist({ items }: OnboardingChecklistProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)

  const checklistItems = [
    {
      key: 'logoUploaded',
      label: 'Upload logo & set colors',
      completed: items.logoUploaded,
      link: '/admin/theme'
    },
    {
      key: 'homepagePublished',
      label: 'Publish homepage',
      completed: items.homepagePublished,
      link: '/admin/pages'
    },
    {
      key: 'firstProgram',
      label: 'Create first program',
      completed: items.firstProgram,
      link: '/admin/programs'
    },
    {
      key: 'firstFacility',
      label: 'Add first facility + slots',
      completed: items.firstFacility,
      link: '/admin/facilities'
    },
    {
      key: 'firstBooking',
      label: 'Receive first booking',
      completed: items.firstBooking,
      link: '/admin/bookings'
    }
  ]

  const completedCount = checklistItems.filter(item => item.completed).length
  const totalCount = checklistItems.length
  const progress = (completedCount / totalCount) * 100

  // Auto-collapse if all done
  const allComplete = completedCount === totalCount

  if (allComplete && isCollapsed) {
    return (
      <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-2xl border-2 border-emerald-200 p-6">
        <button
          onClick={() => setIsCollapsed(false)}
          className="w-full flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="text-left">
              <div className="font-bold text-emerald-900">All set!</div>
              <div className="text-sm text-emerald-700">You've completed onboarding</div>
            </div>
          </div>
          <svg className="w-5 h-5 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border-2 border-slate-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-slate-900">Get set up in minutes</h3>
        {allComplete && (
          <button
            onClick={() => setIsCollapsed(true)}
            className="text-sm text-slate-500 hover:text-slate-700"
          >
            Collapse
          </button>
        )}
      </div>

      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-slate-600">
            {completedCount} of {totalCount} complete
          </span>
          <span className="text-sm font-semibold text-brand-primary">
            {Math.round(progress)}%
          </span>
        </div>
        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-brand-primary to-brand-accent transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Checklist items */}
      <div className="space-y-3">
        {checklistItems.map((item) => (
          <a
            key={item.key}
            href={item.link}
            className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all duration-200 ${
              item.completed
                ? 'border-emerald-200 bg-emerald-50 hover:bg-emerald-100'
                : 'border-slate-200 bg-white hover:border-brand-primary hover:bg-slate-50'
            }`}
          >
            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
              item.completed
                ? 'bg-emerald-500 border-emerald-500'
                : 'border-slate-300 bg-white'
            }`}>
              {item.completed && (
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <span className={`flex-1 font-medium ${
              item.completed ? 'text-emerald-900 line-through' : 'text-slate-700'
            }`}>
              {item.label}
            </span>
            {!item.completed && (
              <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            )}
          </a>
        ))}
      </div>
    </div>
  )
}
