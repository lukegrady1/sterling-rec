import { ReactNode, useState, useEffect } from 'react'
import { settingsAPI, authAPI } from '../lib/api'
import { Sidebar, SidebarBody, SidebarLink } from './ui/sidebar'
import {
  LayoutDashboard,
  Calendar,
  CalendarDays,
  Building2,
  ClipboardList,
  UserCheck,
  FileText,
  Settings,
  HelpCircle,
  LogOut,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { cn } from '../lib/utils'

interface AdminLayoutProps {
  children: ReactNode
}

interface TenantSettings {
  branding?: {
    departmentName?: string
    logoUrl?: string
    primaryColor?: string
    accentColor?: string
  }
  config?: {
    departmentName?: string
  }
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [settings, setSettings] = useState<TenantSettings>({})
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const response = await settingsAPI.get()
      setSettings(response)
    } catch (error) {
      console.error('Failed to fetch settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const tenantName = settings.branding?.departmentName || settings.config?.departmentName || 'Sterling Recreation'

  const handleLogout = async () => {
    try {
      await authAPI.logout()
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      // Clear local storage and redirect regardless of API call result
      localStorage.removeItem('token')
      window.location.href = '/'
    }
  }

  const links = [
    {
      label: 'Dashboard',
      href: '/admin/dashboard',
      icon: (
        <LayoutDashboard className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
      ),
    },
    {
      label: 'Programs',
      href: '/admin/programs',
      icon: (
        <Calendar className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
      ),
    },
    {
      label: 'Events',
      href: '/admin/events',
      icon: (
        <CalendarDays className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
      ),
    },
    {
      label: 'Facilities',
      href: '/admin/facilities',
      icon: (
        <Building2 className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
      ),
    },
    {
      label: 'Bookings',
      href: '/admin/bookings',
      icon: (
        <ClipboardList className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
      ),
    },
    {
      label: 'Program Registrations',
      href: '/admin/program-registrations',
      icon: (
        <UserCheck className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
      ),
    },
    {
      label: 'Waivers',
      href: '/admin/waivers',
      icon: (
        <FileText className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
      ),
    },
    {
      label: 'Form Templates',
      href: '/admin/form-templates',
      icon: (
        <FileText className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
      ),
    },
  ]

  const bottomLinks = [
    {
      label: 'Settings',
      href: '/admin/settings',
      icon: (
        <Settings className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
      ),
    },
    {
      label: 'Help',
      href: '/admin/help',
      icon: (
        <HelpCircle className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
      ),
    },
  ]

  return (
    <div
      className={cn(
        "flex flex-col md:flex-row bg-gray-100 dark:bg-neutral-800 w-full flex-1 mx-auto overflow-hidden",
        "h-screen"
      )}
    >
      <Sidebar open={open} setOpen={setOpen}>
        <SidebarBody className="flex flex-col h-full">
          <div className="flex flex-col gap-2 flex-shrink-0">
            {links.map((link, idx) => (
              <SidebarLink key={idx} link={link} />
            ))}
          </div>
          <div className="flex-grow" />
          <div className="flex flex-col gap-2 border-t border-neutral-200 dark:border-neutral-700 pt-4 mt-4 flex-shrink-0">
            {bottomLinks.map((link, idx) => (
              <SidebarLink key={idx} link={link} />
            ))}
            <button
              onClick={handleLogout}
              className="flex items-center justify-start gap-2 group/sidebar py-2 text-red-600 hover:text-red-700"
            >
              <LogOut className="h-5 w-5 flex-shrink-0" />
              <motion.span
                animate={{
                  display: open ? "inline-block" : "none",
                  opacity: open ? 1 : 0,
                }}
                className="text-sm group-hover/sidebar:translate-x-1 transition duration-150 whitespace-pre inline-block !p-0 !m-0"
              >
                Logout
              </motion.span>
            </button>
          </div>
        </SidebarBody>
      </Sidebar>
      <main className="flex-1 overflow-auto bg-white dark:bg-neutral-900">
        <div className="container mx-auto px-4 md:px-6 py-6 md:py-8 max-w-7xl">
          {children}
        </div>
      </main>
    </div>
  )
}

export const Logo = ({ tenantName }: { tenantName: string }) => {
  return (
    <Link
      to="/admin/dashboard"
      className="font-normal flex space-x-2 items-center text-sm text-black py-1 relative z-20"
    >
      <div className="h-5 w-6 bg-brand-primary dark:bg-white rounded-br-lg rounded-tr-sm rounded-tl-lg rounded-bl-sm flex-shrink-0" />
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="font-medium text-black dark:text-white whitespace-pre"
      >
        {tenantName}
      </motion.span>
    </Link>
  )
}

export const LogoIcon = ({ tenantName }: { tenantName: string }) => {
  return (
    <Link
      to="/admin/dashboard"
      className="font-normal flex space-x-2 items-center text-sm text-black py-1 relative z-20"
      title={tenantName}
    >
      <div className="h-5 w-6 bg-brand-primary dark:bg-white rounded-br-lg rounded-tr-sm rounded-tl-lg rounded-bl-sm flex-shrink-0" />
    </Link>
  )
}
