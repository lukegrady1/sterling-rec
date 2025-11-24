import { useEffect, useState } from 'react'
import AdminLayout from '@/components/AdminLayout'
import { waiversAPI, Waiver } from '@/lib/api'
import {
  Plus,
  Edit,
  Trash2,
  FileText,
  AlertCircle
} from 'lucide-react'

export default function Waivers() {
  const [waivers, setWaivers] = useState<Waiver[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showActiveOnly, setShowActiveOnly] = useState(true)

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    body_html: '',
  })

  useEffect(() => {
    fetchWaivers()
  }, [showActiveOnly])

  const fetchWaivers = async () => {
    try {
      const response = await waiversAPI.list(showActiveOnly)
      setWaivers(response.waivers || [])
    } catch (error) {
      console.error('Failed to fetch waivers:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingId) {
        await waiversAPI.update(editingId, formData)
      } else {
        await waiversAPI.create(formData)
      }
      await fetchWaivers()
      resetForm()
    } catch (error) {
      console.error('Failed to save waiver:', error)
      alert('Failed to save waiver')
    }
  }

  const handleEdit = (waiver: Waiver) => {
    setFormData({
      title: waiver.title,
      description: waiver.description || '',
      body_html: waiver.body_html,
    })
    setEditingId(waiver.id)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to archive this waiver? This will soft-delete it but preserve historical acceptances.')) {
      return
    }
    try {
      await waiversAPI.delete(id)
      await fetchWaivers()
    } catch (error) {
      console.error('Failed to delete waiver:', error)
      alert('Failed to delete waiver')
    }
  }

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      body_html: '',
    })
    setEditingId(null)
    setShowForm(false)
  }

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Waivers</h1>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center gap-2"
          >
            <Plus size={20} />
            {showForm ? 'Cancel' : 'New Waiver'}
          </button>
        </div>

        {/* Filter */}
        <div className="mb-4">
          <label className="inline-flex items-center">
            <input
              type="checkbox"
              checked={showActiveOnly}
              onChange={(e) => setShowActiveOnly(e.target.checked)}
              className="form-checkbox h-5 w-5 text-blue-600"
            />
            <span className="ml-2 text-gray-700">Show active only</span>
          </label>
        </div>

        {/* Form */}
        {showForm && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">
              {editingId ? 'Edit Waiver' : 'Create New Waiver'}
            </h2>
            {editingId && (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md flex items-start gap-2">
                <AlertCircle size={20} className="text-yellow-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-yellow-800">
                  <strong>Version Control:</strong> If you change the waiver body, a new version will be automatically created. Historical acceptances will be preserved.
                </div>
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Brief summary of what this waiver covers"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Waiver Body (HTML)
                </label>
                <textarea
                  value={formData.body_html}
                  onChange={(e) => setFormData({ ...formData, body_html: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  rows={12}
                  required
                  placeholder="<p>Enter your waiver text here...</p>"
                />
                <p className="mt-1 text-xs text-gray-500">
                  You can use HTML tags for formatting. Preview will be shown to users exactly as written.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
                >
                  {editingId ? 'Update Waiver' : 'Create Waiver'}
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
          ) : waivers.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No waivers found. Create your first waiver to get started.
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
                  {waivers.map((waiver) => (
                    <tr key={waiver.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <FileText size={18} className="text-gray-400" />
                          <div>
                            <div className="font-medium text-gray-900">{waiver.title}</div>
                            <div className="text-xs text-gray-500">
                              Created {new Date(waiver.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 max-w-xs truncate">
                        {waiver.description || <span className="text-gray-400">No description</span>}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          v{waiver.version}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            waiver.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {waiver.is_active ? 'Active' : 'Archived'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-medium">
                        <button
                          onClick={() => handleEdit(waiver)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                          title="Edit"
                        >
                          <Edit size={18} />
                        </button>
                        {waiver.is_active && (
                          <button
                            onClick={() => handleDelete(waiver.id)}
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
