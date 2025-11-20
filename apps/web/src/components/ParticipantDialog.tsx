import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Participant } from '@/lib/api'

interface ParticipantDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  participant?: Participant | null
  onSave: (data: Partial<Participant>) => Promise<void>
}

export function ParticipantDialog({ open, onOpenChange, participant, onSave }: ParticipantDialogProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    dob: '',
    gender: '',
    shirt_size: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    notes: '',
    medical_notes: '',
    is_favorite: false,
  })

  useEffect(() => {
    if (participant) {
      setFormData({
        first_name: participant.first_name || '',
        last_name: participant.last_name || '',
        dob: participant.dob || '',
        gender: participant.gender || '',
        shirt_size: participant.shirt_size || '',
        emergency_contact_name: participant.emergency_contact_name || '',
        emergency_contact_phone: participant.emergency_contact_phone || '',
        notes: participant.notes || '',
        medical_notes: participant.medical_notes || '',
        is_favorite: participant.is_favorite || false,
      })
    } else {
      setFormData({
        first_name: '',
        last_name: '',
        dob: '',
        gender: '',
        shirt_size: '',
        emergency_contact_name: '',
        emergency_contact_phone: '',
        notes: '',
        medical_notes: '',
        is_favorite: false,
      })
    }
  }, [participant, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await onSave(formData)
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to save participant:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{participant ? 'Edit Participant' : 'Add Participant'}</DialogTitle>
          <DialogDescription>
            {participant ? 'Update participant information' : 'Add a new family member for program registration'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Basic Information */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="first_name">First Name *</Label>
              <Input
                id="first_name"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="last_name">Last Name *</Label>
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="dob">Date of Birth</Label>
              <Input
                id="dob"
                type="date"
                value={formData.dob}
                onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="gender">Gender</Label>
              <select
                id="gender"
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Select...</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
                <option value="prefer_not_to_say">Prefer not to say</option>
              </select>
            </div>
            <div>
              <Label htmlFor="shirt_size">Shirt Size</Label>
              <select
                id="shirt_size"
                value={formData.shirt_size}
                onChange={(e) => setFormData({ ...formData, shirt_size: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Select...</option>
                <option value="YXS">Youth XS</option>
                <option value="YS">Youth S</option>
                <option value="YM">Youth M</option>
                <option value="YL">Youth L</option>
                <option value="YXL">Youth XL</option>
                <option value="AS">Adult S</option>
                <option value="AM">Adult M</option>
                <option value="AL">Adult L</option>
                <option value="AXL">Adult XL</option>
                <option value="A2XL">Adult 2XL</option>
                <option value="A3XL">Adult 3XL</option>
              </select>
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="border-t pt-4">
            <h3 className="font-semibold mb-3">Emergency Contact</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="emergency_contact_name">Contact Name</Label>
                <Input
                  id="emergency_contact_name"
                  value={formData.emergency_contact_name}
                  onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="emergency_contact_phone">Contact Phone</Label>
                <Input
                  id="emergency_contact_phone"
                  type="tel"
                  value={formData.emergency_contact_phone}
                  onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="border-t pt-4">
            <h3 className="font-semibold mb-3">Additional Information</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="notes">General Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Any additional information (hobbies, preferences, etc.)"
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="medical_notes">Medical Notes</Label>
                <Textarea
                  id="medical_notes"
                  value={formData.medical_notes}
                  onChange={(e) => setFormData({ ...formData, medical_notes: e.target.value })}
                  placeholder="Allergies, medications, medical conditions, etc."
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* Favorite */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_favorite"
              checked={formData.is_favorite}
              onChange={(e) => setFormData({ ...formData, is_favorite: e.target.checked })}
              className="h-4 w-4"
            />
            <Label htmlFor="is_favorite" className="cursor-pointer">
              Mark as favorite (appears first in lists)
            </Label>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : participant ? 'Update' : 'Add'} Participant
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
