import { useParams, Link, useNavigate } from 'react-router-dom'
import { useProgram, useMe, useCreateRegistration } from '@/lib/hooks'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useState } from 'react'
import { useToast } from '@/components/ui/use-toast'
import { MapPin, Calendar, Users } from 'lucide-react'
import { RegistrationWaiverCheck } from '@/components/RegistrationWaiverCheck'
import { Participant } from '@/lib/api'

export default function ProgramDetail() {
  const { slug } = useParams<{ slug: string }>()
  const { data: program, isLoading } = useProgram(slug!)
  const { data: meData } = useMe()
  const createRegistration = useCreateRegistration()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [selectedParticipant, setSelectedParticipant] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [showWaiverCheck, setShowWaiverCheck] = useState(false)

  if (isLoading) {
    return <div className="container mx-auto px-4 py-12">Loading...</div>
  }

  if (!program) {
    return <div className="container mx-auto px-4 py-12">Program not found</div>
  }

  const handleRegisterClick = () => {
    if (!meData?.user) {
      navigate(`/login?redirect=/programs/${slug}`)
      return
    }
    setIsDialogOpen(true)
  }

  const handleConfirmRegistration = async () => {
    if (!selectedParticipant) return

    try {
      const result = await createRegistration.mutateAsync({
        parent_type: 'program',
        parent_id: program.id,
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
          description: 'You have been successfully registered for this program.',
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

  const canRegister = program.spots_left !== undefined && (program.spots_left > 0 || program.waitlist_count !== undefined)

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link to="/programs" className="text-primary hover:underline text-sm">
            ← Back to Programs
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">{program.title}</CardTitle>
            <CardDescription>
              {program.age_min && program.age_max
                ? `Ages ${program.age_min}-${program.age_max}`
                : 'All ages'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="font-semibold mb-2">Description</h3>
              <p className="text-muted-foreground">{program.description}</p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {program.location && (
                <div className="flex items-start gap-2">
                  <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-sm">Location</h4>
                    <p className="text-sm text-muted-foreground">{program.location}</p>
                  </div>
                </div>
              )}

              {program.start_date && program.end_date && (
                <div className="flex items-start gap-2">
                  <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-sm">Schedule</h4>
                    <p className="text-sm text-muted-foreground">
                      {new Date(program.start_date).toLocaleDateString()} -{' '}
                      {new Date(program.end_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-2">
                <Users className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <h4 className="font-semibold text-sm">Availability</h4>
                  <p className="text-sm text-muted-foreground">
                    {program.spots_left !== undefined && program.spots_left > 0
                      ? `${program.spots_left} spots available`
                      : program.spots_left === 0
                      ? 'Full - Waitlist available'
                      : `${program.capacity} total capacity`}
                  </p>
                </div>
              </div>
            </div>

            {program.schedule_notes && (
              <div>
                <h3 className="font-semibold mb-2">Schedule Notes</h3>
                <p className="text-sm text-muted-foreground">{program.schedule_notes}</p>
              </div>
            )}

            <div className="pt-4">
              <Button
                size="lg"
                className="w-full md:w-auto"
                onClick={handleRegisterClick}
                disabled={!canRegister}
              >
                {program.spots_left && program.spots_left > 0 ? 'Register Now' : 'Join Waitlist'}
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
              Choose who you want to register for {program.title}
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
                  No family members found. Add family members to register for programs.
                </p>
                <Button asChild variant="outline">
                  <Link to="/account/family">Go to Family Management</Link>
                </Button>
              </div>
            )}
          </div>

          {!showWaiverCheck ? (
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (selectedParticipant) {
                    setShowWaiverCheck(true)
                  }
                }}
                disabled={!selectedParticipant}
              >
                Continue
              </Button>
            </div>
          ) : (
            selectedParticipant && (
              <RegistrationWaiverCheck
                programId={program.id}
                participant={meData?.participants.find((p) => p.id === selectedParticipant)!}
                onAllWaiversAccepted={handleConfirmRegistration}
                onCancel={() => {
                  setShowWaiverCheck(false)
                  setSelectedParticipant(null)
                  setIsDialogOpen(false)
                }}
              />
            )
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
