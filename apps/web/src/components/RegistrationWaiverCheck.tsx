import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { waiversAPI, ParticipantWaiverStatus, Participant } from '@/lib/api'
import { CheckCircle, AlertCircle, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'

interface RegistrationWaiverCheckProps {
  programId: string
  participant: Participant
  onAllWaiversAccepted: () => void
  onCancel: () => void
}

export function RegistrationWaiverCheck({
  programId,
  participant,
  onAllWaiversAccepted,
  onCancel
}: RegistrationWaiverCheckProps) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [selectedWaiver, setSelectedWaiver] = useState<ParticipantWaiverStatus | null>(null)

  // Fetch program waivers for this participant
  const { data: waiversData, isLoading } = useQuery({
    queryKey: ['participant-program-waivers', participant.id, programId],
    queryFn: async () => {
      const response = await waiversAPI.getParticipantWaivers(participant.id, programId)
      return response.data.waivers
    },
  })

  // Accept waiver mutation
  const acceptWaiver = useMutation({
    mutationFn: ({ waiverId }: { waiverId: string }) =>
      waiversAPI.acceptParticipantWaiver(participant.id, waiverId, programId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['participant-program-waivers', participant.id, programId] })
      toast({
        title: 'Waiver Accepted',
        description: 'You can now proceed with registration.',
      })
      setSelectedWaiver(null)
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to accept waiver. Please try again.',
        variant: 'destructive',
      })
    },
  })

  if (isLoading) {
    return (
      <div className="p-6 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Checking waiver requirements...</p>
      </div>
    )
  }

  const waivers = waiversData || []
  const requiredWaivers = waivers.filter((w) => w.program_waiver.is_required)
  const allRequiredAccepted = requiredWaivers.every((w) => w.is_accepted && !w.requires_new_version)
  const pendingWaivers = requiredWaivers.filter((w) => !w.is_accepted || w.requires_new_version)

  // If all required waivers are accepted, show success and proceed
  if (allRequiredAccepted && !selectedWaiver) {
    return (
      <div className="p-6">
        <div className="text-center mb-6">
          <CheckCircle size={48} className="mx-auto mb-4 text-green-600" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">All Waivers Completed!</h3>
          <p className="text-gray-600">
            {participant.first_name} has accepted all required waivers for this program.
          </p>
        </div>

        <div className="space-y-3 mb-6">
          {requiredWaivers.map((status) => (
            <div
              key={status.waiver.id}
              className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-md"
            >
              <div className="flex items-center gap-2">
                <CheckCircle size={20} className="text-green-600" />
                <span className="font-medium text-gray-900">{status.waiver.title}</span>
              </div>
              <span className="text-sm text-green-700">Accepted</span>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <Button onClick={onAllWaiversAccepted} className="flex-1">
            Continue to Registration
          </Button>
          <Button variant="outline" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {!selectedWaiver ? (
        <>
          <div className="mb-6">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Required Waivers</h3>
            <p className="text-gray-600">
              {participant.first_name} must accept the following waivers before registering:
            </p>
          </div>

          <div className="space-y-3 mb-6">
            {pendingWaivers.map((status) => (
              <div
                key={status.waiver.id}
                className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-start gap-2">
                    <AlertCircle size={20} className="text-yellow-600 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-gray-900">{status.waiver.title}</h4>
                      {status.waiver.description && (
                        <p className="text-sm text-gray-600 mt-1">{status.waiver.description}</p>
                      )}
                      {status.requires_new_version && (
                        <p className="text-sm text-yellow-700 mt-1">
                          This waiver has been updated. Please review and accept the new version.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => setSelectedWaiver(status)}
                  className="w-full mt-2"
                >
                  Review & Accept Waiver
                </Button>
              </div>
            ))}
          </div>

          <Button variant="outline" onClick={onCancel} className="w-full">
            Cancel Registration
          </Button>
        </>
      ) : (
        // Show selected waiver
        <div>
          <div className="mb-4">
            <h3 className="text-xl font-bold text-gray-900">{selectedWaiver.waiver.title}</h3>
            <p className="text-sm text-gray-600 mt-1">Version {selectedWaiver.waiver.version}</p>
          </div>

          <div
            className="prose max-w-none mb-6 p-4 bg-gray-50 rounded-md border border-gray-200 max-h-96 overflow-y-auto"
            dangerouslySetInnerHTML={{ __html: selectedWaiver.waiver.body_html }}
          />

          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-4">
            <p className="text-sm text-yellow-800">
              By clicking "I Accept" below, you acknowledge that you have read and agree to the terms
              of this waiver on behalf of {participant.first_name} {participant.last_name}.
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={() => acceptWaiver.mutate({ waiverId: selectedWaiver.waiver.id })}
              disabled={acceptWaiver.isPending}
              className="flex-1"
            >
              {acceptWaiver.isPending ? 'Processing...' : 'I Accept'}
            </Button>
            <Button
              variant="outline"
              onClick={() => setSelectedWaiver(null)}
              className="flex-1"
            >
              Back to List
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
