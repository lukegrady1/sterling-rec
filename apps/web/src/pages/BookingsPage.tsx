import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Calendar,
  Clock,
  MapPin,
  Loader2,
  X,
  CheckCircle2,
  AlertCircle,
  Building2,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { useMyBookings, useCancelBooking } from '@/lib/hooks'
import { FacilityBooking } from '@/lib/api'
import { format, parseISO, isPast } from 'date-fns'

export default function BookingsPage() {
  const [includeHistory, setIncludeHistory] = useState(false)
  const { data: bookings, isLoading, error } = useMyBookings(includeHistory)
  const cancelBooking = useCancelBooking()

  const [selectedBooking, setSelectedBooking] = useState<FacilityBooking | null>(null)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [cancellationReason, setCancellationReason] = useState('')

  const handleCancelBooking = async () => {
    if (!selectedBooking) return

    try {
      await cancelBooking.mutateAsync({
        bookingId: selectedBooking.id,
        reason: cancellationReason || undefined,
      })

      setShowCancelDialog(false)
      setSelectedBooking(null)
      setCancellationReason('')
    } catch (err) {
      console.error('Cancellation failed:', err)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-orange-50 via-white to-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-orange-600 mx-auto mb-4" />
          <p className="text-muted-foreground">Loading bookings...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-orange-50 via-white to-gray-50 flex items-center justify-center">
        <Card className="max-w-md p-6">
          <p className="text-red-600">Failed to load bookings. Please try again later.</p>
        </Card>
      </div>
    )
  }

  const upcomingBookings = bookings?.filter((b) => b.status === 'confirmed' && !isPast(parseISO(b.start_time))) || []
  const pastBookings = bookings?.filter((b) => b.status === 'confirmed' && isPast(parseISO(b.start_time))) || []
  const cancelledBookings = bookings?.filter((b) => b.status === 'cancelled') || []

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 via-white to-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-600 to-pink-600 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="flex items-start gap-4">
            <div className="p-4 bg-white/20 backdrop-blur-sm rounded-xl">
              <Calendar className="h-10 w-10" />
            </div>
            <div>
              <h1 className="text-4xl font-bold mb-2">My Bookings</h1>
              <p className="text-white/90 text-lg">View and manage your facility bookings</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="mb-6">
          <Button
            variant={includeHistory ? 'default' : 'outline'}
            onClick={() => setIncludeHistory(!includeHistory)}
          >
            {includeHistory ? 'Hide History' : 'Show History'}
          </Button>
        </div>

        {/* Upcoming Bookings */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <CheckCircle2 className="h-6 w-6 text-green-600" />
            Upcoming Bookings
          </h2>

          {upcomingBookings.length === 0 ? (
            <Card className="p-12 text-center">
              <Calendar className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Upcoming Bookings</h3>
              <p className="text-muted-foreground mb-4">
                You don't have any upcoming bookings at the moment.
              </p>
              <Button onClick={() => window.location.href = '/facilities'}>
                Browse Facilities
              </Button>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {upcomingBookings.map((booking, index) => (
                <motion.div
                  key={booking.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="h-full group hover:shadow-xl transition-shadow">
                    <CardHeader className="bg-gradient-to-br from-orange-50 to-red-50 border-b">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Building2 className="h-5 w-5 text-orange-600" />
                        {booking.facility?.name || 'Facility'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-4">
                      <div className="flex items-start gap-3">
                        <Calendar className="h-5 w-5 text-orange-600 mt-0.5" />
                        <div>
                          <p className="font-medium">{format(parseISO(booking.start_time), 'EEEE, MMMM d, yyyy')}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(parseISO(booking.start_time), 'h:mm a')} - {format(parseISO(booking.end_time), 'h:mm a')}
                          </p>
                        </div>
                      </div>

                      {booking.facility?.location && (
                        <div className="flex items-start gap-3">
                          <MapPin className="h-5 w-5 text-orange-600 mt-0.5" />
                          <p className="text-sm">{booking.facility.location}</p>
                        </div>
                      )}

                      {booking.notes && (
                        <div className="pt-3 border-t">
                          <p className="text-sm font-medium mb-1">Notes</p>
                          <p className="text-sm text-muted-foreground">{booking.notes}</p>
                        </div>
                      )}

                      <div className="pt-3 border-t">
                        <p className="text-xs text-muted-foreground">
                          Booked on {format(parseISO(booking.created_at), 'MMM d, yyyy')}
                        </p>
                      </div>

                      <Button
                        variant="destructive"
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          setSelectedBooking(booking)
                          setShowCancelDialog(true)
                        }}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Cancel Booking
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Past & Cancelled Bookings (if showing history) */}
        {includeHistory && (
          <>
            {pastBookings.length > 0 && (
              <div className="mb-12">
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                  <Clock className="h-6 w-6 text-gray-600" />
                  Past Bookings
                </h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {pastBookings.map((booking) => (
                    <Card key={booking.id} className="opacity-75">
                      <CardHeader className="bg-gradient-to-br from-gray-50 to-gray-100 border-b">
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <Building2 className="h-5 w-5 text-gray-600" />
                          {booking.facility?.name || 'Facility'}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-6 space-y-3">
                        <div className="flex items-start gap-3">
                          <Calendar className="h-5 w-5 text-gray-600 mt-0.5" />
                          <div>
                            <p className="font-medium">{format(parseISO(booking.start_time), 'EEEE, MMMM d, yyyy')}</p>
                            <p className="text-sm text-muted-foreground">
                              {format(parseISO(booking.start_time), 'h:mm a')} - {format(parseISO(booking.end_time), 'h:mm a')}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {cancelledBookings.length > 0 && (
              <div className="mb-12">
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                  <X className="h-6 w-6 text-red-600" />
                  Cancelled Bookings
                </h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {cancelledBookings.map((booking) => (
                    <Card key={booking.id} className="opacity-75 border-red-200">
                      <CardHeader className="bg-gradient-to-br from-red-50 to-red-100 border-b">
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <Building2 className="h-5 w-5 text-red-600" />
                          {booking.facility?.name || 'Facility'}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-6 space-y-3">
                        <div className="flex items-start gap-3">
                          <Calendar className="h-5 w-5 text-red-600 mt-0.5" />
                          <div>
                            <p className="font-medium">{format(parseISO(booking.start_time), 'EEEE, MMMM d, yyyy')}</p>
                            <p className="text-sm text-muted-foreground">
                              {format(parseISO(booking.start_time), 'h:mm a')} - {format(parseISO(booking.end_time), 'h:mm a')}
                            </p>
                          </div>
                        </div>
                        {booking.cancellation_reason && (
                          <div className="pt-3 border-t">
                            <p className="text-sm font-medium mb-1">Reason</p>
                            <p className="text-sm text-muted-foreground">{booking.cancellation_reason}</p>
                          </div>
                        )}
                        {booking.cancelled_at && (
                          <p className="text-xs text-muted-foreground">
                            Cancelled on {format(parseISO(booking.cancelled_at), 'MMM d, yyyy')}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Cancel Booking Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Booking</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this booking? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {selectedBooking && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded">
                <p className="font-semibold">{selectedBooking.facility?.name}</p>
                <p className="text-sm text-muted-foreground">
                  {format(parseISO(selectedBooking.start_time), 'EEEE, MMMM d, yyyy')}
                  <br />
                  {format(parseISO(selectedBooking.start_time), 'h:mm a')} -{' '}
                  {format(parseISO(selectedBooking.end_time), 'h:mm a')}
                </p>
              </div>

              <div>
                <Label htmlFor="reason">Reason for cancellation (optional)</Label>
                <Textarea
                  id="reason"
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  placeholder="Let us know why you're cancelling..."
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelDialog(false)}>
              Keep Booking
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelBooking}
              disabled={cancelBooking.isPending}
            >
              {cancelBooking.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Cancelling...
                </>
              ) : (
                'Cancel Booking'
              )}
            </Button>
          </DialogFooter>

          {cancelBooking.isError && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-600">
              <AlertCircle className="h-4 w-4 inline mr-2" />
              {(cancelBooking.error as any)?.response?.data?.error || 'Cancellation failed. Please try again.'}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
