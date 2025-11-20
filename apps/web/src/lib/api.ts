import axios, { AxiosInstance } from 'axios'

const API_URL = (import.meta as any).env?.VITE_API_URL || '/api'

let apiClient: AxiosInstance

// Initialize API client with optional token
export function initializeAPI() {
  apiClient = axios.create({
    baseURL: API_URL,
    withCredentials: true,
    headers: {
      'Content-Type': 'application/json',
    },
  })

  // Add request interceptor to include token from localStorage
  apiClient.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('token')
      if (token) {
        config.headers['Authorization'] = `Bearer ${token}`
      }
      return config
    },
    (error) => {
      return Promise.reject(error)
    }
  )

  // Response interceptor for error handling
  apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        // Redirect to login on auth errors
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname)
        }
      }
      return Promise.reject(error)
    }
  )

  return apiClient
}

export function getAPI() {
  if (!apiClient) {
    initializeAPI()
  }
  return apiClient
}

// Legacy export for backwards compatibility
export const api = getAPI()

// Types
export interface User {
  id: string
  email: string
  first_name: string
  last_name: string
  phone?: string
  role: string
  created_at: string
}

export interface Household {
  id: string
  owner_user_id: string
  name?: string
  phone?: string
  email?: string
  address_line1?: string
  city?: string
  state?: string
  zip?: string
  created_at: string
}

export interface Participant {
  id: string
  household_id: string
  first_name: string
  last_name: string
  dob?: string
  notes?: string
  medical_notes?: string
  emergency_contact_name?: string
  emergency_contact_phone?: string
  is_favorite: boolean
  gender?: string
  shirt_size?: string
  created_at: string
}

export interface Program {
  id: string
  slug: string
  title: string
  description?: string
  age_min?: number
  age_max?: number
  location?: string
  capacity: number
  start_date?: string
  end_date?: string
  schedule_notes?: string
  is_active: boolean
  created_at: string
  updated_at: string
  sessions?: Session[]
  spots_left?: number
  waitlist_count?: number
}

export interface Event {
  id: string
  slug: string
  title: string
  description?: string
  location?: string
  capacity: number
  starts_at?: string
  ends_at?: string
  is_active: boolean
  created_at: string
  updated_at: string
  spots_left?: number
  waitlist_count?: number
}

export interface Session {
  id: string
  parent_type: 'program' | 'event'
  parent_id: string
  starts_at?: string
  ends_at?: string
  capacity_override?: number
  is_active: boolean
  spots_left?: number
  waitlist_count?: number
}

export interface Registration {
  id: string
  parent_type: 'program' | 'event'
  parent_id: string
  session_id?: string
  participant_id: string
  status: 'confirmed' | 'waitlisted' | 'cancelled'
  created_at: string
}

export interface MeResponse {
  user: User
  household: Household
  participants: Participant[]
  registrations: Registration[]
}

export interface Facility {
  id: string
  slug: string
  name: string
  description?: string
  facility_type: string
  location?: string
  capacity?: number
  min_booking_duration_minutes: number
  max_booking_duration_minutes: number
  buffer_minutes: number
  advance_booking_days: number
  cancellation_cutoff_hours: number
  is_active: boolean
  requires_approval: boolean
  created_at: string
  updated_at: string
  availability_windows?: AvailabilityWindow[]
}

export interface AvailabilityWindow {
  id: string
  facility_id: string
  day_of_week: number // 0=Sunday, 1=Monday, ..., 6=Saturday
  start_time: string // HH:MM:SS format
  end_time: string // HH:MM:SS format
  effective_from?: string
  effective_until?: string
  created_at: string
}

export interface FacilityClosure {
  id: string
  facility_id: string
  start_time: string
  end_time: string
  reason?: string
  created_at: string
  created_by?: string
}

export interface FacilityBooking {
  id: string
  facility_id: string
  user_id: string
  household_id?: string
  participant_ids?: string[]
  start_time: string
  end_time: string
  status: 'confirmed' | 'cancelled'
  notes?: string
  cancelled_at?: string
  cancelled_by?: string
  cancellation_reason?: string
  idempotency_key?: string
  created_at: string
  updated_at: string
  facility?: Facility
  user?: User
  participants?: Participant[]
}

export interface AvailabilitySlot {
  start_time: string
  end_time: string
}

// API functions

