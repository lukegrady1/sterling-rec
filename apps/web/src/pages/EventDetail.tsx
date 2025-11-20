import { useParams, Link, useNavigate } from 'react-router-dom'
import { useEvent, useMe, useCreateRegistration } from '@/lib/hooks'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useState } from 'react'
import { useToast } from '@/components/ui/use-toast'
import { MapPin, Clock, Users } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'

export default function EventDetail() {
  const { slug } = useParams<{ slug: string }>()
  const { data: event, isLoading } = useEvent(slug!)
  const { data: meData } = useMe()
  const createRegistration = useCreateRegistration()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [selectedParticipant, setSelectedParticipant] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  if (isLoading) {
    return <div className="container mx-auto px-4 py-12">Loading...</div>
  }

  if (!event) {
    return <div className="container mx-auto px-4 py-12">Event not found</div>
  }

  const handleRegisterClick = () => {
    if (!meData?.user) {
      navigate(`/login?redirect=/events/${slug}`)
      return
    }
    setIsDialogOpen(true)
  }

  const handleConfirmRegistration = async () => {
    if (!selectedParticipant) return

    try {
      const result = await createRegistration.mutateAsync({
        parent_type: 'event',
        parent_id: event.id,
        participant_id: selectedParticipant,
      })

      setIsDialogOpen(false)
      setSelectedParticipant(null)

      if (result.data.waitlisted) {
        toast({
          title: 'Added to Waitlist',
          description: `You are #${result.data.position} on the waitlist. We'll notify you if a spot opens up.`,
        })
      } else {
        toast({
          title: 'Registration Confirmed!',
          description: 'You have been successfully registered for this event.',
        })
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Registration Failed',
        description: error.response?.data?.error || 'Failed to register',
      })
    }
  }

  const canRegister = event.spots_left !== undefined && (event.spots_left > 0 || event.waitlist_count !== undefined)

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link to="/events" className="text-primary hover:underline text-sm">
            ← Back to Events
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">{event.title}</CardTitle>
            <CardDescription>
              {event.starts_at && formatDateTime(event.starts_at)}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="font-semibold mb-2">Description</h3>
              <p className="text-muted-foreground">{event.description}</p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {event.location && (
                <div className="flex items-start gap-2">
                  <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-sm">Location</h4>
                    <p className="text-sm text-muted-foreground">{event.location}</p>
                  </div>
                </div>
              )}

              {event.starts_at && event.ends_at && (
                <div className="flex items-start gap-2">
                  <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-sm">Time</h4>
                    <p className="text-sm text-muted-foreground">
                      {new Date(event.starts_at).toLocaleTimeString([], {
                        hour: 'numeric',
                        minute: '2-digit',
                      })}{' '}
                      -{' '}
                      {new Date(event.ends_at).toLocaleTimeString([], {
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-2">
                <Users className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <h4 className="font-semibold text-sm">Availability</h4>
                  <p className="text-sm text-muted-foreground">
                    {event.spots_left !== undefined && event.spots_left > 0
                      ? `${event.spots_left} spots available`
                      : event.spots_left === 0
                      ? 'Full - Waitlist available'
                      : `${event.capacity} total capacity`}
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-4">
              <Button
                size="lg"
                className="w-full md:w-auto"
                onClick={handleRegisterClick}
                disabled={!canRegister}
              >
                {event.spots_left && event.spots_left > 0 ? 'Register Now' : 'Join Waitlist'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select Participant</DialogTitle>
            <DialogDescription>
              Choose who you want to register for {event.title}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            {meData?.participants && meData.participants.length > 0 ? (
              meData.participants.map((participant) => (
                <div
                  key={participant.id}
                  onClick={() => setSelectedParticipant(participant.id)}
                  className={`p-4 border rounded-lg cursor-pointer transition ${
                    selectedParticipant === participant.id
                      ? 'border-primary bg-primary/5'
                      : 'hover:border-muted-foreground'
                  }`}
                >
                  <p className="font-medium">
                    {participant.first_name} {participant.last_name}
                  </p>
                  {participant.dob && (
                    <p className="text-sm text-muted-foreground">
                      DOB: {new Date(participant.dob).toLocaleDateString()}
                    </p>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground mb-4">
                  No family members found. Add family members to register for events.
                </p>
                <Button asChild variant="outline">
                  <Link to="/account/family">Go to Family Management</Link>
                </Button>
              </div>
            )}
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmRegistration}
              disabled={!selectedParticipant || createRegistration.isPending}
            >
              {createRegistration.isPending ? 'Registering...' : 'Confirm Registration'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
