import { useState, useEffect } from 'react'
import AdminLayout from '@/components/AdminLayout'
import { settingsAPI } from '@/lib/api'

export default function Settings() {
  const [settings, setSettings] = useState({
    departmentName: 'Sterling Recreation Department',
    contactEmail: 'info@sterling.local.rechub',
    contactPhone: '(555) 123-4567',
    address: '123 Main Street, Sterling, VA 20164',
    timezone: 'America/New_York',
    locale: 'en-US',
    enablePrograms: true,
    enableEvents: true,
    enableFacilities: true,
  })

  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const response = await settingsAPI.get()
      if (response.config) {
        setSettings({
          departmentName: response.config.departmentName || 'Sterling Recreation Department',
          contactEmail: response.config.contactEmail || 'info@sterling.local.rechub',
          contactPhone: response.config.contactPhone || '(555) 123-4567',
          address: response.config.address || '123 Main Street, Sterling, VA 20164',
          timezone: response.config.timezone || 'America/New_York',
          locale: response.config.locale || 'en-US',
          enablePrograms: response.config.enablePrograms !== undefined ? response.config.enablePrograms : true,
          enableEvents: response.config.enableEvents !== undefined ? response.config.enableEvents : true,
          enableFacilities: response.config.enableFacilities !== undefined ? response.config.enableFacilities : true,
        })
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      await settingsAPI.update({ ...settings })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (error) {
      console.error('Failed to save settings:', error)
      alert('Failed to save settings')
    }
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <div className="text-brand-muted">Loading settings...</div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="max-w-4xl">
        <div className="mb-6">
          <h1 className="text-3xl font-display font-extrabold text-brand-neutral">
            Settings
          </h1>
          <p className="text-brand-muted mt-1">
            Configure your department settings and preferences
          </p>
        </div>

        {saved && (
          <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-xl mb-6">
            ✓ Settings saved successfully!
          </div>
        )}

        {/* General Settings */}
        <div className="bg-white rounded-2xl border border-brand-border p-6 mb-6">
          <h2 className="text-xl font-display font-bold text-brand-neutral mb-4">
            General Information
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-brand-neutral mb-1">
                Department Name *
              </label>
              <input
                type="text"
                value={settings.departmentName}
                onChange={(e) => setSettings({ ...settings, departmentName: e.target.value })}
                className="w-full px-4 py-3 border border-brand-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-ring"
                placeholder="e.g., Sterling Recreation Department"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-brand-neutral mb-1">
                  Contact Email *
                </label>
                <input
                  type="email"
                  value={settings.contactEmail}
                  onChange={(e) => setSettings({ ...settings, contactEmail: e.target.value })}
                  className="w-full px-4 py-3 border border-brand-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-ring"
                  placeholder="info@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-neutral mb-1">
                  Contact Phone
                </label>
                <input
                  type="tel"
                  value={settings.contactPhone}
                  onChange={(e) => setSettings({ ...settings, contactPhone: e.target.value })}
                  className="w-full px-4 py-3 border border-brand-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-ring"
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-brand-neutral mb-1">
                Physical Address
              </label>
              <input
                type="text"
                value={settings.address}
                onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                className="w-full px-4 py-3 border border-brand-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-ring"
                placeholder="123 Main Street, City, State ZIP"
              />
            </div>
          </div>
        </div>

        {/* Regional Settings */}
        <div className="bg-white rounded-2xl border border-brand-border p-6 mb-6">
          <h2 className="text-xl font-display font-bold text-brand-neutral mb-4">
            Regional Settings
          </h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-brand-neutral mb-1">
                  Timezone
                </label>
                <select
                  value={settings.timezone}
                  onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
                  className="w-full px-4 py-3 border border-brand-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-ring"
                >
                  <option value="America/New_York">Eastern Time (ET)</option>
                  <option value="America/Chicago">Central Time (CT)</option>
                  <option value="America/Denver">Mountain Time (MT)</option>
                  <option value="America/Los_Angeles">Pacific Time (PT)</option>
                  <option value="America/Phoenix">Arizona (MST)</option>
                  <option value="America/Anchorage">Alaska Time (AKT)</option>
                  <option value="Pacific/Honolulu">Hawaii Time (HT)</option>
                </select>
                <p className="text-xs text-brand-muted mt-1">
                  Used for displaying event times and schedules
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-neutral mb-1">
                  Locale
                </label>
                <select
                  value={settings.locale}
                  onChange={(e) => setSettings({ ...settings, locale: e.target.value })}
                  className="w-full px-4 py-3 border border-brand-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-ring"
                >
                  <option value="en-US">English (United States)</option>
                  <option value="en-GB">English (United Kingdom)</option>
                  <option value="en-CA">English (Canada)</option>
                  <option value="es-US">Spanish (United States)</option>
                  <option value="fr-CA">French (Canada)</option>
                </select>
                <p className="text-xs text-brand-muted mt-1">
                  Affects date/time formatting and currency
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Module Settings */}
        <div className="bg-white rounded-2xl border border-brand-border p-6 mb-6">
          <h2 className="text-xl font-display font-bold text-brand-neutral mb-4">
            Features & Modules
          </h2>
          <p className="text-sm text-brand-muted mb-4">
            Enable or disable features on your public website
          </p>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 bg-brand-bg rounded-lg">
              <div>
                <div className="font-semibold text-brand-neutral">Programs</div>
                <div className="text-sm text-brand-muted">Recreation programs and activities</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.enablePrograms}
                  onChange={(e) => setSettings({ ...settings, enablePrograms: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-ring rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-primary"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 bg-brand-bg rounded-lg">
              <div>
                <div className="font-semibold text-brand-neutral">Events</div>
                <div className="text-sm text-brand-muted">Community events and activities</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.enableEvents}
                  onChange={(e) => setSettings({ ...settings, enableEvents: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-ring rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-primary"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 bg-brand-bg rounded-lg">
              <div>
                <div className="font-semibold text-brand-neutral">Facilities</div>
                <div className="text-sm text-brand-muted">Facility bookings and reservations</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.enableFacilities}
                  onChange={(e) => setSettings({ ...settings, enableFacilities: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-ring rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-primary"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="bg-white rounded-2xl border border-brand-border p-6">
          <button
            onClick={handleSave}
            className="w-full bg-brand-primary text-white font-bold py-3 px-6 rounded-xl hover:bg-brand-primaryHover transition-colors"
          >
            Save Settings
          </button>
        </div>

        {/* Help Text */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="font-bold text-brand-neutral mb-2">💡 Settings Tips</h3>
          <ul className="text-sm text-brand-muted space-y-1">
            <li>• Contact information is displayed in your public website footer</li>
            <li>• Timezone affects how event times are displayed to visitors</li>
            <li>• Disabling modules will hide them from your public website navigation</li>
            <li>• Changes take effect immediately after saving</li>
          </ul>
        </div>
      </div>
    </AdminLayout>
  )
}

