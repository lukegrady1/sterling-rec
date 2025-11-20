import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Building2,
  Calendar,
  Clock,
  MapPin,
  Users,
  Loader2,
  ArrowLeft,
  AlertCircle,
  Check,
  CheckCircle2,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { useFacility, useFacilityAvailability, useCreateBooking, useMe } from '@/lib/hooks'
import { AvailabilitySlot } from '@/lib/api'
import { format, addDays, parseISO } from 'date-fns'

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export default function FacilityDetail() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { data: facility, isLoading, error } = useFacility(slug!)
  const { data: me } = useMe()
  const createBooking = useCreateBooking()

  // Booking form state
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [duration, setDuration] = useState(60)
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null)
  const [notes, setNotes] = useState('')
  const [showBookingDialog, setShowBookingDialog] = useState(false)
  const [showSuccessDialog, setShowSuccessDialog] = useState(false)

  // Fetch availability
  const endDate = format(addDays(parseISO(selectedDate), 7), 'yyyy-MM-dd')
  const { data: slots, isLoading: slotsLoading } = useFacilityAvailability(
    slug!,
    selectedDate,
    endDate,
    duration,
    !!facility
  )

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-orange-50 via-white to-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-orange-600 mx-auto mb-4" />
          <p className="text-muted-foreground">Loading facility...</p>
        </div>
      </div>
    )
  }

  if (error || !facility) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-orange-50 via-white to-gray-50 flex items-center justify-center">
        <Card className="max-w-md p-6">
          <p className="text-red-600">Facility not found.</p>
          <Button onClick={() => navigate('/facilities')} className="mt-4">
            Back to Facilities
          </Button>
        </Card>
      </div>
    )
  }

  const handleBooking = async () => {
    if (!selectedSlot || !me) return

    try {
      const idempotencyKey = `${me.user.id}-${selectedSlot.start_time}-${Date.now()}`

      await createBooking.mutateAsync({
        facility_id: facility.id,
        start_time: selectedSlot.start_time,
        end_time: selectedSlot.end_time,
        notes: notes || undefined,
        idempotency_key: idempotencyKey,
      })

      setShowBookingDialog(false)
      setShowSuccessDialog(true)
      setSelectedSlot(null)
      setNotes('')
    } catch (err: any) {
      console.error('Booking failed:', err)
    }
  }

  const groupSlotsByDate = (slots: AvailabilitySlot[] | undefined) => {
    if (!slots) return {}

    const grouped: Record<string, AvailabilitySlot[]> = {}
    slots.forEach((slot) => {
      const date = format(parseISO(slot.start_time), 'yyyy-MM-dd')
      if (!grouped[date]) {
        grouped[date] = []
      }
      grouped[date].push(slot)
    })
    return grouped
  }

  const slotsByDate = groupSlotsByDate(slots)
  const availabilityDays = facility.availability_windows
    ? Array.from(new Set(facility.availability_windows.map((w) => dayNames[w.day_of_week])))
    : []

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 via-white to-gray-50 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-600 to-pink-600 text-white py-12">
        <div className="container mx-auto px-4">
          <Button
            variant="ghost"
            className="text-white hover:bg-white/20 mb-4"
            onClick={() => navigate('/facilities')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Facilities
          </Button>

          <div className="flex items-start gap-4">
            <div className="p-4 bg-white/20 backdrop-blur-sm rounded-xl">
              <Building2 className="h-10 w-10" />
            </div>
            <div>
              <h1 className="text-4xl font-bold mb-2">{facility.name}</h1>
              {facility.description && (
                <p className="text-white/90 text-lg">{facility.description}</p>
              )}
              <div className="flex flex-wrap gap-3 mt-4">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <span>{facility.location || 'Sterling'}</span>
                </div>
                {facility.capacity && (
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span>Capacity: {facility.capacity}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Facility Info */}
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-orange-600" />
                  Booking Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2 text-sm">Duration</h4>
                  <p className="text-sm text-muted-foreground">
                    {facility.min_booking_duration_minutes} - {facility.max_booking_duration_minutes} minutes
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2 text-sm">Advance Booking</h4>
                  <p className="text-sm text-muted-foreground">
                    Up to {facility.advance_booking_days} days in advance
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2 text-sm">Cancellation Policy</h4>
                  <p className="text-sm text-muted-foreground">
                    Cancel up to {facility.cancellation_cutoff_hours} hours before your booking
                  </p>
                </div>
                {facility.buffer_minutes > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2 text-sm">Buffer Time</h4>
                    <p className="text-sm text-muted-foreground">
                      {facility.buffer_minutes} minutes between bookings
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {availabilityDays.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-orange-600" />
                    Available Days
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {availabilityDays.map((day) => (
                      <span
                        key={day}
                        className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium"
                      >
                        {day}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {!me && (
              <Card className="border-orange-200 bg-orange-50">
                <CardContent className="pt-6">
                  <AlertCircle className="h-8 w-8 text-orange-600 mb-2" />
                  <p className="text-sm font-medium mb-2">Login Required</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    You must be logged in to book this facility.
                  </p>
                  <Button
                    onClick={() => navigate('/login?redirect=/facilities/' + slug)}
                    className="w-full"
                  >
                    Login to Book
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Availability */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Check Availability</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="date">Start Date</Label>
                    <Input
                      id="date"
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      min={format(new Date(), 'yyyy-MM-dd')}
                      max={format(addDays(new Date(), facility.advance_booking_days), 'yyyy-MM-dd')}
                    />
                  </div>
                  <div>
                    <Label htmlFor="duration">Duration (minutes)</Label>
                    <Input
                      id="duration"
                      type="number"
                      value={duration}
                      onChange={(e) => setDuration(parseInt(e.target.value))}
                      min={facility.min_booking_duration_minutes}
                      max={facility.max_booking_duration_minutes}
                      step={facility.min_booking_duration_minutes}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {slotsLoading ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-orange-600 mx-auto mb-2" />
                  <p className="text-muted-foreground">Loading available slots...</p>
                </CardContent>
              </Card>
            ) : Object.keys(slotsByDate).length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Available Slots</h3>
                  <p className="text-muted-foreground">
                    No availability found for the selected date range and duration. Try adjusting your search.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {Object.entries(slotsByDate).map(([date, dateSlots]) => (
                  <Card key={date}>
                    <CardHeader>
                      <CardTitle className="text-lg">
                        {format(parseISO(date), 'EEEE, MMMM d, yyyy')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {dateSlots.map((slot, idx) => {
                          const startTime = parseISO(slot.start_time)
                          const endTime = parseISO(slot.end_time)

                          return (
                            <motion.div
                              key={idx}
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: idx * 0.05 }}
                            >
                              <Button
                                variant={selectedSlot === slot ? 'default' : 'outline'}
                                className="w-full justify-start gap-2"
                                onClick={() => {
                                  setSelectedSlot(slot)
                                  if (me) setShowBookingDialog(true)
                                }}
                                disabled={!me}
                              >
                                {selectedSlot === slot && <Check className="h-4 w-4" />}
                                <Clock className="h-4 w-4" />
                                <span>
                                  {format(startTime, 'h:mm a')} - {format(endTime, 'h:mm a')}
                                </span>
                              </Button>
                            </motion.div>
                          )
                        })}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Booking Confirmation Dialog */}
      <Dialog open={showBookingDialog} onOpenChange={setShowBookingDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Booking</DialogTitle>
            <DialogDescription>
              Review your booking details before confirming.
            </DialogDescription>
          </DialogHeader>

          {selectedSlot && (
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Facility</h4>
                <p className="text-muted-foreground">{facility.name}</p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Time</h4>
                <p className="text-muted-foreground">
                  {format(parseISO(selectedSlot.start_time), 'EEEE, MMMM d, yyyy')}
                  <br />
                  {format(parseISO(selectedSlot.start_time), 'h:mm a')} -{' '}
                  {format(parseISO(selectedSlot.end_time), 'h:mm a')}
                </p>
              </div>
              <div>
                <Label htmlFor="notes">Notes (optional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any special requests or notes..."
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBookingDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleBooking}
              disabled={createBooking.isPending}
              className="bg-gradient-to-r from-orange-600 to-pink-600 hover:from-orange-700 hover:to-pink-700"
            >
              {createBooking.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Booking...
                </>
              ) : (
                'Confirm Booking'
              )}
            </Button>
          </DialogFooter>

          {createBooking.isError && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-600">
              <AlertCircle className="h-4 w-4 inline mr-2" />
              {(createBooking.error as any)?.response?.data?.error || 'Booking failed. Please try again.'}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent>
          <DialogHeader>
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="h-10 w-10 text-green-600" />
              </div>
              <DialogTitle className="text-2xl">Booking Confirmed!</DialogTitle>
              <DialogDescription className="mt-2">
                Your booking has been confirmed. You'll receive a confirmation email shortly.
              </DialogDescription>
            </div>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setShowSuccessDialog(false)
                navigate('/bookings')
              }}
            >
              View My Bookings
            </Button>
            <Button
              onClick={() => setShowSuccessDialog(false)}
              className="bg-gradient-to-r from-orange-600 to-pink-600"
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
