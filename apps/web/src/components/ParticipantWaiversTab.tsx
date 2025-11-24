import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { waiversAPI, ParticipantWaiverStatus, Participant } from '@/lib/api'
import { CheckCircle, AlertCircle, XCircle, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'

interface ParticipantWaiversTabProps {
  participant: Participant
}

export function ParticipantWaiversTab({ participant }: ParticipantWaiversTabProps) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [selectedWaiver, setSelectedWaiver] = useState<ParticipantWaiverStatus | null>(null)
  const [showWaiverModal, setShowWaiverModal] = useState(false)

  // Fetch participant waivers
  const { data: waiversData, isLoading } = useQuery({
    queryKey: ['participant-waivers', participant.id],
    queryFn: async () => {
      const response = await waiversAPI.getParticipantWaivers(participant.id)
      return response.data.waivers
    },
  })

  // Accept waiver mutation
  const acceptWaiver = useMutation({
    mutationFn: ({ waiverId, programId }: { waiverId: string; programId?: string }) =>
      waiversAPI.acceptParticipantWaiver(participant.id, waiverId, programId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['participant-waivers', participant.id] })
      toast({
        title: 'Waiver Accepted',
        description: 'The waiver has been successfully accepted.',
      })
      setShowWaiverModal(false)
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

  const handleAcceptWaiver = () => {
    if (!selectedWaiver) return
    acceptWaiver.mutate({
      waiverId: selectedWaiver.waiver.id,
      programId: selectedWaiver.program_waiver.program_id,
    })
  }

  const getStatusIcon = (status: ParticipantWaiverStatus) => {
    if (status.is_accepted && !status.requires_new_version) {
      return <CheckCircle className="text-green-600" size={20} />
    } else if (status.requires_new_version) {
      return <AlertCircle className="text-yellow-600" size={20} />
    } else {
      return <XCircle className="text-red-600" size={20} />
    }
  }

  const getStatusText = (status: ParticipantWaiverStatus) => {
    if (status.is_accepted && !status.requires_new_version) {
      return 'Completed'
    } else if (status.requires_new_version) {
      return 'Needs Review (Updated)'
    } else if (status.program_waiver.is_required) {
      return 'Required'
    } else {
      return 'Optional'
    }
  }

  if (isLoading) {
    return <div className="p-4 text-center text-gray-500">Loading waivers...</div>
  }

  const waivers = waiversData || []

  if (waivers.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        <FileText size={48} className="mx-auto mb-4 text-gray-400" />
        <p>No waivers required for {participant.first_name} at this time.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-4">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> Waivers you sign here will apply to all future registrations for{' '}
          {participant.first_name}. You only need to sign each waiver once unless it's updated.
        </p>
      </div>

      {waivers.map((status) => (
        <div
          key={status.waiver.id}
          className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1">
              {getStatusIcon(status)}
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">{status.waiver.title}</h3>
                {status.waiver.description && (
                  <p className="text-sm text-gray-600 mt-1">{status.waiver.description}</p>
                )}
                <div className="mt-2 flex items-center gap-4 text-sm">
                  <span
                    className={`font-medium ${
                      status.is_accepted && !status.requires_new_version
                        ? 'text-green-600'
                        : status.requires_new_version
                        ? 'text-yellow-600'
                        : 'text-red-600'
                    }`}
                  >
                    {getStatusText(status)}
                  </span>
                  <span className="text-gray-500">Version {status.waiver.version}</span>
                  {status.acceptance && (
                    <span className="text-gray-500">
                      Signed {new Date(status.acceptance.accepted_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="ml-4">
              <Button
                variant={status.is_accepted && !status.requires_new_version ? 'outline' : 'default'}
                size="sm"
                onClick={() => {
                  setSelectedWaiver(status)
                  setShowWaiverModal(true)
                }}
              >
                {status.is_accepted && !status.requires_new_version ? 'View' : 'Review & Sign'}
              </Button>
            </div>
          </div>
        </div>
      ))}

      {/* Waiver Modal */}
      {showWaiverModal && selectedWaiver && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {selectedWaiver.waiver.title}
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Version {selectedWaiver.waiver.version}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowWaiverModal(false)
                    setSelectedWaiver(null)
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle size={24} />
                </button>
              </div>

              {/* Waiver Body */}
              <div
                className="prose max-w-none mb-6 p-4 bg-gray-50 rounded-md border border-gray-200"
                dangerouslySetInnerHTML={{ __html: selectedWaiver.waiver.body_html }}
              />

              {/* Acceptance Section */}
              {!selectedWaiver.is_accepted || selectedWaiver.requires_new_version ? (
                <div className="border-t pt-4">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-4">
                    <p className="text-sm text-yellow-800">
                      By clicking "I Accept" below, you acknowledge that you have read and agree to
                      the terms of this waiver on behalf of {participant.first_name}{' '}
                      {participant.last_name}.
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <Button
                      onClick={handleAcceptWaiver}
                      disabled={acceptWaiver.isPending}
                      className="flex-1"
                    >
                      {acceptWaiver.isPending ? 'Processing...' : 'I Accept'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowWaiverModal(false)
                        setSelectedWaiver(null)
                      }}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="border-t pt-4">
                  <div className="bg-green-50 border border-green-200 rounded-md p-4 flex items-center gap-2">
                    <CheckCircle className="text-green-600" size={20} />
                    <p className="text-sm text-green-800">
                      This waiver was accepted on{' '}
                      {selectedWaiver.acceptance &&
                        new Date(selectedWaiver.acceptance.accepted_at).toLocaleString()}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowWaiverModal(false)
                      setSelectedWaiver(null)
                    }}
                    className="w-full mt-4"
                  >
                    Close
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
