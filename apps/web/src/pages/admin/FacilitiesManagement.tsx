import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import AdminLayout from '@/components/AdminLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Building2, Calendar, Clock, Plus, Trash2, Loader2 } from 'lucide-react'
import { facilitiesAPI, Facility, AvailabilityWindow } from '@/lib/api'

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export default function FacilitiesManagement() {
  const queryClient = useQueryClient()
  const [showFacilityForm, setShowFacilityForm] = useState(false)
  const [showAvailabilityForm, setShowAvailabilityForm] = useState(false)
  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null)
  const [facilityForm, setFacilityForm] = useState({
    slug: '',
    name: '',
    description: '',
    facility_type: 'room',
    location: '',
    capacity: '',
    min_booking_duration_minutes: '30',
    max_booking_duration_minutes: '180',
    buffer_minutes: '0',
    advance_booking_days: '30',
    cancellation_cutoff_hours: '24',
    is_active: true,
  })

  const [availabilityForm, setAvailabilityForm] = useState({
    day_of_week: '1',
    start_time: '09:00',
    end_time: '17:00',
  })

  // Queries
  const { data: facilitiesData, isLoading } = useQuery({
    queryKey: ['admin', 'facilities'],
    queryFn: () => facilitiesAPI.list(),
  })

  const facilities = facilitiesData?.facilities || []

  // Mutations
  const createFacility = useMutation({
    mutationFn: (data: any) => facilitiesAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'facilities'] })
      setShowFacilityForm(false)
      resetFacilityForm()
    },
  })

  const deleteFacility = useMutation({
    mutationFn: (id: string) => facilitiesAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'facilities'] })
    },
  })

  const createWindow = useMutation({
    mutationFn: ({ facilityId, window }: { facilityId: string; window: any }) =>
      facilitiesAPI.createAvailabilityWindow(facilityId, window),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'facilities'] })
      resetAvailabilityForm()
    },
  })

  const deleteWindow = useMutation({
    mutationFn: ({ facilityId, windowId }: { facilityId: string; windowId: string }) =>
      facilitiesAPI.deleteAvailabilityWindow(facilityId, windowId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'facilities'] })
    },
  })

  const resetFacilityForm = () => {
    setFacilityForm({
      slug: '',
      name: '',
      description: '',
      facility_type: 'room',
      location: '',
      capacity: '',
      min_booking_duration_minutes: '30',
      max_booking_duration_minutes: '180',
      buffer_minutes: '0',
      advance_booking_days: '30',
      cancellation_cutoff_hours: '24',
      is_active: true,
    })
  }

  const resetAvailabilityForm = () => {
    setAvailabilityForm({
      day_of_week: '1',
      start_time: '09:00',
      end_time: '17:00',
    })
  }

  const handleCreateFacility = () => {
    const data = {
      ...facilityForm,
      capacity: facilityForm.capacity ? parseInt(facilityForm.capacity) : undefined,
      min_booking_duration_minutes: parseInt(facilityForm.min_booking_duration_minutes),
      max_booking_duration_minutes: parseInt(facilityForm.max_booking_duration_minutes),
      buffer_minutes: parseInt(facilityForm.buffer_minutes),
      advance_booking_days: parseInt(facilityForm.advance_booking_days),
      cancellation_cutoff_hours: parseInt(facilityForm.cancellation_cutoff_hours),
    }
    createFacility.mutate(data)
  }

  const handleCreateWindow = () => {
    if (!selectedFacility) return
    createWindow.mutate({
      facilityId: selectedFacility.id,
      window: {
        day_of_week: parseInt(availabilityForm.day_of_week),
        start_time: availabilityForm.start_time + ':00',
        end_time: availabilityForm.end_time + ':00',
      },
    })
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Facilities Management</h1>
            <p className="text-muted-foreground mt-1">
              Manage bookable facilities and their availability
            </p>
          </div>
          <Button onClick={() => setShowFacilityForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Facility
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-orange-600 mx-auto mb-4" />
            <p className="text-muted-foreground">Loading facilities...</p>
          </div>
        ) : facilities.length === 0 ? (
          <Card className="p-12 text-center">
            <Building2 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No facilities yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first facility to get started
            </p>
            <Button onClick={() => setShowFacilityForm(true)}>Create First Facility</Button>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {facilities.map((facility: Facility) => (
              <Card key={facility.id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    {facility.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-sm space-y-2">
                    <p>
                      <strong>Type:</strong> {facility.facility_type}
                    </p>
                    <p>
                      <strong>Slug:</strong> {facility.slug}
                    </p>
                    {facility.location && (
                      <p>
                        <strong>Location:</strong> {facility.location}
                      </p>
                    )}
                    <p>
                      <strong>Duration:</strong> {facility.min_booking_duration_minutes}-
                      {facility.max_booking_duration_minutes} min
                    </p>
                    <p>
                      <strong>Status:</strong>{' '}
                      <span className={facility.is_active ? 'text-green-600' : 'text-red-600'}>
                        {facility.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </p>
                  </div>

                  {/* Availability Windows */}
                  <div className="pt-4 border-t">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-semibold text-sm">Availability</h4>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedFacility(facility)
                          setShowAvailabilityForm(true)
                        }}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add
                      </Button>
                    </div>
                    {facility.availability_windows && facility.availability_windows.length > 0 ? (
                      <div className="space-y-1">
                        {facility.availability_windows.map((window: AvailabilityWindow) => (
                          <div
                            key={window.id}
                            className="flex justify-between items-center text-xs bg-gray-50 p-2 rounded"
                          >
                            <span>
                              {dayNames[window.day_of_week]}: {window.start_time.slice(0, 5)} -{' '}
                              {window.end_time.slice(0, 5)}
                            </span>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0"
                              onClick={() =>
                                deleteWindow.mutate({
                                  facilityId: facility.id,
                                  windowId: window.id,
                                })
                              }
                            >
                              <Trash2 className="h-3 w-3 text-red-600" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">No availability set</p>
                    )}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="destructive"
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        if (confirm('Delete this facility?')) {
                          deleteFacility.mutate(facility.id)
                        }
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Create Facility Dialog */}
        <Dialog open={showFacilityForm} onOpenChange={setShowFacilityForm}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Facility</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Name *</Label>
                  <Input
                    value={facilityForm.name}
                    onChange={(e) => setFacilityForm({ ...facilityForm, name: e.target.value })}
                    placeholder="Tennis Court #1"
                  />
                </div>
                <div>
                  <Label>Slug *</Label>
                  <Input
                    value={facilityForm.slug}
                    onChange={(e) => setFacilityForm({ ...facilityForm, slug: e.target.value })}
                    placeholder="tennis-court-1"
                  />
                </div>
              </div>

              <div>
                <Label>Description</Label>
                <Textarea
                  value={facilityForm.description}
                  onChange={(e) => setFacilityForm({ ...facilityForm, description: e.target.value })}
                  placeholder="Outdoor tennis court with lighting"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Type *</Label>
                  <select
                    className="w-full px-3 py-2 border rounded-md"
                    value={facilityForm.facility_type}
                    onChange={(e) =>
                      setFacilityForm({ ...facilityForm, facility_type: e.target.value })
                    }
                  >
                    <option value="field">Field</option>
                    <option value="court">Court</option>
                    <option value="room">Room</option>
                  </select>
                </div>
                <div>
                  <Label>Location</Label>
                  <Input
                    value={facilityForm.location}
                    onChange={(e) => setFacilityForm({ ...facilityForm, location: e.target.value })}
                    placeholder="123 Main St"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <Label>Capacity</Label>
                  <Input
                    type="number"
                    value={facilityForm.capacity}
                    onChange={(e) => setFacilityForm({ ...facilityForm, capacity: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Min Duration (min) *</Label>
                  <Input
                    type="number"
                    value={facilityForm.min_booking_duration_minutes}
                    onChange={(e) =>
                      setFacilityForm({
                        ...facilityForm,
                        min_booking_duration_minutes: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <Label>Max Duration (min) *</Label>
                  <Input
                    type="number"
                    value={facilityForm.max_booking_duration_minutes}
                    onChange={(e) =>
                      setFacilityForm({
                        ...facilityForm,
                        max_booking_duration_minutes: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <Label>Buffer (min) *</Label>
                  <Input
                    type="number"
                    value={facilityForm.buffer_minutes}
                    onChange={(e) =>
                      setFacilityForm({ ...facilityForm, buffer_minutes: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>Advance Booking (days) *</Label>
                  <Input
                    type="number"
                    value={facilityForm.advance_booking_days}
                    onChange={(e) =>
                      setFacilityForm({ ...facilityForm, advance_booking_days: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>Cancel Cutoff (hours) *</Label>
                  <Input
                    type="number"
                    value={facilityForm.cancellation_cutoff_hours}
                    onChange={(e) =>
                      setFacilityForm({
                        ...facilityForm,
                        cancellation_cutoff_hours: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowFacilityForm(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateFacility} disabled={createFacility.isPending}>
                {createFacility.isPending ? 'Creating...' : 'Create Facility'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Availability Window Dialog */}
        <Dialog open={showAvailabilityForm} onOpenChange={setShowAvailabilityForm}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Availability Window</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Day of Week *</Label>
                <select
                  className="w-full px-3 py-2 border rounded-md"
                  value={availabilityForm.day_of_week}
                  onChange={(e) =>
                    setAvailabilityForm({ ...availabilityForm, day_of_week: e.target.value })
                  }
                >
                  {dayNames.map((day, idx) => (
                    <option key={idx} value={idx}>
                      {day}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Start Time *</Label>
                  <Input
                    type="time"
                    value={availabilityForm.start_time}
                    onChange={(e) =>
                      setAvailabilityForm({ ...availabilityForm, start_time: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>End Time *</Label>
                  <Input
                    type="time"
                    value={availabilityForm.end_time}
                    onChange={(e) =>
                      setAvailabilityForm({ ...availabilityForm, end_time: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAvailabilityForm(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateWindow} disabled={createWindow.isPending}>
                {createWindow.isPending ? 'Adding...' : 'Add Window'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  )
}
