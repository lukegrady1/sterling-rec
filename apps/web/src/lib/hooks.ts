import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { authAPI, programsAPI, eventsAPI, participantsAPI, registrationsAPI, facilitiesAPI, bookingsAPI } from './api'

// Auth hooks
export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: () => authAPI.getMe().then((res) => res.data),
    retry: false,
  })
}

export function useLogin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      authAPI.login(email, password),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] })
    },
  })
}

export function useRegister() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      email: string
      password: string
      first_name: string
      last_name: string
      phone?: string
    }) => authAPI.register(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] })
    },
  })
}

export function useLogout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => authAPI.logout(),
    onSuccess: () => {
      queryClient.clear()
      window.location.href = '/'
    },
  })
}

// Programs hooks
export function usePrograms() {
  return useQuery({
    queryKey: ['programs'],
    queryFn: () => programsAPI.getAll().then((res) => res.data.programs),
  })
}

export function useProgram(slug: string) {
  return useQuery({
    queryKey: ['programs', slug],
    queryFn: () => programsAPI.getBySlug(slug).then((res) => res.data.program),
    enabled: !!slug,
  })
}

// Events hooks
export function useEvents() {
  return useQuery({
    queryKey: ['events'],
    queryFn: () => eventsAPI.getAll().then((res) => res.data.events),
  })
}

export function useEvent(slug: string) {
  return useQuery({
    queryKey: ['events', slug],
    queryFn: () => eventsAPI.getBySlug(slug).then((res) => res.data.event),
    enabled: !!slug,
  })
}

// Participants hooks
export function useCreateParticipant() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      first_name: string
      last_name: string
      dob?: string
      notes?: string
      medical_notes?: string
    }) => participantsAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] })
    },
  })
}

// Registrations hooks
export function useCreateRegistration() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      parent_type: 'program' | 'event'
      parent_id: string
      session_id?: string
      participant_id: string
    }) => registrationsAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] })
      queryClient.invalidateQueries({ queryKey: ['programs'] })
      queryClient.invalidateQueries({ queryKey: ['events'] })
    },
  })
}

export function useCancelRegistration() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (registrationId: string) => registrationsAPI.cancel(registrationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] })
      queryClient.invalidateQueries({ queryKey: ['programs'] })
      queryClient.invalidateQueries({ queryKey: ['events'] })
    },
  })
}

// Facilities hooks
export function useFacilities() {
  return useQuery({
    queryKey: ['facilities'],
    queryFn: () => facilitiesAPI.getAll().then((res) => res.data.facilities),
  })
}

export function useFacility(slug: string) {
  return useQuery({
    queryKey: ['facilities', slug],
    queryFn: () => facilitiesAPI.getBySlug(slug).then((res) => res.data.facility),
    enabled: !!slug,
  })
}

export function useFacilityAvailability(
  slug: string,
  startDate: string,
  endDate: string,
  duration: number,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ['facilities', slug, 'availability', startDate, endDate, duration],
    queryFn: () =>
      facilitiesAPI.getAvailability(slug, startDate, endDate, duration).then((res) => res.data.slots),
    enabled: enabled && !!slug && !!startDate && !!endDate && duration > 0,
  })
}

// Bookings hooks
export function useMyBookings(includeHistory: boolean = false) {
  return useQuery({
    queryKey: ['bookings', 'my', includeHistory],
    queryFn: () => bookingsAPI.getMyBookings(includeHistory).then((res) => res.data.bookings),
  })
}

export function useCreateBooking() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      facility_id: string
      participant_ids?: string[]
      start_time: string
      end_time: string
      notes?: string
      idempotency_key?: string
    }) => bookingsAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
      queryClient.invalidateQueries({ queryKey: ['facilities'] })
    },
  })
}

export function useCancelBooking() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ bookingId, reason }: { bookingId: string; reason?: string }) =>
      bookingsAPI.cancel(bookingId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
      queryClient.invalidateQueries({ queryKey: ['facilities'] })
    },
  })
}
