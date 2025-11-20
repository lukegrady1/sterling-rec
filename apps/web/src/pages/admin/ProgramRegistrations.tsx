import { useState, useEffect, useMemo } from 'react'
import { getAPI } from '@/lib/api'
import AdminLayout from '@/components/AdminLayout'
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  ColumnDef,
  flexRender,
  SortingState,
  ColumnFiltersState,
} from '@tanstack/react-table'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  Filter,
  Download,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  MoreHorizontal,
  Mail,
  Phone,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'

interface Registration {
  id: string
  program_id: string
  program_title: string
  user_id: string
  user_email: string
  participant_name: string
  participant_age?: number
  emergency_contact_name: string
  emergency_contact_phone: string
  notes?: string
  status: 'pending' | 'approved' | 'waitlisted' | 'cancelled' | 'completed' | 'confirmed'
  registered_at: string
}

export default function ProgramRegistrations() {
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [updating, setUpdating] = useState<string | null>(null)

  useEffect(() => {
    fetchRegistrations()
  }, [])

  const fetchRegistrations = async () => {
    try {
      setLoading(true)
      const response = await getAPI().get('/admin/program-registrations')
      setRegistrations(response.data.registrations || [])
      setError('')
    } catch (err: any) {
      console.error('Failed to fetch registrations:', err)
      setError(err.response?.data?.error || 'Failed to load registrations')
    } finally {
      setLoading(false)
    }
  }

  const updateStatus = async (id: string, status: string) => {
    try {
      setUpdating(id)
      await getAPI().put(`/admin/program-registrations/${id}/status`, { status })
      await fetchRegistrations()
      setError('')
    } catch (err: any) {
      console.error('Failed to update status:', err)
      setError(err.response?.data?.error || 'Failed to update status')
    } finally {
      setUpdating(null)
    }
  }

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'confirmed': return 'default'
      case 'approved': return 'default'
      case 'waitlisted': return 'secondary'
      case 'pending': return 'outline'
      case 'cancelled': return 'destructive'
      case 'completed': return 'secondary'
      default: return 'outline'
    }
  }

  const columns = useMemo<ColumnDef<Registration>[]>(
    () => [
      {
        accessorKey: 'participant_name',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="hover:bg-transparent p-0 font-semibold"
          >
            Participant
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-semibold text-gray-900 dark:text-white">
              {row.original.participant_name}
            </span>
            {row.original.participant_age && (
              <span className="text-sm text-gray-500">Age {row.original.participant_age}</span>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'program_title',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="hover:bg-transparent p-0 font-semibold"
          >
            Program
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <span className="text-gray-700 dark:text-gray-300">{row.original.program_title}</span>
        ),
      },
      {
        accessorKey: 'user_email',
        header: 'Guardian',
        cell: ({ row }) => (
          <div className="flex items-center gap-2 text-sm">
            <Mail className="h-4 w-4 text-gray-400" />
            <span className="text-gray-600 dark:text-gray-400">{row.original.user_email}</span>
          </div>
        ),
      },
      {
        accessorKey: 'emergency_contact_phone',
        header: 'Emergency Contact',
        cell: ({ row }) => (
          <div className="flex flex-col gap-1">
            {row.original.emergency_contact_name && (
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {row.original.emergency_contact_name}
              </span>
            )}
            {row.original.emergency_contact_phone && (
              <div className="flex items-center gap-1 text-sm text-gray-500">
                <Phone className="h-3 w-3" />
                {row.original.emergency_contact_phone}
              </div>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'status',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="hover:bg-transparent p-0 font-semibold"
          >
            Status
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <Badge variant={getStatusVariant(row.original.status)} className="capitalize">
            {row.original.status}
          </Badge>
        ),
      },
      {
        accessorKey: 'registered_at',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="hover:bg-transparent p-0 font-semibold"
          >
            Registered
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <span className="text-sm text-gray-500">
            {new Date(row.original.registered_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </span>
        ),
      },
      {
        id: 'actions',
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {row.original.status === 'pending' && (
                <>
                  <DropdownMenuItem onClick={() => updateStatus(row.original.id, 'approved')}>
                    <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                    Approve
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => updateStatus(row.original.id, 'waitlisted')}>
                    <Clock className="mr-2 h-4 w-4 text-blue-600" />
                    Waitlist
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => updateStatus(row.original.id, 'cancelled')}>
                    <XCircle className="mr-2 h-4 w-4 text-red-600" />
                    Decline
                  </DropdownMenuItem>
                </>
              )}
              {row.original.status === 'approved' && (
                <>
                  <DropdownMenuItem onClick={() => updateStatus(row.original.id, 'completed')}>
                    <CheckCircle className="mr-2 h-4 w-4 text-purple-600" />
                    Mark Complete
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => updateStatus(row.original.id, 'cancelled')}>
                    <XCircle className="mr-2 h-4 w-4 text-red-600" />
                    Cancel
                  </DropdownMenuItem>
                </>
              )}
              {(row.original.status === 'confirmed' || row.original.status === 'waitlisted') && (
                <DropdownMenuItem onClick={() => updateStatus(row.original.id, 'cancelled')}>
                  <XCircle className="mr-2 h-4 w-4 text-red-600" />
                  Cancel
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [updating]
  )

  const filteredData = useMemo(() => {
    let filtered = registrations

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((reg) => reg.status === statusFilter)
    }

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (reg) =>
          reg.participant_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          reg.program_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          reg.user_email.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    return filtered
  }, [registrations, statusFilter, searchQuery])

  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      sorting,
      columnFilters,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
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

  const stats = useMemo(() => {
    return {
      total: registrations.length,
      pending: registrations.filter((r) => r.status === 'pending').length,
      approved: registrations.filter((r) => r.status === 'approved' || r.status === 'confirmed').length,
      waitlisted: registrations.filter((r) => r.status === 'waitlisted').length,
      completed: registrations.filter((r) => r.status === 'completed').length,
    }
  }, [registrations])

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <div className="flex flex-col items-center gap-4">
            <RefreshCw className="h-8 w-8 animate-spin text-primary" />
            <p className="text-gray-500">Loading registrations...</p>
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Program Registrations
            </h1>
            <p className="text-gray-500 mt-1">Manage and track all program registrations</p>
          </div>
          <Button onClick={fetchRegistrations} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg"
          >
            {error}
          </motion.div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Total</p>
                <p className="text-3xl font-bold mt-1">{stats.total}</p>
              </div>
              <Users className="h-10 w-10 text-blue-200" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl p-6 text-white shadow-lg cursor-pointer hover:shadow-xl transition-shadow"
            onClick={() => setStatusFilter(statusFilter === 'pending' ? 'all' : 'pending')}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-100 text-sm font-medium">Pending</p>
                <p className="text-3xl font-bold mt-1">{stats.pending}</p>
              </div>
              <Clock className="h-10 w-10 text-yellow-200" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg cursor-pointer hover:shadow-xl transition-shadow"
            onClick={() => setStatusFilter(statusFilter === 'approved' ? 'all' : 'approved')}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">Approved</p>
                <p className="text-3xl font-bold mt-1">{stats.approved}</p>
              </div>
              <CheckCircle className="h-10 w-10 text-green-200" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl p-6 text-white shadow-lg cursor-pointer hover:shadow-xl transition-shadow"
            onClick={() => setStatusFilter(statusFilter === 'waitlisted' ? 'all' : 'waitlisted')}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-indigo-100 text-sm font-medium">Waitlisted</p>
                <p className="text-3xl font-bold mt-1">{stats.waitlisted}</p>
              </div>
              <Filter className="h-10 w-10 text-indigo-200" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg cursor-pointer hover:shadow-xl transition-shadow"
            onClick={() => setStatusFilter(statusFilter === 'completed' ? 'all' : 'completed')}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">Completed</p>
                <p className="text-3xl font-bold mt-1">{stats.completed}</p>
              </div>
              <TrendingUp className="h-10 w-10 text-purple-200" />
            </div>
          </motion.div>
        </div>

        {/* Search and Filter Bar */}
        <div className="flex items-center gap-4 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              placeholder="Search by participant, program, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          {statusFilter !== 'all' && (
            <Button variant="outline" onClick={() => setStatusFilter('all')}>
              Clear Filter
            </Button>
          )}
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider"
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                <AnimatePresence>
                  {table.getRowModel().rows.map((row, index) => (
                    <motion.tr
                      key={row.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-6 py-4 whitespace-nowrap">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{' '}
                {Math.min(
                  (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                  filteredData.length
                )}{' '}
                of {filteredData.length} results
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
