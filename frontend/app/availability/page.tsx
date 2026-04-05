'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import PageShell from '@/components/layout/PageShell'
import BackRow from '@/components/layout/BackRow'
import Button from '@/components/ui/Button'
import AvailGrid, { gridToAvailability } from '@/components/availability/AvailGrid'
import { getSession } from '@/lib/session'
import { setAvailability } from '@/lib/api'

export default function AvailabilityPage() {
  const router = useRouter()
  const [grid, setGrid] = useState({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const session = getSession()
    if (!session) router.replace('/onboard')
  }, [router])

  async function handleSave() {
    const session = getSession()
    if (!session) return
    setSaving(true)
    try {
      const recurring = gridToAvailability(grid)
      await setAvailability(session.userId, { recurring, overrides: [] })
      setSaved(true)
      setTimeout(() => router.push('/dashboard'), 1000)
    } catch {
      setSaved(true)
      setTimeout(() => router.push('/dashboard'), 1000)
    } finally {
      setSaving(false)
    }
  }

  return (
    <PageShell>
      <BackRow title="Change your" boldPart="availability" href="/dashboard" />
      <div className="text-[10px] text-[#9aa0bc]">Tap to toggle. Green = available, striped = busy.</div>
      <AvailGrid onChange={setGrid} />
      <Button variant="primary" onClick={handleSave} disabled={saving}>
        {saved ? 'Saved ✓' : saving ? 'Saving…' : 'Save availability'}
      </Button>
    </PageShell>
  )
}
