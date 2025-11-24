import { useEffect, useState } from 'react'
import AdminLayout from '@/components/AdminLayout'
import { formsAPI, FormTemplate } from '@/lib/api'
import {
  Plus,
  Edit,
  Trash2,
  FileText,
  AlertCircle
} from 'lucide-react'

export default function FormTemplates() {
  const [templates, setTemplates] = useState<FormTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showActiveOnly, setShowActiveOnly] = useState(true)
  const [typeFilter, setTypeFilter] = useState<string>('all')

  const [formData, setFormData] = useState({
    type: 'custom' as 'medical' | 'emergency' | 'custom',
    title: '',
    description: '',
    schema_json: '',
  })

  useEffect(() => {
    fetchTemplates()
  }, [showActiveOnly, typeFilter])

  const fetchTemplates = async () => {
    try {
      const filterType = typeFilter === 'all' ? undefined : typeFilter
      const response = await formsAPI.listTemplates(filterType, showActiveOnly)
      setTemplates(response.form_templates || [])
    } catch (error) {
      console.error('Failed to fetch form templates:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      // Parse schema_json to validate it's valid JSON
      let schemaObj
      try {
        schemaObj = JSON.parse(formData.schema_json)
      } catch (err) {
        alert('Invalid JSON in schema. Please check your formatting.')
        return
      }

      const payload = {
        type: formData.type,
        title: formData.title,
        description: formData.description || undefined,
        schema_json: schemaObj,
      }

      if (editingId) {
        await formsAPI.updateTemplate(editingId, payload)
      } else {
        await formsAPI.createTemplate(payload)
      }
      await fetchTemplates()
      resetForm()
    } catch (error) {
      console.error('Failed to save form template:', error)
      alert('Failed to save form template')
    }
  }

  const handleEdit = (template: FormTemplate) => {
    setFormData({
      type: template.type,
      title: template.title,
      description: template.description || '',
      schema_json: JSON.stringify(template.schema_json, null, 2),
    })
    setEditingId(template.id)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to archive this form template?')) {
      return
    }
    try {
      await formsAPI.deleteTemplate(id)
      await fetchTemplates()
    } catch (error) {
      console.error('Failed to delete form template:', error)
      alert('Failed to delete form template')
    }
  }

  const resetForm = () => {
    setFormData({
      type: 'custom',
      title: '',
      description: '',
      schema_json: '',
    })
    setEditingId(null)
    setShowForm(false)
  }

  const sampleSchema = {
    fields: [
      {
        id: 'field1',
        type: 'text',
        label: 'Full Name',
        required: true
      },
      {
        id: 'field2',
        type: 'textarea',
        label: 'Medical Conditions',
        required: false,
        placeholder: 'List any medical conditions...'
      },
      {
        id: 'field3',
        type: 'select',
        label: 'T-Shirt Size',
        required: true,
        options: ['XS', 'S', 'M', 'L', 'XL']
      }
    ]
  }

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Form Templates</h1>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center gap-2"
          >
            <Plus size={20} />
            {showForm ? 'Cancel' : 'New Form Template'}
          </button>
        </div>

        {/* Filters */}
        <div className="mb-4 flex gap-4">
          <label className="inline-flex items-center">
            <input
              type="checkbox"
              checked={showActiveOnly}
              onChange={(e) => setShowActiveOnly(e.target.checked)}
              className="form-checkbox h-5 w-5 text-blue-600"
            />
            <span className="ml-2 text-gray-700">Show active only</span>
          </label>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Types</option>
            <option value="medical">Medical</option>
            <option value="emergency">Emergency</option>
            <option value="custom">Custom</option>
          </select>
        </div>

        {/* Form */}
        {showForm && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">
              {editingId ? 'Edit Form Template' : 'Create New Form Template'}
            </h2>
            {editingId && (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md flex items-start gap-2">
                <AlertCircle size={20} className="text-yellow-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-yellow-800">
                  <strong>Version Control:</strong> If you change the schema, a new version will be automatically created.
                </div>
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="medical">Medical</option>
                    <option value="emergency">Emergency</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Brief description of this form"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Form Schema (JSON)
                </label>
                <textarea
                  value={formData.schema_json}
                  onChange={(e) => setFormData({ ...formData, schema_json: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  rows={15}
                  required
                  placeholder={JSON.stringify(sampleSchema, null, 2)}
                />
                <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-sm text-blue-800 mb-2"><strong>Sample Schema:</strong></p>
                  <pre className="text-xs text-blue-700 overflow-x-auto">
                    {JSON.stringify(sampleSchema, null, 2)}
                  </pre>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
                >
                  {editingId ? 'Update Template' : 'Create Template'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-md"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* List */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading...</div>
          ) : templates.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No form templates found. Create your first template to get started.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Title
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Version
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {templates.map((template) => (
                    <tr key={template.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <FileText size={18} className="text-gray-400" />
                          <div>
                            <div className="font-medium text-gray-900">{template.title}</div>
                            <div className="text-xs text-gray-500">
                              Created {new Date(template.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          template.type === 'medical' ? 'bg-red-100 text-red-800' :
                          template.type === 'emergency' ? 'bg-orange-100 text-orange-800' :
                          'bg-purple-100 text-purple-800'
                        }`}>
                          {template.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 max-w-xs truncate">
                        {template.description || <span className="text-gray-400">No description</span>}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          v{template.version}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            template.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {template.is_active ? 'Active' : 'Archived'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-medium">
                        <button
                          onClick={() => handleEdit(template)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                          title="Edit"
                        >
                          <Edit size={18} />
                        </button>
                        {template.is_active && (
                          <button
                            onClick={() => handleDelete(template.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Archive"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}
