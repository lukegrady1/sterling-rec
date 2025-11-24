import { useEffect, useState, useMemo } from 'react'
import AdminLayout from '@/components/AdminLayout'
import { programsAPI } from '@/lib/api'
import { ProgramWaiversModal } from '@/components/ProgramWaiversModal'
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  ColumnDef,
  flexRender,
  SortingState,
  ColumnFiltersState
} from '@tanstack/react-table'
import {
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Copy,
  FileText,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'

interface Program {
  id: string
  title: string
  description: string
  season: string
  category?: string
  start_date?: string
  end_date?: string
  price_cents: number
  status: string
  image_url?: string
  slug?: string
  created_at: string
}

export default function Programs() {
  const [programs, setPrograms] = useState<Program[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [waiversModalProgram, setWaiversModalProgram] = useState<Program | null>(null)

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    season: '',
    category: '',
    start_date: '',
    end_date: '',
    price_cents: 0,
    status: 'active',
  })

  useEffect(() => {
    fetchPrograms()
  }, [])

  const fetchPrograms = async () => {
    try {
      const response = await programsAPI.list()
      setPrograms(response.programs || [])
    } catch (error) {
      console.error('Failed to fetch programs:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingId) {
        await programsAPI.update(editingId, formData)
      } else {
        await programsAPI.create(formData)
      }
      await fetchPrograms()
      resetForm()
    } catch (error) {
      console.error('Failed to save program:', error)
      alert('Failed to save program')
    }
  }

  const handleEdit = (program: Program) => {
    setFormData({
      title: program.title,
      description: program.description,
      season: program.season,
      category: program.category || '',
      start_date: program.start_date || '',
      end_date: program.end_date || '',
      price_cents: program.price_cents,
      status: program.status,
    })
    setEditingId(program.id)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this program?')) return
    try {
      await programsAPI.delete(id)
      await fetchPrograms()
    } catch (error) {
      console.error('Failed to delete program:', error)
      alert('Failed to delete program')
    }
  }

  const handleDuplicate = async (program: Program) => {
    try {
      await programsAPI.create({
        title: `${program.title} (Copy)`,
        description: program.description,
        season: program.season,
        category: program.category || '',
        start_date: program.start_date || '',
        end_date: program.end_date || '',
        price_cents: program.price_cents,
        status: 'draft',
      })
      await fetchPrograms()
    } catch (error) {
      console.error('Failed to duplicate program:', error)
      alert('Failed to duplicate program')
    }
  }

  const handleToggleStatus = async (program: Program) => {
    const newStatus = program.status === 'active' ? 'inactive' : 'active'
    try {
      await programsAPI.update(program.id, { ...program, status: newStatus })
      await fetchPrograms()
    } catch (error) {
      console.error('Failed to update status:', error)
    }
  }

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      season: '',
      category: '',
      start_date: '',
      end_date: '',
      price_cents: 0,
      status: 'active',
    })
    setEditingId(null)
    setShowForm(false)
  }

  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString()
  }

  const columns = useMemo<ColumnDef<Program>[]>(
    () => [
      {
        accessorKey: 'title',
        header: 'Program Name',
        cell: ({ row }) => (
          <button
            onClick={() => handleEdit(row.original)}
            className="text-left font-semibold text-brand-primary hover:underline"
          >
            {row.original.title}
          </button>
        ),
      },
      {
        accessorKey: 'season',
        header: 'Season',
        cell: ({ row }) => (
          <span className="text-sm text-brand-neutral">
            {row.original.season || '-'}
          </span>
        ),
      },
      {
        accessorKey: 'category',
        header: 'Category',
        cell: ({ row }) => (
          <span className="text-sm text-brand-muted capitalize">
            {row.original.category || '-'}
          </span>
        ),
      },
      {
        accessorKey: 'price_cents',
        header: 'Price',
        cell: ({ row }) => (
          <span className="font-medium text-brand-neutral">
            {formatPrice(row.original.price_cents)}
          </span>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => (
          <button
            onClick={() => handleToggleStatus(row.original)}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
              row.original.status === 'active'
                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {row.original.status}
          </button>
        ),
      },
      {
        accessorKey: 'created_at',
        header: 'Created',
        cell: ({ row }) => (
          <span className="text-sm text-brand-muted">
            {formatDate(row.original.created_at)}
          </span>
        ),
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleEdit(row.original)}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              title="Edit"
            >
              <Edit className="w-4 h-4 text-brand-primary" />
            </button>
            <button
              onClick={() => setWaiversModalProgram(row.original)}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              title="Manage Waivers"
            >
              <FileText className="w-4 h-4 text-blue-600" />
            </button>
            <button
              onClick={() => handleDuplicate(row.original)}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              title="Duplicate"
            >
              <Copy className="w-4 h-4 text-brand-muted" />
            </button>
            <button
              onClick={() => handleDelete(row.original.id)}
              className="p-2 hover:bg-red-50 rounded-lg transition-colors"
              title="Delete"
            >
              <Trash2 className="w-4 h-4 text-red-600" />
            </button>
          </div>
        ),
      },
    ],
    []
  )

  const filteredData = useMemo(() => {
    let filtered = programs

    if (statusFilter !== 'all') {
      filtered = filtered.filter((p) => p.status === statusFilter)
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter((p) => p.category === categoryFilter)
    }

    return filtered
  }, [programs, statusFilter, categoryFilter])

  const categories = useMemo(() => {
    const cats = new Set(programs.map((p) => p.category).filter(Boolean))
    return Array.from(cats)
  }, [programs])

  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  })

  return (
    <AdminLayout>
      <div>
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-brand-neutral mb-2">Programs</h1>
          <p className="text-brand-muted">Manage recreation programs and activities</p>
        </div>

        {/* Toolbar */}
        <div className="bg-white rounded-xl border-2 border-slate-200 p-4 mb-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-4">
            {/* Search */}
            <div className="flex-1 min-w-[300px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-brand-muted" />
                <input
                  type="text"
                  value={globalFilter}
                  onChange={(e) => setGlobalFilter(e.target.value)}
                  placeholder="Search programs..."
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-ring"
                />
              </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-brand-muted" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-ring"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="draft">Draft</option>
              </select>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-ring"
              >
                <option value="all">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat} className="capitalize">
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Add Button */}
            <button
              onClick={() => setShowForm(true)}
              className="ml-auto bg-brand-primary text-white px-6 py-2 rounded-lg hover:bg-brand-primaryHover transition-colors flex items-center gap-2 font-semibold shadow-sm"
            >
              <Plus className="w-5 h-5" />
              New Program
            </button>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mx-auto mb-4"></div>
            <p className="text-brand-muted">Loading programs...</p>
          </div>
        ) : programs.length === 0 ? (
          <div className="bg-white rounded-xl border-2 border-slate-200 p-12 text-center shadow-sm">
            <div className="text-6xl mb-4">📅</div>
            <h3 className="text-xl font-bold text-brand-neutral mb-2">No programs yet</h3>
            <p className="text-brand-muted mb-6">Create your first recreation program to get started</p>
            <button
              onClick={() => setShowForm(true)}
              className="bg-brand-primary text-white px-6 py-3 rounded-lg hover:bg-brand-primaryHover transition-colors font-semibold"
            >
              Create First Program
            </button>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-xl border-2 border-slate-200 overflow-hidden shadow-sm">
              <table className="w-full">
                <thead className="bg-slate-50 border-b-2 border-slate-200">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <th
                          key={header.id}
                          className="px-6 py-4 text-left text-sm font-semibold text-brand-neutral"
                        >
                          {header.isPlaceholder ? null : (
                            <div
                              className={`flex items-center gap-2 ${
                                header.column.getCanSort() ? 'cursor-pointer select-none' : ''
                              }`}
                              onClick={header.column.getToggleSortingHandler()}
                            >
                              {flexRender(header.column.columnDef.header, header.getContext())}
                              {header.column.getCanSort() && (
                                <span className="text-brand-muted">
                                  {header.column.getIsSorted() === 'asc' ? (
                                    <ChevronUp className="w-4 h-4" />
                                  ) : header.column.getIsSorted() === 'desc' ? (
                                    <ChevronDown className="w-4 h-4" />
                                  ) : null}
                                </span>
                              )}
                            </div>
                          )}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {table.getRowModel().rows.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-slate-200 hover:bg-slate-50 transition-colors"
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-6 py-4">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="mt-4 flex items-center justify-between bg-white rounded-xl border-2 border-slate-200 px-6 py-4 shadow-sm">
              <div className="text-sm text-brand-muted">
                Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{' '}
                {Math.min(
                  (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                  filteredData.length
                )}{' '}
                of {filteredData.length} programs
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                  className="p-2 rounded-lg border border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-sm text-brand-neutral font-medium">
                  Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
                </span>
                <button
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                  className="p-2 rounded-lg border border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </>
        )}

        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="px-6 py-4 border-b border-slate-200">
                <h2 className="text-2xl font-bold text-brand-neutral">
                  {editingId ? 'Edit Program' : 'New Program'}
                </h2>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-brand-neutral mb-1">
                    Program Title *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-ring"
                    placeholder="e.g., Youth Soccer League"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-brand-neutral mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-ring"
                    placeholder="Describe the program..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-brand-neutral mb-1">
                      Season
                    </label>
                    <input
                      type="text"
                      value={formData.season}
                      onChange={(e) => setFormData({ ...formData, season: e.target.value })}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-ring"
                      placeholder="e.g., Fall 2024"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-brand-neutral mb-1">
                      Category
                    </label>
                    <input
                      type="text"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-ring"
                      placeholder="e.g., Sports, Arts, Fitness"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-brand-neutral mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-ring"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-brand-neutral mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-ring"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-brand-neutral mb-1">
                      Price (dollars) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.price_cents / 100}
                      onChange={(e) =>
                        setFormData({ ...formData, price_cents: Math.round(parseFloat(e.target.value) * 100) })
                      }
                      required
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-ring"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-brand-neutral mb-1">
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-ring"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="draft">Draft</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-brand-primary text-white font-semibold py-3 px-6 rounded-lg hover:bg-brand-primaryHover transition-colors"
                  >
                    {editingId ? 'Update Program' : 'Create Program'}
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="flex-1 bg-slate-100 text-brand-neutral font-semibold py-3 px-6 rounded-lg hover:bg-slate-200 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Waivers Modal */}
        {waiversModalProgram && (
          <ProgramWaiversModal
            programId={waiversModalProgram.id}
            programTitle={waiversModalProgram.title}
            onClose={() => setWaiversModalProgram(null)}
          />
        )}
      </div>
    </AdminLayout>
  )
}
