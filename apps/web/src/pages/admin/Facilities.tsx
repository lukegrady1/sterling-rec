import { useEffect, useState } from 'react'
import AdminLayout from '@/components/AdminLayout'
import { facilitiesAPI } from '@/lib/api'

interface Facility {
  id: string
  name: string
  type: string
  address: string
  rules: string
  photo_id: string | null
}

interface FacilitySlot {
  id: string
  facility_id: string
  starts_at: string
  ends_at: string
  status: string
}

export default function Facilities() {
  const [facilities, setFacilities] = useState<Facility[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showSlotsModal, setShowSlotsModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [selectedFacilityId, setSelectedFacilityId] = useState<string | null>(null)
  const [slots, setSlots] = useState<FacilitySlot[]>([])
  const [showSlotForm, setShowSlotForm] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    type: 'room',
    address: '',
    rules: '',
  })

  const [slotFormData, setSlotFormData] = useState({
    starts_at: '',
    ends_at: '',
    status: 'open',
  })

  useEffect(() => {
    fetchFacilities()
  }, [])

  const fetchFacilities = async () => {
    try {
      const response = await facilitiesAPI.list()
      setFacilities(response.facilities || [])
    } catch (error) {
      console.error('Failed to fetch facilities:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchSlots = async (facilityId: string) => {
    try {
      const response = await facilitiesAPI.listSlots(facilityId)
      setSlots(response.slots || [])
    } catch (error) {
      console.error('Failed to fetch slots:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingId) {
        await facilitiesAPI.update(editingId, formData)
      } else {
        await facilitiesAPI.create(formData)
      }
      await fetchFacilities()
      resetForm()
    } catch (error) {
      console.error('Failed to save facility:', error)
    }
  }

  const handleSlotSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFacilityId) return
    try {
      await facilitiesAPI.createSlot(selectedFacilityId, slotFormData)
      await fetchSlots(selectedFacilityId)
      resetSlotForm()
    } catch (error) {
      console.error('Failed to create slot:', error)
    }
  }

  const handleEdit = (facility: Facility) => {
    setFormData({
      name: facility.name,
      type: facility.type,
      address: facility.address,
      rules: facility.rules,
    })
    setEditingId(facility.id)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this facility?')) return
    try {
      await facilitiesAPI.delete(id)
      await fetchFacilities()
    } catch (error) {
      console.error('Failed to delete facility:', error)
    }
  }

  const handleDeleteSlot = async (slotId: string) => {
    if (!confirm('Are you sure you want to delete this time slot?')) return
    if (!selectedFacilityId) return
    try {
      await facilitiesAPI.deleteSlot(slotId)
      await fetchSlots(selectedFacilityId)
    } catch (error) {
      console.error('Failed to delete slot:', error)
    }
  }

  const handleManageSlots = async (facilityId: string) => {
    setSelectedFacilityId(facilityId)
    await fetchSlots(facilityId)
    setShowSlotsModal(true)
  }

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'room',
      address: '',
      rules: '',
    })
    setEditingId(null)
    setShowForm(false)
  }

  const resetSlotForm = () => {
    setSlotFormData({
      starts_at: '',
      ends_at: '',
      status: 'open',
    })
    setShowSlotForm(false)
  }

  const formatDateForInput = (dateString: string) => {
    const date = new Date(dateString)
    return date.toISOString().slice(0, 16)
  }

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(date)
  }

  const getFacilityTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      room: '🚪',
      field: '🌳',
      court: '🏀',
      gym: '🏋️',
    }
    return icons[type] || '🏢'
  }

  const selectedFacility = facilities.find(f => f.id === selectedFacilityId)

  return (
    <AdminLayout>
      <div>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-display font-extrabold text-brand-neutral">
              Facilities
            </h1>
            <p className="text-brand-muted mt-1">
              Manage your recreation facilities and availability
            </p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="bg-brand-primary text-white font-bold px-6 py-3 rounded-xl hover:bg-brand-primaryHover transition-colors shadow-lg"
          >
            + Add Facility
          </button>
        </div>

        {/* Facility Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-brand-border">
                <h2 className="text-2xl font-display font-bold text-brand-neutral">
                  {editingId ? 'Edit Facility' : 'New Facility'}
                </h2>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-brand-neutral mb-1">
                    Facility Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="w-full px-4 py-3 border border-brand-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-ring"
                    placeholder="e.g., Community Gym"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-brand-neutral mb-1">
                    Type *
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    required
                    className="w-full px-4 py-3 border border-brand-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-ring"
                  >
                    <option value="room">Room</option>
                    <option value="field">Field</option>
                    <option value="court">Court</option>
                    <option value="gym">Gym</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-brand-neutral mb-1">
                    Address
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-4 py-3 border border-brand-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-ring"
                    placeholder="e.g., 123 Main St"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-brand-neutral mb-1">
                    Rules & Guidelines
                  </label>
                  <textarea
                    value={formData.rules}
                    onChange={(e) => setFormData({ ...formData, rules: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-3 border border-brand-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-ring"
                    placeholder="Booking rules, usage guidelines..."
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-brand-primary text-white font-bold py-3 px-6 rounded-xl hover:bg-brand-primaryHover transition-colors"
                  >
                    {editingId ? 'Update Facility' : 'Create Facility'}
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="flex-1 bg-gray-100 text-brand-neutral font-bold py-3 px-6 rounded-xl hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Slots Management Modal */}
        {showSlotsModal && selectedFacility && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-brand-border">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-display font-bold text-brand-neutral">
                      Time Slots - {selectedFacility.name}
                    </h2>
                    <p className="text-sm text-brand-muted mt-1">
                      Manage availability for this facility
                    </p>
                  </div>
                  <button
                    onClick={() => setShowSlotsModal(false)}
                    className="text-brand-muted hover:text-brand-neutral"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="p-6">
                {!showSlotForm ? (
                  <button
                    onClick={() => setShowSlotForm(true)}
                    className="w-full bg-brand-primary text-white font-bold py-3 px-6 rounded-xl hover:bg-brand-primaryHover transition-colors mb-6"
                  >
                    + Add Time Slot
                  </button>
                ) : (
                  <form onSubmit={handleSlotSubmit} className="bg-brand-bg p-4 rounded-xl mb-6 space-y-4">
                    <h3 className="font-bold text-brand-neutral">New Time Slot</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-brand-neutral mb-1">
                          Start Date & Time *
                        </label>
                        <input
                          type="datetime-local"
                          value={slotFormData.starts_at}
                          onChange={(e) => setSlotFormData({ ...slotFormData, starts_at: e.target.value })}
                          required
                          className="w-full px-4 py-2 border border-brand-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-ring"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-brand-neutral mb-1">
                          End Date & Time *
                        </label>
                        <input
                          type="datetime-local"
                          value={slotFormData.ends_at}
                          onChange={(e) => setSlotFormData({ ...slotFormData, ends_at: e.target.value })}
                          required
                          className="w-full px-4 py-2 border border-brand-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-ring"
                        />
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button
                        type="submit"
                        className="bg-brand-primary text-white font-semibold py-2 px-6 rounded-lg hover:bg-brand-primaryHover transition-colors"
                      >
                        Add Slot
                      </button>
                      <button
                        type="button"
                        onClick={resetSlotForm}
                        className="bg-gray-100 text-brand-neutral font-semibold py-2 px-6 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}

                <div className="space-y-3">
                  {slots.length === 0 ? (
                    <div className="text-center py-8 text-brand-muted">
                      No time slots yet. Add one to get started.
                    </div>
                  ) : (
                    slots.map((slot) => (
                      <div
                        key={slot.id}
                        className="flex items-center justify-between p-4 bg-white border border-brand-border rounded-lg hover:shadow-md transition-shadow"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">🕒</span>
                            <div>
                              <div className="font-semibold text-brand-neutral">
                                {formatDateTime(slot.starts_at)} - {formatDateTime(slot.ends_at)}
                              </div>
                              <div className="text-sm text-brand-muted mt-1">
                                Status: <span className={`font-medium ${
                                  slot.status === 'open' ? 'text-green-600' :
                                  slot.status === 'booked' ? 'text-blue-600' :
                                  'text-gray-600'
                                }`}>{slot.status}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteSlot(slot.id)}
                          className="text-red-600 hover:text-red-700 font-semibold px-4"
                        >
                          Delete
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Facilities List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="text-brand-muted">Loading facilities...</div>
          </div>
        ) : facilities.length === 0 ? (
          <div className="bg-white rounded-2xl border border-brand-border p-12 text-center">
            <div className="text-6xl mb-4">🏢</div>
            <h3 className="text-xl font-bold text-brand-neutral mb-2">
              No facilities yet
            </h3>
            <p className="text-brand-muted mb-6">
              Create your first facility to get started
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="bg-brand-primary text-white font-bold px-6 py-3 rounded-xl hover:bg-brand-primaryHover transition-colors"
            >
              Create First Facility
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {facilities.map((facility) => (
              <div
                key={facility.id}
                className="bg-white rounded-2xl border border-brand-border p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start gap-3 mb-3">
                  <span className="text-3xl">{getFacilityTypeIcon(facility.type)}</span>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-brand-neutral">
                      {facility.name}
                    </h3>
                    <p className="text-sm text-brand-muted capitalize">{facility.type}</p>
                  </div>
                </div>

                {facility.address && (
                  <div className="flex items-center gap-2 mb-3 text-sm">
                    <span className="text-brand-muted">📍</span>
                    <span className="text-brand-neutral">{facility.address}</span>
                  </div>
                )}

                {facility.rules && (
                  <p className="text-brand-muted text-sm mb-4 line-clamp-2">
                    {facility.rules}
                  </p>
                )}

                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => handleManageSlots(facility.id)}
                    className="flex-1 bg-brand-accent text-white font-semibold py-2 px-4 rounded-lg hover:bg-brand-accentHover transition-colors text-sm"
                  >
                    Slots
                  </button>
                  <button
                    onClick={() => handleEdit(facility)}
                    className="flex-1 bg-brand-primary text-white font-semibold py-2 px-4 rounded-lg hover:bg-brand-primaryHover transition-colors text-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(facility.id)}
                    className="bg-red-50 text-red-600 font-semibold py-2 px-4 rounded-lg hover:bg-red-100 transition-colors text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
