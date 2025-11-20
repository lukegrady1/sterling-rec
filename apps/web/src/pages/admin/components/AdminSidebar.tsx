import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Calendar,
  CalendarDays,
  Building2,
  ClipboardList,
  UserCheck,
  Globe,
  Settings,
  HelpCircle,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  X
} from 'lucide-react'

interface NavItem {
  label: string
  icon: React.ReactNode
  path: string
}

const mainNavItems: NavItem[] = [
  { label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" />, path: '/admin/dashboard' },
  { label: 'Programs', icon: <Calendar className="w-5 h-5" />, path: '/admin/programs' },
  { label: 'Events', icon: <CalendarDays className="w-5 h-5" />, path: '/admin/events' },
  { label: 'Facilities', icon: <Building2 className="w-5 h-5" />, path: '/admin/facilities' },
  { label: 'Bookings', icon: <ClipboardList className="w-5 h-5" />, path: '/admin/bookings' },
  { label: 'Registrations', icon: <UserCheck className="w-5 h-5" />, path: '/admin/registrations' },
  { label: 'Website', icon: <Globe className="w-5 h-5" />, path: '/admin/website' }
]

const bottomNavItems: NavItem[] = [
  { label: 'Settings', icon: <Settings className="w-5 h-5" />, path: '/admin/settings' },
  { label: 'Help', icon: <HelpCircle className="w-5 h-5" />, path: '/admin/help' }
]

interface AdminSidebarProps {
  tenantName?: string
}

export default function AdminSidebar({ tenantName = 'Rec Hub' }: AdminSidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  const isActive = (path: string) => location.pathname === path

  const handleLogout = () => {
    localStorage.removeItem('token')
    window.location.href = '/login'
  }

  const NavLink = ({ item }: { item: NavItem }) => {
    const active = isActive(item.path)
    return (
      <Link
        to={item.path}
        onClick={() => setMobileOpen(false)}
        className={`
          flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all
          ${active
            ? 'bg-brand-primary text-white shadow-md'
            : 'text-brand-neutral hover:bg-slate-100 hover:text-brand-primary'
          }
          ${collapsed ? 'justify-center' : ''}
        `}
        title={collapsed ? item.label : undefined}
      >
        {item.icon}
        {!collapsed && <span className="font-medium">{item.label}</span>}
      </Link>
    )
  }

  const SidebarContent = () => (
    <>
      {/* Header */}
      <div className={`px-4 py-5 border-b border-slate-200 ${collapsed ? 'text-center' : ''}`}>
        {collapsed ? (
          <div className="w-10 h-10 rounded-xl bg-brand-primary text-white flex items-center justify-center font-bold text-lg mx-auto">
            {tenantName.charAt(0)}
          </div>
        ) : (
          <div>
            <h1 className="text-xl font-bold text-brand-neutral">{tenantName}</h1>
            <p className="text-sm text-brand-muted">Admin Panel</p>
          </div>
        )}
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {mainNavItems.map((item) => (
          <NavLink key={item.path} item={item} />
        ))}
      </nav>

      {/* Bottom Navigation */}
      <div className="px-3 py-4 border-t border-slate-200 space-y-1">
        {bottomNavItems.map((item) => (
          <NavLink key={item.path} item={item} />
        ))}
        <button
          onClick={handleLogout}
          className={`
            w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
            text-red-600 hover:bg-red-50 transition-all
            ${collapsed ? 'justify-center' : ''}
          `}
          title={collapsed ? 'Logout' : undefined}
        >
          <LogOut className="w-5 h-5" />
          {!collapsed && <span className="font-medium">Logout</span>}
        </button>
      </div>

      {/* Collapse Toggle (Desktop only) */}
      <div className="hidden md:block px-3 py-3 border-t border-slate-200">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-brand-muted hover:bg-slate-100 transition-all"
        >
          {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          {!collapsed && <span className="text-sm">Collapse</span>}
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-4 left-4 z-40 p-2 bg-white rounded-xl shadow-lg border-2 border-slate-200 text-brand-neutral"
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={`
          md:hidden fixed top-0 left-0 h-full w-64 bg-white z-50
          transform transition-transform duration-300 ease-in-out
          flex flex-col border-r-2 border-slate-200 shadow-2xl
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-4 right-4 p-2 text-brand-muted hover:text-brand-neutral"
        >
          <X className="w-6 h-6" />
        </button>
        <SidebarContent />
      </aside>

      {/* Desktop Sidebar */}
      <aside
        className={`
          hidden md:flex flex-col h-screen bg-white border-r-2 border-slate-200
          transition-all duration-300 ease-in-out sticky top-0
          ${collapsed ? 'w-20' : 'w-64'}
        `}
      >
        <SidebarContent />
      </aside>
    </>
  )
}
