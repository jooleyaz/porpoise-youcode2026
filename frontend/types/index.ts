export type UserStatus = 'invited' | 'active' | 'inactive'
export type ShiftStatus = 'draft' | 'open' | 'filled' | 'cancelled'
export type AssignmentStatus = 'pending' | 'confirmed' | 'cancelled'

export interface Role {
  id: string
  name: string
  description?: string
}

export interface User {
  id: string
  name: string
  phone: string
  email?: string
  status: UserStatus
  is_admin: boolean
  total_hours_volunteered: number
  created_at?: string
  roles?: Role[]
}

export interface AvailabilityRecurring {
  id: string
  user_id: string
  day_of_week: 0 | 1 | 2 | 3 | 4 | 5 | 6
  start_time: string  // "HH:MM"
  end_time: string
}

export interface AvailabilityOverride {
  id: string
  user_id: string
  override_date: string   // "YYYY-MM-DD"
  is_available: boolean
  start_time?: string
  end_time?: string
}

export interface ShiftAssignment {
  id: string
  shift_position_id: string
  user_id: string
  user?: User
  status: AssignmentStatus
  assigned_at: string
  confirmed_at?: string
  cancelled_at?: string
}

export interface ShiftPosition {
  id: string
  shift_id: string
  role_id: string
  role?: Role
  slots_total: number
  slots_filled: number
  assignments?: ShiftAssignment[]
}

export interface Shift {
  id: string
  title?: string
  shift_date: string      // "YYYY-MM-DD"
  start_time: string
  end_time: string
  is_recurring: boolean
  recurrence_rule?: string
  parent_shift_id?: string
  status: ShiftStatus
  created_by?: string
  created_at?: string
  positions?: ShiftPosition[]
}

export interface CoverRequest {
  id: string
  shift_assignment_id: string
  status: 'searching' | 'filled' | 'exhausted'
  batch_number: number
  timer_expires_at?: string
  resolved_at?: string
}

// Session stored in localStorage
export interface Session {
  userId: string
  isAdmin: boolean
  name: string
}

// API request bodies
export interface InviteVolunteerBody {
  name: string
  phone: string
  role_ids: string[]
}

export interface CreateShiftBody {
  title?: string
  shift_date: string
  start_time: string
  end_time: string
  is_recurring: boolean
  recurrence_rule?: string
  positions: { role_id: string; slots_total: number }[]
}

export interface SetAvailabilityBody {
  recurring: Omit<AvailabilityRecurring, 'id' | 'user_id'>[]
  overrides: Omit<AvailabilityOverride, 'id' | 'user_id'>[]
}
