import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Participant } from '@/lib/api'
import { Edit, Trash2, Star } from 'lucide-react'

interface ParticipantCardProps {
  participant: Participant
  onEdit: (participant: Participant) => void
  onDelete: (id: string) => void
  onToggleFavorite: (id: string, isFavorite: boolean) => void
}

export function ParticipantCard({ participant, onEdit, onDelete, onToggleFavorite }: ParticipantCardProps) {
  const calculateAge = (dob?: string) => {
    if (!dob) return null
    const birthDate = new Date(dob)
    const today = new Date()
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    return age
  }

  const age = calculateAge(participant.dob)

  const formatGender = (gender?: string) => {
    if (!gender) return null
    const genderMap: Record<string, string> = {
      male: 'Male',
      female: 'Female',
      other: 'Other',
      prefer_not_to_say: 'Prefer not to say',
    }
    return genderMap[gender] || gender
  }

  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-lg font-semibold">
              {participant.first_name} {participant.last_name}
            </h3>
            <button
              onClick={() => onToggleFavorite(participant.id, !participant.is_favorite)}
              className="text-yellow-500 hover:text-yellow-600 transition-colors"
              title={participant.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Star className={`h-5 w-5 ${participant.is_favorite ? 'fill-current' : ''}`} />
            </button>
          </div>

          <div className="space-y-1 text-sm text-muted-foreground">
            {participant.dob && (
              <p>
                <span className="font-medium">Age:</span> {age} years
                {' '}
                <span className="text-xs">
                  (DOB: {new Date(participant.dob).toLocaleDateString()})
                </span>
              </p>
            )}
            {participant.gender && (
              <p>
                <span className="font-medium">Gender:</span> {formatGender(participant.gender)}
              </p>
            )}
            {participant.shirt_size && (
              <p>
                <span className="font-medium">Shirt Size:</span> {participant.shirt_size}
              </p>
            )}
            {participant.emergency_contact_name && (
              <p>
                <span className="font-medium">Emergency Contact:</span>{' '}
                {participant.emergency_contact_name}
                {participant.emergency_contact_phone && ` - ${participant.emergency_contact_phone}`}
              </p>
            )}
            {participant.medical_notes && (
              <p className="text-orange-600 dark:text-orange-400">
                <span className="font-medium">Medical Notes:</span> {participant.medical_notes}
              </p>
            )}
            {participant.notes && (
              <p>
                <span className="font-medium">Notes:</span> {participant.notes}
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-2 ml-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => onEdit(participant)}
            title="Edit participant"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              if (confirm(`Are you sure you want to delete ${participant.first_name} ${participant.last_name}?`)) {
                onDelete(participant.id)
              }
            }}
            title="Delete participant"
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>
    </Card>
  )
}
