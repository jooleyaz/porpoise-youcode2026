'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import PageShell from '@/components/layout/PageShell'
import BackRow from '@/components/layout/BackRow'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { getSession } from '@/lib/session'
import { getVolunteer, updateVolunteer } from '@/lib/api'
import type { User } from '@/types'

export default function VolunteerDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params)
  const router = useRouter()
  const [volunteer, setVolunteer] = useState<User | null>(null)
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')

  useEffect(() => {
    const session = getSession()
    if (!session?.isAdmin) { router.replace('/shifts'); return }

    getVolunteer(params.id)
      .catch(() => ({
        id: params.id, name: 'Jane D.', phone: '(604)-111-2222',
        status: 'active' as const, is_admin: false, total_hours_volunteered: 12,
        roles: [{ id: 'r1', name: 'Kitchen' }, { id: 'r2', name: 'Front of House' }],
      } as User))
      .then(v => {
        setVolunteer(v)
        setName(v.name)
        setPhone(v.phone)
      })
  }, [params.id, router])

  async function handleSave() {
    if (!volunteer) return
    setSaving(true)
    try {
      await updateVolunteer(volunteer.id, { name, phone })
      setVolunteer(prev => prev ? { ...prev, name, phone } : prev)
    } catch { /* dev */ }
    finally { setSaving(false) }
  }

  if (!volunteer) {
    return (
      <PageShell>
        <BackRow href="/volunteers" />
        <div className="text-[12px] text-[#9aa0bc] text-center mt-4">Loading…</div>
      </PageShell>
    )
  }

  return (
    <PageShell>
      <BackRow title={volunteer.name} href="/volunteers" />

      <div className="bg-[#C2CAE7] rounded-xl p-[12px] flex flex-col gap-2">
        <div className="flex justify-between items-center">
          <span className="text-[12px] font-semibold text-[#3D4975]">Name</span>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            className="text-[12px] text-[#4a5280] bg-transparent outline-none text-right"
          />
        </div>
        <div className="h-px bg-[#a0aad0]" />
        <div className="flex justify-between items-center">
          <span className="text-[12px] font-semibold text-[#3D4975]">Phone</span>
          <input
            value={phone}
            onChange={e => setPhone(e.target.value)}
            className="text-[12px] text-[#4a5280] bg-transparent outline-none text-right"
          />
        </div>
        <div className="h-px bg-[#a0aad0]" />
        <div className="flex justify-between items-center">
          <span className="text-[12px] font-semibold text-[#3D4975]">Status</span>
          <Badge status={volunteer.status} />
        </div>
      </div>

      <div className="bg-[#D8EAEF] rounded-xl px-[12px] py-[10px]">
        <div className="text-[11px] font-semibold text-[#2d5a5a] mb-1">Roles</div>
        <div className="flex flex-wrap gap-1">
          {(volunteer.roles ?? []).map(r => (
            <span key={r.id} className="bg-[#BDDEDE] text-[#2d5a5a] rounded-full px-2 py-0.5 text-[10px] font-medium">
              {r.name}
            </span>
          ))}
        </div>
      </div>

      <div className="bg-[#f8f9fc] rounded-xl px-[12px] py-[10px] flex justify-between items-center">
        <span className="text-[12px] text-[#5a6490]">Total hours</span>
        <span className="text-[13px] font-semibold text-[#3D4975]">{volunteer.total_hours_volunteered}h</span>
      </div>

      <Button variant="primary" onClick={handleSave} disabled={saving}>
        {saving ? 'Saving…' : 'Save changes'}
      </Button>
    </PageShell>
  )
}
