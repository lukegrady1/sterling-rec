import AdminLayout from '@/components/AdminLayout'
import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useNavigate } from 'react-router-dom'

export default function Bookings() {
  const navigate = useNavigate()

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
            <AlertCircle size={64} className="mx-auto mb-4 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Bookings Management Moved</h1>
            <p className="text-gray-700 mb-6">
              Facility bookings are now managed through the Facilities Management page, which provides
              a more comprehensive view of bookings, closures, and availability windows for each facility.
            </p>
            <Button onClick={() => navigate('/admin/facilities')}>
              Go to Facilities Management
            </Button>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
