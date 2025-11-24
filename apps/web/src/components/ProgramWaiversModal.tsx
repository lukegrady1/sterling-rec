import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { waiversAPI, Waiver, ProgramWaiver } from '@/lib/api'
import { X, Plus, Trash2, FileText, CheckCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'

interface ProgramWaiversModalProps {
  programId: string
  programTitle: string
  onClose: () => void
}

export function ProgramWaiversModal({ programId, programTitle, onClose }: ProgramWaiversModalProps) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedWaiverId, setSelectedWaiverId] = useState<string>('')
  const [isRequired, setIsRequired] = useState(true)
  const [isPerSeason, setIsPerSeason] = useState(false)

  // Fetch all waivers
  const { data: allWaivers = [] } = useQuery({
    queryKey: ['waivers'],
    queryFn: async () => {
      const response = await waiversAPI.list(true)
      return response.waivers as Waiver[]
    },
  })

  // Fetch program waivers
  const { data: programWaivers = [], isLoading } = useQuery({
    queryKey: ['program-waivers', programId],
    queryFn: async () => {
      const response = await waiversAPI.getProgramWaivers(programId)
      return response.data.waivers as ProgramWaiver[]
    },
  })

  // Assign waiver mutation
  const assignWaiver = useMutation({
    mutationFn: ({ waiverId, isRequired, isPerSeason }: { waiverId: string; isRequired: boolean; isPerSeason: boolean }) =>
      waiversAPI.assignToProgram(programId, waiverId, isRequired, isPerSeason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['program-waivers', programId] })
      toast({
        title: 'Waiver Assigned',
        description: 'The waiver has been assigned to this program.',
      })
      setShowAddModal(false)
      resetForm()
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to assign waiver. It may already be assigned.',
        variant: 'destructive',
      })
    },
  })

  // Remove waiver mutation
  const removeWaiver = useMutation({
    mutationFn: (waiverId: string) => waiversAPI.removeFromProgram(programId, waiverId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['program-waivers', programId] })
      toast({
        title: 'Waiver Removed',
        description: 'The waiver has been removed from this program.',
      })
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to remove waiver.',
        variant: 'destructive',
      })
    },
  })

  const resetForm = () => {
    setSelectedWaiverId('')
    setIsRequired(true)
    setIsPerSeason(false)
  }

  const handleAssign = () => {
    if (!selectedWaiverId) {
      toast({
        title: 'Error',
        description: 'Please select a waiver.',
        variant: 'destructive',
      })
      return
    }
    assignWaiver.mutate({ waiverId: selectedWaiverId, isRequired, isPerSeason })
  }

  const handleRemove = (waiverId: string, waiverTitle: string) => {
    if (confirm(`Are you sure you want to remove "${waiverTitle}" from this program?`)) {
      removeWaiver.mutate(waiverId)
    }
  }

  // Filter out already assigned waivers
  const assignedWaiverIds = new Set(programWaivers.map((pw) => pw.waiver_id))
  const availableWaivers = allWaivers.filter((w) => !assignedWaiverIds.has(w.id))

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Program Waivers</h2>
              <p className="text-gray-600 mt-1">{programTitle}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={24} />
            </button>
          </div>

          {/* Info Banner */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-800">
              <strong>Tip:</strong> Assign waivers that participants must accept before registering for this program.
              Mark waivers as "Required" to enforce acceptance, or "Per Season" if acceptance is needed for each season.
            </p>
          </div>

          {/* Add Button */}
          <div className="mb-4">
            <Button
              onClick={() => setShowAddModal(true)}
              disabled={availableWaivers.length === 0}
            >
              <Plus size={18} className="mr-2" />
              Assign Waiver
            </Button>
            {availableWaivers.length === 0 && programWaivers.length > 0 && (
              <span className="ml-3 text-sm text-gray-500">All active waivers are assigned</span>
            )}
          </div>

          {/* Assigned Waivers List */}
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Loading waivers...</div>
          ) : programWaivers.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <FileText size={48} className="mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600 mb-2">No waivers assigned to this program yet.</p>
              <p className="text-sm text-gray-500">Click "Assign Waiver" to add one.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {programWaivers.map((pw) => (
                <div
                  key={pw.id}
                  className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex items-start justify-between"
                >
                  <div className="flex items-start gap-3 flex-1">
                    <FileText className="text-gray-400 flex-shrink-0 mt-1" size={20} />
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {pw.waiver?.title || 'Untitled Waiver'}
                      </h3>
                      {pw.waiver?.description && (
                        <p className="text-sm text-gray-600 mt-1">{pw.waiver.description}</p>
                      )}
                      <div className="mt-2 flex items-center gap-2">
                        {pw.is_required ? (
                          <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                            <AlertCircle size={12} className="mr-1" />
                            Required
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-gray-200 text-gray-700 rounded-full">
                            Optional
                          </span>
                        )}
                        {pw.is_per_season && (
                          <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                            Per Season
                          </span>
                        )}
                        {pw.waiver && (
                          <span className="text-xs text-gray-500">v{pw.waiver.version}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemove(pw.waiver_id, pw.waiver?.title || 'this waiver')}
                    className="text-red-600 hover:text-red-800 ml-4"
                    title="Remove waiver"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add Waiver Modal */}
          {showAddModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg max-w-md w-full p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Assign Waiver to Program</h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Select Waiver
                    </label>
                    <select
                      value={selectedWaiverId}
                      onChange={(e) => setSelectedWaiverId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Choose a waiver...</option>
                      {availableWaivers.map((waiver) => (
                        <option key={waiver.id} value={waiver.id}>
                          {waiver.title} (v{waiver.version})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={isRequired}
                        onChange={(e) => setIsRequired(e.target.checked)}
                        className="form-checkbox h-5 w-5 text-blue-600"
                      />
                      <span className="ml-2 text-sm text-gray-700">
                        <strong>Required:</strong> Participants must accept this waiver before registering
                      </span>
                    </label>

                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={isPerSeason}
                        onChange={(e) => setIsPerSeason(e.target.checked)}
                        className="form-checkbox h-5 w-5 text-blue-600"
                      />
                      <span className="ml-2 text-sm text-gray-700">
                        <strong>Per Season:</strong> Must be accepted each season (otherwise one-time acceptance)
                      </span>
                    </label>
                  </div>
                </div>

                <div className="mt-6 flex gap-2">
                  <Button
                    onClick={handleAssign}
                    disabled={assignWaiver.isPending || !selectedWaiverId}
                    className="flex-1"
                  >
                    {assignWaiver.isPending ? 'Assigning...' : 'Assign Waiver'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowAddModal(false)
                      resetForm()
                    }}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