export const authAPI = {
  register: (data: {
    email: string
    password: string
    first_name: string
    last_name: string
    phone?: string
  }) => api.post<{ user: User }>('/public/register', data),

  login: (email: string, password: string) =>
    api.post<{ user: User }>('/public/login', { email, password }),

  logout: () => api.post('/logout'),

  getMe: () => api.get<MeResponse>('/me'),
}

export const programsAPI = {
  getAll: () => api.get<{ programs: Program[] }>('/programs'),
  getBySlug: (slug: string) => api.get<{ program: Program }>(`/programs/${slug}`),
  list: async () => {
    const { data } = await getAPI().get('/programs')
    return data
  },
  create: async (program: any) => {
    const { data } = await getAPI().post('/admin/programs', program)
    return data
  },
  update: async (id: string, updates: any) => {
    const { data } = await getAPI().put(`/admin/programs/${id}`, updates)
    return data
  },
  delete: async (id: string) => {
    await getAPI().delete(`/admin/programs/${id}`)
  },
}

export const eventsAPI = {
  getAll: () => api.get<{ events: Event[] }>('/events'),
  getBySlug: (slug: string) => api.get<{ event: Event }>(`/events/${slug}`),
  list: async () => {
    const { data } = await getAPI().get('/events')
    return data
  },
  create: async (event: any) => {
    const { data } = await getAPI().post('/admin/events', event)
    return data
  },
  update: async (id: string, updates: any) => {
    const { data } = await getAPI().put(`/admin/events/${id}`, updates)
    return data
  },
  delete: async (id: string) => {
    await getAPI().delete(`/admin/events/${id}`)
  },
}


export const registrationsAPI = {
  create: (data: {
    parent_type: 'program' | 'event'
    parent_id: string
    session_id?: string
    participant_id: string
  }) =>
    api.post<{
      registration: Registration
      waitlisted: boolean
      position?: number
    }>('/registrations', data),

  cancel: (registration_id: string) =>
    api.post('/registrations/cancel', { registration_id }),

  getAll: () => api.get('/admin/registrations'),
}

// Dashboard API
export const dashboardAPI = {
  getSummary: async () => {
    const { data } = await getAPI().get('/admin/dashboard/summary')
    return data
  },

  getUpcomingEvents: async () => {
    const { data } = await getAPI().get('/admin/dashboard/upcoming-events')
    return data
  },

  getRecentBookings: async () => {
    const { data } = await getAPI().get('/admin/dashboard/recent-bookings')
    return data
  },

  getUtilizationSeries: async () => {
    const { data } = await getAPI().get('/admin/dashboard/utilization-series')
    return data
  },
}

// Onboarding API
export const onboardingAPI = {
  get: async () => {
    const { data } = await getAPI().get('/admin/onboarding')
    return data
  },
}

