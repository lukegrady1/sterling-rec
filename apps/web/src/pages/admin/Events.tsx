import { useEffect, useState, useMemo } from "react";
import AdminLayout from "@/components/AdminLayout";
import { eventsAPI } from "@/lib/api";
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
} from "@tanstack/react-table";
import {
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Copy,
  Calendar,
  MapPin,
  Users,
  Clock,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  X,
} from "lucide-react";

interface Event {
  id: string;
  title: string;
  description: string;
  starts_at: string;
  ends_at: string;
  location: string;
  category?: string;
  capacity?: number;
  status: string;
  visibility: boolean;
  image_url?: string;
  slug?: string;
  registered_count: number;
  created_at: string;
}

export default function Events() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    starts_at: "",
    ends_at: "",
    location: "",
    capacity: "",
    category: "",
    status: "active",
    visibility: true,
    image_url: "",
    slug: "",
  });

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const response = await eventsAPI.list();
      setEvents(response.events || []);
    } catch (error) {
      console.error("Failed to fetch events:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        capacity: formData.capacity ? parseInt(formData.capacity) : undefined,
        starts_at: new Date(formData.starts_at).toISOString(),
        ends_at: new Date(formData.ends_at).toISOString(),
      };

      if (editingEvent) {
        await eventsAPI.update(editingEvent.id, payload);
      } else {
        await eventsAPI.create(payload);
      }
      await fetchEvents();
      resetForm();
    } catch (error) {
      console.error("Failed to save event:", error);
      alert("Failed to save event. Please check all required fields.");
    }
  };

  const handleEdit = (event: Event) => {
    setFormData({
      title: event.title,
      description: event.description || "",
      starts_at: formatDateForInput(event.starts_at),
      ends_at: formatDateForInput(event.ends_at),
      location: event.location || "",
      capacity: event.capacity?.toString() || "",
      category: event.category || "",
      status: event.status,
      visibility: event.visibility,
      image_url: event.image_url || "",
      slug: event.slug || "",
    });
    setEditingEvent(event);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this event?")) return;
    try {
      await eventsAPI.delete(id);
      await fetchEvents();
    } catch (error) {
      console.error("Failed to delete event:", error);
    }
  };

  const handleDuplicate = async (event: Event) => {
    try {
      await eventsAPI.create({
        title: `${event.title} (Copy)`,
        description: event.description,
        starts_at: event.starts_at,
        ends_at: event.ends_at,
        location: event.location || "",
        capacity: event.capacity,
        category: event.category || "",
        status: "active",
        visibility: true,
      });
      await fetchEvents();
    } catch (error) {
      console.error("Failed to duplicate event:", error);
    }
  };

  const handleToggleStatus = async (event: Event) => {
    const newStatus = event.status === "active" ? "inactive" : "active";
    try {
      await eventsAPI.update(event.id, {
        ...event,
        status: newStatus,
        starts_at: event.starts_at,
        ends_at: event.ends_at,
      });
      await fetchEvents();
    } catch (error) {
      console.error("Failed to toggle status:", error);
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      starts_at: "",
      ends_at: "",
      location: "",
      capacity: "",
      category: "",
      status: "active",
      visibility: true,
      image_url: "",
      slug: "",
    });
    setEditingEvent(null);
    setShowForm(false);
  };

  const formatDateForInput = (dateString: string) => {
    const date = new Date(dateString);
    return date.toISOString().slice(0, 16);
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
  };

  // Get unique categories for filter
  const categories = useMemo(() => {
    const uniqueCategories = new Set(
      events.map((e) => e.category).filter((c): c is string => !!c)
    );
    return Array.from(uniqueCategories).sort();
  }, [events]);

  // Define columns
  const columns = useMemo<ColumnDef<Event>[]>(
    () => [
      {
        accessorKey: "title",
        header: "Event Name",
        cell: ({ row }) => (
          <button
            onClick={() => handleEdit(row.original)}
            className="text-left font-semibold text-brand-primary hover:text-brand-primaryHover hover:underline"
          >
            {row.original.title}
          </button>
        ),
      },
      {
        accessorKey: "starts_at",
        header: ({ column }) => (
          <button
            onClick={() => column.toggleSorting()}
            className="flex items-center gap-1 hover:text-brand-primary"
          >
            Date
            <ArrowUpDown className="w-3 h-3" />
          </button>
        ),
        cell: ({ row }) => (
          <div className="text-sm">
            <div className="font-medium">{formatDate(row.original.starts_at)}</div>
            <div className="text-brand-muted text-xs">
              {formatDateTime(row.original.starts_at).split(", ")[1]} -{" "}
              {formatDateTime(row.original.ends_at).split(", ")[1]}
            </div>
          </div>
        ),
      },
      {
        accessorKey: "location",
        header: "Location",
        cell: ({ row }) => (
          <div className="flex items-center gap-1 text-sm">
            <MapPin className="w-3 h-3 text-brand-muted" />
            {row.original.location || "TBD"}
          </div>
        ),
      },
      {
        accessorKey: "capacity",
        header: "Capacity",
        cell: ({ row }) => {
          const capacity = row.original.capacity;
          const registered = row.original.registered_count || 0;
          if (!capacity) return <span className="text-brand-muted">-</span>;

          const percentage = (registered / capacity) * 100;
          const isFull = registered >= capacity;

          return (
            <div className="text-sm">
              <div className="flex items-center gap-1">
                <Users className="w-3 h-3 text-brand-muted" />
                <span className={isFull ? "text-red-600 font-semibold" : ""}>
                  {registered} / {capacity}
                </span>
              </div>
              {isFull && (
                <span className="text-xs text-red-600 font-medium">Full</span>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "category",
        header: "Category",
        cell: ({ row }) =>
          row.original.category ? (
            <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">
              {row.original.category}
            </span>
          ) : (
            <span className="text-brand-muted">-</span>
          ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <button
            onClick={() => handleToggleStatus(row.original)}
            className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${
              row.original.status === "active"
                ? "bg-green-100 text-green-700 hover:bg-green-200"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {row.original.status === "active" ? "Active" : "Inactive"}
          </button>
        ),
      },
      {
        accessorKey: "visibility",
        header: "Visibility",
        cell: ({ row }) => (
          <span
            className={`text-xs px-2 py-1 rounded-full ${
              row.original.visibility
                ? "bg-blue-50 text-blue-700"
                : "bg-gray-50 text-gray-700"
            }`}
          >
            {row.original.visibility ? "Public" : "Private"}
          </span>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleEdit(row.original)}
              className="text-brand-primary hover:text-brand-primaryHover"
              title="Edit"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleDuplicate(row.original)}
              className="text-blue-600 hover:text-blue-700"
              title="Duplicate"
            >
              <Copy className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleDelete(row.original.id)}
              className="text-red-600 hover:text-red-700"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ),
      },
    ],
    []
  );

  // Apply filters
  const filteredData = useMemo(() => {
    let filtered = events;

    if (statusFilter !== "all") {
      filtered = filtered.filter((event) => event.status === statusFilter);
    }

    if (categoryFilter !== "all") {
      filtered = filtered.filter((event) => event.category === categoryFilter);
    }

    return filtered;
  }, [events, statusFilter, categoryFilter]);

  // Table instance
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
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-display font-extrabold text-brand-neutral">
              Events
            </h1>
            <p className="text-brand-muted mt-1">
              Manage your recreation events and activities
            </p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-brand-primary text-white font-bold px-6 py-3 rounded-xl hover:bg-brand-primaryHover transition-colors shadow-lg"
          >
            <Plus className="w-5 h-5" />
            New Event
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-brand-border p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-brand-muted" />
                <input
                  type="text"
                  value={globalFilter}
                  onChange={(e) => setGlobalFilter(e.target.value)}
                  placeholder="Search events..."
                  className="w-full pl-10 pr-4 py-2 border border-brand-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-ring"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-brand-muted" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-brand-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-ring appearance-none bg-white"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            {/* Category Filter */}
            <div>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-4 py-2 border border-brand-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-ring appearance-none bg-white"
              >
                <option value="all">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Active Filters */}
          {(globalFilter || statusFilter !== "all" || categoryFilter !== "all") && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-brand-border">
              <span className="text-sm text-brand-muted">Active filters:</span>
              {globalFilter && (
                <span className="text-xs px-2 py-1 bg-brand-primary bg-opacity-10 text-brand-primary rounded-full flex items-center gap-1">
                  Search: {globalFilter}
                  <button
                    onClick={() => setGlobalFilter("")}
                    className="hover:text-brand-primaryHover"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {statusFilter !== "all" && (
                <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full flex items-center gap-1">
                  Status: {statusFilter}
                  <button
                    onClick={() => setStatusFilter("all")}
                    className="hover:text-green-800"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {categoryFilter !== "all" && (
                <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full flex items-center gap-1">
                  Category: {categoryFilter}
                  <button
                    onClick={() => setCategoryFilter("all")}
                    className="hover:text-blue-800"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Table */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-brand-border p-12 text-center">
            <div className="text-brand-muted">Loading events...</div>
          </div>
        ) : events.length === 0 ? (
          <div className="bg-white rounded-2xl border border-brand-border p-12 text-center">
            <Calendar className="w-16 h-16 mx-auto text-brand-muted mb-4" />
            <h3 className="text-xl font-bold text-brand-neutral mb-2">
              No events yet
            </h3>
            <p className="text-brand-muted mb-6">
              Create your first recreation event to get started
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="bg-brand-primary text-white font-bold px-6 py-3 rounded-xl hover:bg-brand-primaryHover transition-colors"
            >
              Create First Event
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-brand-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-brand-bg border-b border-brand-border">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <th
                          key={header.id}
                          className="px-4 py-3 text-left text-xs font-semibold text-brand-neutral uppercase tracking-wider"
                        >
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody className="divide-y divide-brand-border">
                  {table.getRowModel().rows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={columns.length}
                        className="px-4 py-8 text-center text-brand-muted"
                      >
                        No events match your filters
                      </td>
                    </tr>
                  ) : (
                    table.getRowModel().rows.map((row) => (
                      <tr
                        key={row.id}
                        className="hover:bg-brand-bg transition-colors"
                      >
                        {row.getVisibleCells().map((cell) => (
                          <td key={cell.id} className="px-4 py-4 text-sm">
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                            )}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {table.getPageCount() > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-brand-border">
                <div className="text-sm text-brand-muted">
                  Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{" "}
                  {Math.min(
                    (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                    table.getFilteredRowModel().rows.length
                  )}{" "}
                  of {table.getFilteredRowModel().rows.length} events
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                    className="px-3 py-1 border border-brand-border rounded-lg hover:bg-brand-bg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm text-brand-muted">
                    Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
                  </span>
                  <button
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                    className="px-3 py-1 border border-brand-border rounded-lg hover:bg-brand-bg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-brand-border flex justify-between items-center">
                <h2 className="text-2xl font-display font-bold text-brand-neutral">
                  {editingEvent ? "Edit Event" : "New Event"}
                </h2>
                <button
                  onClick={resetForm}
                  className="text-brand-muted hover:text-brand-neutral"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-sm font-semibold text-brand-neutral mb-1">
                    Event Title *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    required
                    className="w-full px-4 py-3 border border-brand-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-ring"
                    placeholder="e.g., Summer Concert Series"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-semibold text-brand-neutral mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    rows={4}
                    className="w-full px-4 py-3 border border-brand-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-ring"
                    placeholder="Describe the event..."
                  />
                </div>

                {/* Date & Time */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-brand-neutral mb-1">
                      Start Date & Time *
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.starts_at}
                      onChange={(e) =>
                        setFormData({ ...formData, starts_at: e.target.value })
                      }
                      required
                      className="w-full px-4 py-3 border border-brand-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-ring"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-brand-neutral mb-1">
                      End Date & Time *
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.ends_at}
                      onChange={(e) =>
                        setFormData({ ...formData, ends_at: e.target.value })
                      }
                      required
                      className="w-full px-4 py-3 border border-brand-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-ring"
                    />
                  </div>
                </div>

                {/* Location & Category */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-brand-neutral mb-1">
                      Location
                    </label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) =>
                        setFormData({ ...formData, location: e.target.value })
                      }
                      className="w-full px-4 py-3 border border-brand-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-ring"
                      placeholder="e.g., Community Park"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-brand-neutral mb-1">
                      Category
                    </label>
                    <input
                      type="text"
                      value={formData.category}
                      onChange={(e) =>
                        setFormData({ ...formData, category: e.target.value })
                      }
                      className="w-full px-4 py-3 border border-brand-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-ring"
                      placeholder="e.g., Sports, Arts, Family"
                    />
                  </div>
                </div>

                {/* Capacity & Slug */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-brand-neutral mb-1">
                      Capacity
                    </label>
                    <input
                      type="number"
                      value={formData.capacity}
                      onChange={(e) =>
                        setFormData({ ...formData, capacity: e.target.value })
                      }
                      className="w-full px-4 py-3 border border-brand-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-ring"
                      placeholder="0 for unlimited"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-brand-neutral mb-1">
                      URL Slug
                    </label>
                    <input
                      type="text"
                      value={formData.slug}
                      onChange={(e) =>
                        setFormData({ ...formData, slug: e.target.value })
                      }
                      className="w-full px-4 py-3 border border-brand-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-ring"
                      placeholder="summer-concert-2025"
                    />
                  </div>
                </div>

                {/* Image URL */}
                <div>
                  <label className="block text-sm font-semibold text-brand-neutral mb-1">
                    Image URL
                  </label>
                  <input
                    type="url"
                    value={formData.image_url}
                    onChange={(e) =>
                      setFormData({ ...formData, image_url: e.target.value })
                    }
                    className="w-full px-4 py-3 border border-brand-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-ring"
                    placeholder="https://example.com/image.jpg"
                  />
                </div>

                {/* Status & Visibility */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-brand-neutral mb-1">
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) =>
                        setFormData({ ...formData, status: e.target.value })
                      }
                      className="w-full px-4 py-3 border border-brand-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-ring"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-brand-neutral mb-1">
                      Visibility
                    </label>
                    <div className="flex items-center h-full">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.visibility}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              visibility: e.target.checked,
                            })
                          }
                          className="w-4 h-4 text-brand-primary border-brand-border rounded focus:ring-2 focus:ring-brand-ring"
                        />
                        <span className="text-sm text-brand-muted">
                          Show publicly on /events page
                        </span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-brand-primary text-white font-bold py-3 px-6 rounded-xl hover:bg-brand-primaryHover transition-colors"
                  >
                    {editingEvent ? "Update Event" : "Create Event"}
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="flex-1 bg-gray-100 text-brand-neutral font-bold py-3 px-6 rounded-xl hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
