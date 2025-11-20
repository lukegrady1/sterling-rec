import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { ParticipantCard } from '@/components/ParticipantCard'
import { ParticipantDialog } from '@/components/ParticipantDialog'
import { householdAPI, participantsAPI, Household, Participant } from '@/lib/api'
import { Plus, Save } from 'lucide-react'

export default function FamilyPage() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [isParticipantDialogOpen, setIsParticipantDialogOpen] = useState(false)
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null)
  const [householdData, setHouseholdData] = useState<Partial<Household>>({})

  // Fetch household
  const { data: household, isLoading: loadingHousehold } = useQuery({
    queryKey: ['household'],
    queryFn: async () => {
      const response = await householdAPI.get()
      setHouseholdData(response.household)
      return response.household as Household
    },
  })

  // Fetch participants
  const { data: participants = [], isLoading: loadingParticipants } = useQuery({
    queryKey: ['participants'],
    queryFn: async () => {
      try {
        const response = await participantsAPI.list()
        return (response.participants || []) as Participant[]
      } catch (error) {
        // If household doesn't exist yet, return empty array
        return []
      }
    },
    enabled: !!household, // Only fetch participants if household exists
  })

  // Update household mutation
  const updateHousehold = useMutation({
    mutationFn: (updates: Partial<Household>) => householdAPI.update(updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['household'] })
      toast({
        title: 'Success',
        description: 'Household information updated',
      })
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.error || 'Failed to update household',
      })
    },
  })

  // Create participant mutation
  const createParticipant = useMutation({
    mutationFn: (data: Partial<Participant>) => participantsAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['participants'] })
      toast({
        title: 'Success',
        description: 'Participant added',
      })
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.error || 'Failed to add participant',
      })
    },
  })

  // Update participant mutation
  const updateParticipant = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Participant> }) =>
      participantsAPI.update(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['participants'] })
      toast({
        title: 'Success',
        description: 'Participant updated',
      })
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.error || 'Failed to update participant',
      })
    },
  })

  // Delete participant mutation
  const deleteParticipant = useMutation({
    mutationFn: (id: string) => participantsAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['participants'] })
      toast({
        title: 'Success',
        description: 'Participant removed',
      })
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.error || 'Failed to remove participant',
      })
    },
  })

  const handleSaveHousehold = async () => {
    await updateHousehold.mutateAsync(householdData)
  }

  const handleSaveParticipant = async (data: Partial<Participant>) => {
    try {
      if (selectedParticipant) {
        await updateParticipant.mutateAsync({ id: selectedParticipant.id, updates: data })
      } else {
        await createParticipant.mutateAsync(data)
      }
      setIsParticipantDialogOpen(false)
      setSelectedParticipant(null)
    } catch (error) {
      // Error handling is done in the mutation's onError
    }
  }

  const handleEditParticipant = (participant: Participant) => {
    setSelectedParticipant(participant)
    setIsParticipantDialogOpen(true)
  }

  const handleAddParticipant = () => {
    setSelectedParticipant(null)
    setIsParticipantDialogOpen(true)
  }

  const handleToggleFavorite = async (id: string, isFavorite: boolean) => {
    await updateParticipant.mutateAsync({ id, updates: { is_favorite: isFavorite } })
  }

  if (loadingHousehold || loadingParticipants) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-center text-muted-foreground">Loading...</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Family Management</h1>
          <p className="text-muted-foreground">
            Manage your household information and family members for program registration
          </p>
        </div>

        {/* Household Information */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Household Information</h2>
            <Button
              onClick={handleSaveHousehold}
              disabled={updateHousehold.isPending}
            >
              <Save className="h-4 w-4 mr-2" />
              Save Household
            </Button>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="household_name">Household Name</Label>
              <Input
                id="household_name"
                value={householdData.name || ''}
                onChange={(e) => setHouseholdData({ ...householdData, name: e.target.value })}
                placeholder="Smith Family"
              />
            </div>
            <div>
              <Label htmlFor="household_phone">Phone</Label>
              <Input
                id="household_phone"
                type="tel"
                value={householdData.phone || ''}
                onChange={(e) => setHouseholdData({ ...householdData, phone: e.target.value })}
                placeholder="(555) 123-4567"
              />
            </div>
            <div>
              <Label htmlFor="household_email">Email</Label>
              <Input
                id="household_email"
                type="email"
                value={householdData.email || ''}
                onChange={(e) => setHouseholdData({ ...householdData, email: e.target.value })}
                placeholder="family@example.com"
              />
            </div>
            <div>
              <Label htmlFor="address_line1">Address</Label>
              <Input
                id="address_line1"
                value={householdData.address_line1 || ''}
                onChange={(e) => setHouseholdData({ ...householdData, address_line1: e.target.value })}
                placeholder="123 Main St"
              />
            </div>
            <div>
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={householdData.city || ''}
                onChange={(e) => setHouseholdData({ ...householdData, city: e.target.value })}
                placeholder="Sterling"
              />
            </div>
            <div>
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                value={householdData.state || ''}
                onChange={(e) => setHouseholdData({ ...householdData, state: e.target.value })}
                placeholder="VA"
                maxLength={2}
              />
            </div>
            <div>
              <Label htmlFor="zip">ZIP Code</Label>
              <Input
                id="zip"
                value={householdData.zip || ''}
                onChange={(e) => setHouseholdData({ ...householdData, zip: e.target.value })}
                placeholder="20164"
              />
            </div>
          </div>
        </Card>

        {/* Family Members */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold">Family Members</h2>
              <p className="text-sm text-muted-foreground">
                Add family members to register for programs and events
              </p>
            </div>
            <Button onClick={handleAddParticipant}>
              <Plus className="h-4 w-4 mr-2" />
              Add Family Member
            </Button>
          </div>

          {participants.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground mb-4">
                No family members added yet. Add your first family member to get started.
              </p>
              <Button onClick={handleAddParticipant}>
                <Plus className="h-4 w-4 mr-2" />
                Add Family Member
              </Button>
            </Card>
          ) : (
            <div className="space-y-3">
              {participants.map((participant) => (
                <ParticipantCard
                  key={participant.id}
                  participant={participant}
                  onEdit={handleEditParticipant}
                  onDelete={(id) => deleteParticipant.mutate(id)}
                  onToggleFavorite={handleToggleFavorite}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <ParticipantDialog
        open={isParticipantDialogOpen}
        onOpenChange={setIsParticipantDialogOpen}
        participant={selectedParticipant}
        onSave={handleSaveParticipant}
      />
    </div>
  )
}