// Facilities API
export const facilitiesAPI = {
  // Public endpoints
  getAll: () => api.get<{ facilities: Facility[] }>('/facilities'),
  getBySlug: (slug: string) => api.get<{ facility: Facility }>(`/facilities/${slug}`),
  getAvailability: (slug: string, startDate: string, endDate: string, duration: number) =>
    api.get<{ slots: AvailabilitySlot[] }>(`/facilities/${slug}/availability?start_date=${startDate}&end_date=${endDate}&duration=${duration}`),

  // Admin endpoints
  list: async () => {
    const { data } = await getAPI().get('/admin/facilities?active_only=false')
    return data
  },

  create: async (facility: Partial<Facility>) => {
    const { data } = await getAPI().post('/admin/facilities', facility)
    return data
  },

  update: async (id: string, updates: Partial<Facility>) => {
    const { data } = await getAPI().put(`/admin/facilities/${id}`, updates)
    return data
  },

  delete: async (id: string) => {
    await getAPI().delete(`/admin/facilities/${id}`)
  },

  // Availability windows
  createAvailabilityWindow: async (facilityId: string, window: Partial<AvailabilityWindow>) => {
    const { data } = await getAPI().post(`/admin/facilities/${facilityId}/availability`, window)
    return data
  },

  deleteAvailabilityWindow: async (facilityId: string, windowId: string) => {
    await getAPI().delete(`/admin/facilities/${facilityId}/availability/${windowId}`)
  },

  // Closures
  getClosures: async (facilityId: string, startTime?: string, endTime?: string) => {
    const params = new URLSearchParams()
    if (startTime) params.append('start_time', startTime)
    if (endTime) params.append('end_time', endTime)
    const { data } = await getAPI().get(`/admin/facilities/${facilityId}/closures?${params}`)
    return data
  },

  createClosure: async (facilityId: string, closure: Partial<FacilityClosure>) => {
    const { data } = await getAPI().post(`/admin/facilities/${facilityId}/closures`, closure)
    return data
  },

  deleteClosure: async (facilityId: string, closureId: string) => {
    await getAPI().delete(`/admin/facilities/${facilityId}/closures/${closureId}`)
  },

  // Bookings (admin view)
  getFacilityBookings: async (facilityId: string, startTime?: string, endTime?: string) => {
    const params = new URLSearchParams()
    if (startTime) params.append('start_time', startTime)
    if (endTime) params.append('end_time', endTime)
    const { data } = await getAPI().get(`/admin/facilities/${facilityId}/bookings?${params}`)
    return data
  },

  exportBookings: async (facilityId?: string, startTime?: string, endTime?: string, status?: string) => {
    const params = new URLSearchParams()
    if (facilityId) params.append('facility_id', facilityId)
    if (startTime) params.append('start_time', startTime)
    if (endTime) params.append('end_time', endTime)
    if (status) params.append('status', status)
    const response = await getAPI().get(`/admin/bookings/export?${params}`, {
      responseType: 'blob',
    })
    return response.data
  },

  // Legacy slot management methods (stub implementations for old admin page)
  listSlots: async (facilityId: string) => {
    console.warn('facilitiesAPI.listSlots is not implemented')
    return { slots: [] }
  },

  createSlot: async (facilityId: string, slotData: any) => {
    console.warn('facilitiesAPI.createSlot is not implemented')
    return {}
  },

  deleteSlot: async (slotId: string) => {
    console.warn('facilitiesAPI.deleteSlot is not implemented')
  },
}

// Bookings API
export const bookingsAPI = {
  // User endpoints
  getMyBookings: (includeHistory: boolean = false) =>
    api.get<{ bookings: FacilityBooking[] }>(`/bookings?include_history=${includeHistory}`),

  create: (bookingData: {
    facility_id: string
    participant_ids?: string[]
    start_time: string
    end_time: string
    notes?: string
    idempotency_key?: string
  }) => api.post<{ booking: FacilityBooking }>('/bookings', bookingData),

  cancel: (bookingId: string, reason?: string) =>
    api.post(`/bookings/${bookingId}/cancel`, { reason }),

  // Legacy admin endpoints (stub implementations for old admin pages)
  list: async () => {
    return { bookings: [] }
  },

  update: async (id: string, updates: any) => {
    console.warn('bookingsAPI.update is not implemented')
    return {}
  },
}

// Settings API
export const settingsAPI = {
  get: async () => {
    const { data } = await getAPI().get('/admin/settings')
    return data
  },

  update: async (settings: any) => {
    const { data } = await getAPI().put('/admin/settings', settings)
    return data
  },
}

// Household API
export const householdAPI = {
  get: async () => {
    const { data } = await getAPI().get('/household')
    return data
  },

  update: async (updates: Partial<Household>) => {
    const { data } = await getAPI().put('/household', updates)
    return data
  },
}

// Enhanced Participants API
export const participantsAPI = {
  list: async () => {
    const { data } = await getAPI().get('/participants')
    return data
  },

  create: async (participant: Partial<Participant>) => {
    const { data } = await getAPI().post('/participants', participant)
    return data
  },

  update: async (id: string, updates: Partial<Participant>) => {
    const { data } = await getAPI().put(`/participants/${id}`, updates)
    return data
  },

  delete: async (id: string) => {
    await getAPI().delete(`/participants/${id}`)
  },

  checkEligibility: async (id: string, parentType: string, parentId: string, sessionId?: string) => {
    const params = new URLSearchParams({
      parentType,
      parentId,
      ...(sessionId && { sessionId }),
    })
    const { data } = await getAPI().get(`/participants/${id}/eligibility?${params}`)
    return data
  },

  acceptWaiver: async (id: string, waiverKey: string) => {
    const { data } = await getAPI().post(`/participants/${id}/waivers`, { waiver_key: waiverKey })
    return data
  },
}
