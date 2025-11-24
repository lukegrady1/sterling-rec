import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { formsAPI, FormTemplate, Participant } from '@/lib/api'
import { FileText, Save, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { useDebounce } from '@/lib/hooks'

interface ParticipantFormsTabProps {
  participant: Participant
}

export function ParticipantFormsTab({ participant }: ParticipantFormsTabProps) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [selectedTemplate, setSelectedTemplate] = useState<FormTemplate | null>(null)
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  // Debounce form data for autosave
  const debouncedFormData = useDebounce(formData, 2000)

  // Fetch form templates
  const { data: templatesData } = useQuery({
    queryKey: ['form-templates'],
    queryFn: async () => {
      const response = await formsAPI.getTemplates()
      return response.data.form_templates
    },
  })

  // Fetch participant form submissions
  const { data: submissionsData, isLoading } = useQuery({
    queryKey: ['participant-forms', participant.id],
    queryFn: async () => {
      const response = await formsAPI.getParticipantForms(participant.id)
      return response.data.submissions
    },
  })

  // Save form mutation
  const saveForm = useMutation({
    mutationFn: ({ templateId, data }: { templateId: string; data: any }) =>
      formsAPI.saveParticipantForm(participant.id, templateId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['participant-forms', participant.id] })
      setHasUnsavedChanges(false)
      setLastSaved(new Date())
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to save form. Please try again.',
        variant: 'destructive',
      })
    },
  })

  // Autosave effect
  useEffect(() => {
    if (hasUnsavedChanges && selectedTemplate && Object.keys(debouncedFormData).length > 0) {
      saveForm.mutate({
        templateId: selectedTemplate.id,
        data: debouncedFormData,
      })
    }
  }, [debouncedFormData])

  // Load existing submission when template is selected
  useEffect(() => {
    if (selectedTemplate && submissionsData) {
      const existingSubmission = submissionsData.find(
        (s) => s.form_template_id === selectedTemplate.id
      )
      if (existingSubmission) {
        setFormData(existingSubmission.data_json)
        setLastSaved(new Date(existingSubmission.updated_at))
      } else {
        setFormData({})
        setLastSaved(null)
      }
      setHasUnsavedChanges(false)
    }
  }, [selectedTemplate, submissionsData])

  const handleFieldChange = (fieldId: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [fieldId]: value,
    }))
    setHasUnsavedChanges(true)
  }

  const handleManualSave = () => {
    if (selectedTemplate) {
      saveForm.mutate({
        templateId: selectedTemplate.id,
        data: formData,
      })
      toast({
        title: 'Form Saved',
        description: 'Your changes have been saved.',
      })
    }
  }

  const renderField = (field: any) => {
    const value = formData[field.id] || ''

    switch (field.type) {
      case 'text':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id}>
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input
              id={field.id}
              type="text"
              value={value}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              placeholder={field.placeholder}
              required={field.required}
            />
          </div>
        )

      case 'textarea':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id}>
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Textarea
              id={field.id}
              value={value}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              placeholder={field.placeholder}
              required={field.required}
              rows={4}
            />
          </div>
        )

      case 'select':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id}>
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <select
              id={field.id}
              value={value}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              required={field.required}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select...</option>
              {field.options?.map((option: string) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        )

      case 'checkbox':
        return (
          <div key={field.id} className="flex items-center space-x-2">
            <input
              type="checkbox"
              id={field.id}
              checked={value || false}
              onChange={(e) => handleFieldChange(field.id, e.target.checked)}
              className="form-checkbox h-5 w-5 text-blue-600"
            />
            <Label htmlFor={field.id} className="font-normal">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
          </div>
        )

      default:
        return null
    }
  }

  const templates = templatesData || []

  if (isLoading) {
    return <div className="p-4 text-center text-gray-500">Loading forms...</div>
  }

  if (templates.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        <FileText size={48} className="mx-auto mb-4 text-gray-400" />
        <p>No forms available at this time.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
        <p className="text-sm text-blue-800">
          <strong>Auto-save enabled:</strong> Forms for {participant.first_name} are automatically
          saved as you type. Your information will be remembered for future registrations.
        </p>
      </div>

      {/* Template Selection */}
      {!selectedTemplate ? (
        <div className="grid gap-4 md:grid-cols-2">
          {templates.map((template) => {
            const submission = submissionsData?.find((s) => s.form_template_id === template.id)
            const isComplete = submission && Object.keys(submission.data_json).length > 0

            return (
              <div
                key={template.id}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedTemplate(template)}
              >
                <div className="flex items-start gap-3">
                  <FileText className="text-gray-400 flex-shrink-0" size={24} />
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{template.title}</h3>
                    {template.description && (
                      <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                    )}
                    <div className="mt-2">
                      {isComplete ? (
                        <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full">
                          Completed
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-1 bg-gray-100 text-gray-800 rounded-full">
                          Not Started
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        // Form Editor
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{selectedTemplate.title}</h2>
              {selectedTemplate.description && (
                <p className="text-gray-600 mt-1">{selectedTemplate.description}</p>
              )}
            </div>
            <Button variant="outline" onClick={() => setSelectedTemplate(null)}>
              Back to Forms
            </Button>
          </div>

          {/* Autosave Status */}
          <div className="mb-4 flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center gap-2">
              {saveForm.isPending ? (
                <>
                  <Clock className="animate-spin" size={16} />
                  <span>Saving...</span>
                </>
              ) : hasUnsavedChanges ? (
                <>
                  <Clock size={16} />
                  <span>Unsaved changes</span>
                </>
              ) : lastSaved ? (
                <>
                  <Save size={16} className="text-green-600" />
                  <span>Saved at {lastSaved.toLocaleTimeString()}</span>
                </>
              ) : (
                <span>New form</span>
              )}
            </div>
            <Button size="sm" onClick={handleManualSave} disabled={saveForm.isPending}>
              <Save size={16} className="mr-2" />
              Save Now
            </Button>
          </div>

          {/* Form Fields */}
          <form className="space-y-4">
            {selectedTemplate.schema_json.fields?.map(renderField)}
          </form>
        </div>
      )}
    </div>
  )
}
