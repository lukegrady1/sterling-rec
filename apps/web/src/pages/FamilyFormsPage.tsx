import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { participantsAPI, Participant } from '@/lib/api'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ParticipantWaiversTab } from '@/components/ParticipantWaiversTab'
import { ParticipantFormsTab } from '@/components/ParticipantFormsTab'
import { FileText, ClipboardList, UserCircle } from 'lucide-react'

export default function FamilyFormsPage() {
  const [selectedParticipantId, setSelectedParticipantId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'waivers' | 'forms'>('waivers')

  // Fetch participants
  const { data: participants = [], isLoading } = useQuery({
    queryKey: ['participants'],
    queryFn: async () => {
      const response = await participantsAPI.list()
      return (response.participants || []) as Participant[]
    },
  })

  // Auto-select first participant
  const selectedParticipant = selectedParticipantId
    ? participants.find((p) => p.id === selectedParticipantId)
    : participants[0]

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading family information...</p>
        </div>
      </div>
    )
  }

  if (participants.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-3xl font-bold text-gray-900 mb-6">Family & Forms</h1>
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <UserCircle size={64} className="mx-auto mb-4 text-gray-400" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">No Children Added</h2>
              <p className="text-gray-600 mb-6">
                You need to add children to your family account before managing waivers and forms.
              </p>
              <a
                href="/account/family"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Go to Family Page
              </a>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Family & Forms</h1>
            <p className="text-gray-600">
              Manage waivers and forms for your children. Information saved here will apply to all
              future registrations.
            </p>
          </div>

          {/* Participant Selection Tabs */}
          <div className="mb-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-2">
              <div className="flex gap-2 overflow-x-auto">
                {participants.map((participant) => (
                  <button
                    key={participant.id}
                    onClick={() => setSelectedParticipantId(participant.id)}
                    className={`px-4 py-2 rounded-md font-medium whitespace-nowrap transition-colors ${
                      selectedParticipant?.id === participant.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {participant.first_name} {participant.last_name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Content Area */}
          {selectedParticipant && (
            <div className="bg-white rounded-lg shadow-md border border-gray-200">
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
                <div className="border-b border-gray-200">
                  <TabsList className="w-full grid grid-cols-2 bg-transparent h-auto p-0">
                    <TabsTrigger
                      value="waivers"
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent py-4 px-6"
                    >
                      <FileText size={20} className="mr-2" />
                      <span className="font-semibold">Waivers</span>
                    </TabsTrigger>
                    <TabsTrigger
                      value="forms"
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent py-4 px-6"
                    >
                      <ClipboardList size={20} className="mr-2" />
                      <span className="font-semibold">Forms</span>
                    </TabsTrigger>
                  </TabsList>
                </div>

                <div className="p-6">
                  <TabsContent value="waivers" className="m-0">
                    <ParticipantWaiversTab participant={selectedParticipant} />
                  </TabsContent>

                  <TabsContent value="forms" className="m-0">
                    <ParticipantFormsTab participant={selectedParticipant} />
                  </TabsContent>
                </div>
              </Tabs>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
