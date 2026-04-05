import { getSession } from '@/lib/session'
import type {
  User,
  Shift,
  ShiftPosition,
  ShiftAssignment,
  AvailabilityRecurring,
  AvailabilityOverride,
  InviteVolunteerBody,
  CreateShiftBody,
  SetAvailabilityBody,
  Session,
} from '@/types'

const BASE = 'http://localhost:5000'

function authHeaders(): HeadersInit {
  const session = getSession()
  return {
    'Content-Type': 'application/json',
    ...(session ? { 'X-User-Id': session.userId } : {}),
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: authHeaders(),
    ...options,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(text || `HTTP ${res.status}`)
  }
  return res.json() as Promise<T>
}

// ── Response shape mappers ────────────────────────────────────────────────────
// Backend uses slightly different field names from our TypeScript types.
// All mapping happens here so page components stay clean.

function mapPosition(p: Record<string, unknown>): ShiftPosition {
  return {
    id:           (p.position_id ?? p.id) as string,
    shift_id:     p.shift_id as string,
    role_id:      p.role_id as string,
    role:         p.role as ShiftPosition['role'] ?? (p.role_name ? { id: p.role_id as string, name: p.role_name as string } : undefined),
    slots_total:  p.slots_total as number,
    slots_filled: p.slots_filled as number,
    assignments:  ((p.assigned_users ?? p.assignments ?? []) as Record<string, unknown>[]).map(mapAssignment),
  }
}

function mapAssignment(a: Record<string, unknown>): ShiftAssignment {
  return {
    id:                 (a.assignment_id ?? a.id) as string,
    shift_position_id:  a.shift_position_id as string,
    user_id:            a.user_id as string,
    user:               a.user as ShiftAssignment['user'],
    status:             a.status as ShiftAssignment['status'],
    assigned_at:        (a.assigned_at ?? '') as string,
    confirmed_at:       a.confirmed_at as string | undefined,
    cancelled_at:       a.cancelled_at as string | undefined,
  }
}

function mapShift(s: Record<string, unknown>): Shift {
  return {
    id:               s.id as string,
    title:            s.title as string | undefined,
    shift_date:       s.shift_date as string,
    start_time:       s.start_time as string,
    end_time:         s.end_time as string,
    is_recurring:     s.is_recurring as boolean,
    recurrence_rule:  s.recurrence_rule as string | undefined,
    parent_shift_id:  s.parent_shift_id as string | undefined,
    status:           s.status as Shift['status'],
    created_by:       s.created_by as string | undefined,
    created_at:       s.created_at as string | undefined,
    positions:        ((s.positions ?? []) as Record<string, unknown>[]).map(mapPosition),
  }
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export async function validateToken(token: string): Promise<Session> {
  // Backend returns { user_id, name, is_admin, ... } — map to Session shape
  const r = await request<{ user_id: string; name: string; is_admin: boolean; phone?: string; status?: string }>(
    '/auth/validate-token',
    { method: 'POST', body: JSON.stringify({ token }) }
  )
  return { userId: r.user_id, name: r.name, isAdmin: r.is_admin }
}

export interface ShiftOfferDetails {
  outreach_id: string
  volunteer_name: string
  shift_title: string
  shift_date: string
  start_time: string
  end_time: string
  role: string
  expires_at: string
}

export async function getShiftOfferDetails(token: string): Promise<ShiftOfferDetails> {
  return request<ShiftOfferDetails>('/auth/shift-offer/details', {
    method: 'POST',
    body: JSON.stringify({ token }),
  })
}

export async function acceptCover(token: string): Promise<{ message: string; assignment_id: string }> {
  return request('/api/assignments/cover', {
    method: 'POST',
    body: JSON.stringify({ token }),
  })
}

export async function declineCover(token: string): Promise<{ message: string }> {
  return request('/api/assignments/cover/decline', {
    method: 'POST',
    body: JSON.stringify({ token }),
  })
}

// ── Volunteers ────────────────────────────────────────────────────────────────

export async function getVolunteers(): Promise<User[]> {
  return request<User[]>('/api/volunteers/')
}

export async function getVolunteer(id: string): Promise<User> {
  return request<User>(`/api/volunteers/${id}`)
}

export async function inviteVolunteer(body: InviteVolunteerBody): Promise<{ message: string; token?: string }> {
  return request('/api/volunteers/invite', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function updateVolunteer(id: string, body: Partial<User>): Promise<User> {
  return request<User>(`/api/volunteers/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export async function getAvailability(id: string): Promise<{ recurring: AvailabilityRecurring[]; overrides: AvailabilityOverride[] }> {
  return request(`/api/volunteers/${id}/availability`)
}

export async function setAvailability(id: string, body: SetAvailabilityBody): Promise<{ message: string }> {
  return request(`/api/volunteers/${id}/availability`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

// ── Shifts ────────────────────────────────────────────────────────────────────

export async function getShifts(params?: { date?: string; status?: string; user_id?: string }): Promise<Shift[]> {
  const qs = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : ''
  const raw = await request<Record<string, unknown>[]>(`/api/shifts/${qs}`)
  return raw.map(mapShift)
}

export async function getShift(id: string): Promise<Shift> {
  const raw = await request<Record<string, unknown>>(`/api/shifts/${id}`)
  return mapShift(raw)
}

export async function createShift(body: CreateShiftBody): Promise<Shift> {
  const raw = await request<Record<string, unknown>>('/api/shifts/', {
    method: 'POST',
    body: JSON.stringify(body),
  })
  return mapShift(raw)
}

export async function updateShift(id: string, body: Partial<CreateShiftBody>): Promise<Shift> {
  const raw = await request<Record<string, unknown>>(`/api/shifts/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
  return mapShift(raw)
}

export async function cancelShift(id: string): Promise<{ message: string }> {
  return request(`/api/shifts/${id}`, { method: 'DELETE' })
}

export async function getAvailableShifts(userId: string): Promise<Shift[]> {
  const raw = await request<Record<string, unknown>[]>(`/api/shifts/available?user_id=${userId}`)
  return raw.map(mapShift)
}

export async function assignVolunteer(shiftId: string, body: { user_id: string; shift_position_id: string }): Promise<ShiftAssignment> {
  const raw = await request<Record<string, unknown>>(`/api/shifts/${shiftId}/assign`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
  return mapAssignment(raw)
}

export async function triggerCoverage(shiftId: string): Promise<{ message: string }> {
  return request(`/api/shifts/${shiftId}/coverage`, { method: 'POST' })
}

// ── Assignments ───────────────────────────────────────────────────────────────

export async function acceptShift(body: { shift_position_id: string }): Promise<{ message: string; assignment_id: string }> {
  const session = getSession()
  return request('/api/assignments/', {
    method: 'POST',
    body: JSON.stringify({ user_id: session?.userId, shift_position_id: body.shift_position_id }),
  })
}

export async function cancelAssignment(id: string, reason?: string): Promise<{ message: string; cover_request_id?: string }> {
  return request(`/api/assignments/${id}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  })
}

export async function confirmAssignment(id: string, token: string): Promise<{ message: string }> {
  return request(`/api/assignments/${id}/confirm`, {
    method: 'POST',
    body: JSON.stringify({ token }),
  })
}
