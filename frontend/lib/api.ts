import { getSession } from '@/lib/session'
import type {
  User,
  Shift,
  AvailabilityRecurring,
  AvailabilityOverride,
  ShiftAssignment,
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

// ── Auth ──────────────────────────────────────────────────────────────────────

export async function validateToken(token: string): Promise<Session> {
  return request<Session>('/auth/validate-token', {
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

export async function getShifts(params?: { date?: string; status?: string }): Promise<Shift[]> {
  const qs = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : ''
  return request<Shift[]>(`/api/shifts/${qs}`)
}

export async function getShift(id: string): Promise<Shift> {
  return request<Shift>(`/api/shifts/${id}`)
}

export async function createShift(body: CreateShiftBody): Promise<Shift> {
  return request<Shift>('/api/shifts/', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function updateShift(id: string, body: Partial<CreateShiftBody>): Promise<Shift> {
  return request<Shift>(`/api/shifts/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export async function cancelShift(id: string): Promise<{ message: string }> {
  return request(`/api/shifts/${id}`, { method: 'DELETE' })
}

export async function getAvailableShifts(userId: string): Promise<Shift[]> {
  return request<Shift[]>(`/api/shifts/available?user_id=${userId}`)
}

export async function assignVolunteer(shiftId: string, body: { user_id: string; shift_position_id: string }): Promise<ShiftAssignment> {
  return request<ShiftAssignment>(`/api/shifts/${shiftId}/assign`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function triggerCoverage(shiftId: string): Promise<{ message: string }> {
  return request(`/api/shifts/${shiftId}/coverage`, { method: 'POST' })
}

// ── Assignments ───────────────────────────────────────────────────────────────

export async function acceptShift(body: { shift_position_id: string; user_id: string }): Promise<ShiftAssignment> {
  return request<ShiftAssignment>('/api/assignments/', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function cancelAssignment(id: string): Promise<{ message: string }> {
  return request(`/api/assignments/${id}/cancel`, { method: 'POST' })
}

export async function confirmAssignment(id: string): Promise<ShiftAssignment> {
  return request<ShiftAssignment>(`/api/assignments/${id}/confirm`, { method: 'POST' })
}
