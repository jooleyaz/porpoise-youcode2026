'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import PageShell from '@/components/layout/PageShell'
import BackRow from '@/components/layout/BackRow'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { getSession } from '@/lib/session'
import { getVolunteers } from '@/lib/api'
import type { User } from '@/types'

export default function VolunteersPage() {
  const router = useRouter()
  const [volunteers, setVolunteers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const session = getSession()
    if (!session?.isAdmin) { router.replace('/shifts'); return }

    getVolunteers()
      .catch(() => [
        { id: 'u1', name: 'Jane D.', phone: '(604)-111-2222', status: 'active' as const, is_admin: false, total_hours_volunteered: 12, roles: [{ id: 'r1', name: 'Kitchen' }] },
        { id: 'u2', name: 'Samuel D.', phone: '(604)-333-4444', status: 'active' as const, is_admin: false, total_hours_volunteered: 8, roles: [{ id: 'r1', name: 'Kitchen' }, { id: 'r2', name: 'Front of House' }] },
        { id: 'u3', name: 'Julia Z.', phone: '(604)-555-6666', status: 'invited' as const, is_admin: false, total_hours_volunteered: 0, roles: [] },
      ] as User[])
      .then(v => { setVolunteers(v); setLoading(false) })
  }, [router])

  return (
    <PageShell>
      <BackRow title="Volunteer" boldPart="roster" href="/shifts" />

      <Button variant="primary" onClick={() => router.push('/volunteers/invite')}>
        + Invite volunteer
      </Button>

      {loading ? (
        <div className="text-[12px] text-[#9aa0bc] text-center mt-4">Loading…</div>
      ) : (
        <div className="flex flex-col gap-[8px] mt-1">
          {volunteers.map(v => (
            <button
              key={v.id}
              onClick={() => router.push(`/volunteers/${v.id}`)}
              className="bg-[#C2CAE7] rounded-xl px-[12px] py-[10px] text-left flex flex-col gap-1"
            >
              <div className="flex justify-between items-start">
                <div className="text-[13px] font-semibold text-[#3D4975]">{v.name}</div>
                <Badge status={v.status} />
              </div>
              <div className="text-[11px] text-[#5a6490]">{v.phone}</div>
              <div className="flex flex-wrap gap-1 mt-0.5">
                {(v.roles ?? []).map(r => (
                  <span key={r.id} className="bg-[#BDDEDE] text-[#2d5a5a] rounded-full px-2 py-0.5 text-[10px] font-medium">
                    {r.name}
                  </span>
                ))}
              </div>
              <div className="text-[10px] text-[#9aa0bc]">{v.total_hours_volunteered}h volunteered</div>
            </button>
          ))}
        </div>
      )}
    </PageShell>
  )
}
