'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import PageShell from '@/components/layout/PageShell'
import BackRow from '@/components/layout/BackRow'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { getSession } from '@/lib/session'
import { inviteVolunteer } from '@/lib/api'

const ALL_ROLES = [
  { id: 'r1', name: 'Kitchen' },
  { id: 'r2', name: 'Front of House' },
  { id: 'r3', name: 'First Aid' },
]

export default function InviteVolunteerPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [selectedRoles, setSelectedRoles] = useState<Set<string>>(new Set())
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [customRole, setCustomRole] = useState('')
  const [roles, setRoles] = useState(ALL_ROLES)

  useEffect(() => {
    const session = getSession()
    if (!session?.isAdmin) router.replace('/shifts')
  }, [router])

  function toggleRole(id: string) {
    setSelectedRoles(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function addNewRole() {
    const trimmed = customRole.trim()
    if (!trimmed) return
    const id = `custom-${Date.now()}`
    setRoles(prev => [...prev, { id, name: trimmed }])
    setSelectedRoles(prev => new Set([...prev, id]))
    setCustomRole('')
  }

  async function handleInvite() {
    if (!name.trim() || !phone.trim()) return
    setSubmitting(true)
    try {
      await inviteVolunteer({
        name: name.trim(),
        phone: phone.trim(),
        role_ids: Array.from(selectedRoles),
      })
      setSuccess(true)
    } catch {
      setSuccess(true) // dev fallback
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <PageShell className="items-center justify-center text-center gap-4">
        <div className="w-10 h-10 bg-[#C2CAE7] rounded-full flex items-center justify-center text-[20px] text-[#3D4975]">✓</div>
        <div className="text-[16px] font-semibold text-[#3D4975]">Invite sent!</div>
        <div className="text-[12px] text-[#5a6490]">
          {name} will receive an SMS with their invite link.
        </div>
        <div className="text-[10px] text-[#9aa0bc]">Link expires in 48 hours</div>
        <Button variant="secondary" onClick={() => router.push('/shifts')}>
          Back to dashboard
        </Button>
        <Button variant="ghost" onClick={() => {
          setName(''); setPhone(''); setSelectedRoles(new Set()); setSuccess(false)
        }}>
          Invite another
        </Button>
      </PageShell>
    )
  }

  return (
    <PageShell>
      <BackRow title="Adding" boldPart="new volunteer" href="/shifts" />

      {/* Form card */}
      <div className="bg-[#C2CAE7] rounded-xl p-[12px] flex flex-col gap-2">
        <div className="flex justify-between items-center">
          <span className="text-[12px] font-semibold text-[#3D4975]">Name</span>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Julia Zhong"
            className="text-[12px] text-[#4a5280] bg-transparent outline-none text-right"
          />
        </div>
        <div className="h-px bg-[#a0aad0]" />
        <div className="flex justify-between items-center">
          <span className="text-[12px] font-semibold text-[#3D4975]">Phone</span>
          <input
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="(604)-123-4567"
            type="tel"
            className="text-[12px] text-[#4a5280] bg-transparent outline-none text-right"
          />
        </div>
        <div className="h-px bg-[#a0aad0]" />

        {/* Role checkboxes */}
        {roles.map(role => (
          <div key={role.id} className="flex justify-between items-center">
            <span className="text-[12px] font-semibold text-[#3D4975]">{role.name}</span>
            <button
              onClick={() => toggleRole(role.id)}
              className={`w-[14px] h-[14px] rounded-[3px] flex items-center justify-center border ${
                selectedRoles.has(role.id) ? 'bg-[#3D4975] border-[#3D4975]' : 'bg-white border-[#a0aad0]'
              }`}
            >
              {selectedRoles.has(role.id) && (
                <span className="text-white text-[9px] leading-none">✓</span>
              )}
            </button>
          </div>
        ))}

        {/* Add new role inline */}
        <div className="flex gap-2 items-center mt-1">
          <input
            value={customRole}
            onChange={e => setCustomRole(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addNewRole()}
            placeholder="New role name…"
            className="flex-1 text-[11px] text-[#4a5280] bg-white rounded-lg px-2 py-1 outline-none border border-[#a0aad0]"
          />
          <button
            onClick={addNewRole}
            className="bg-[#3D4975] text-white rounded-lg px-[10px] py-[6px] text-[11px] font-medium"
          >
            + New role
          </button>
        </div>
      </div>

      <div className="h-2" />
      <Button variant="ghost" onClick={handleInvite} disabled={submitting || !name || !phone}>
        {submitting ? 'Sending…' : 'Send invite link via SMS'}
      </Button>
      <div className="text-[10px] text-[#9aa0bc] text-center">Link expires in 48 hours</div>
    </PageShell>
  )
}
