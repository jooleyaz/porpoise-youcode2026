'use client'

import { useState, useCallback } from 'react'

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const HOURS = [6, 7, 8, 9, 10, 11, 12, 13, 14, 17, 18, 22] // sparse like mockup

type CellState = 'empty' | 'avail' | 'busy'

type GridState = Record<string, CellState>

function cellKey(day: number, hour: number) {
  return `${day}-${hour}`
}

function nextState(s: CellState): CellState {
  if (s === 'empty') return 'avail'
  if (s === 'avail') return 'busy'
  return 'empty'
}

function formatHour(h: number) {
  if (h === 0) return '12am'
  if (h < 12) return `${h}am`
  if (h === 12) return '12pm'
  return `${h - 12}pm`
}

interface AvailGridProps {
  initialGrid?: GridState
  onChange?: (grid: GridState) => void
}

export default function AvailGrid({ initialGrid = {}, onChange }: AvailGridProps) {
  const [grid, setGrid] = useState<GridState>(initialGrid)

  const toggle = useCallback((day: number, hour: number) => {
    setGrid(prev => {
      const key = cellKey(day, hour)
      const next = { ...prev, [key]: nextState(prev[key] ?? 'empty') }
      onChange?.(next)
      return next
    })
  }, [onChange])

  return (
    <div className="rounded-xl border border-[#d0d4e8] overflow-hidden bg-white">
      {/* Header row */}
      <div className="grid" style={{ gridTemplateColumns: '36px repeat(7, 1fr)' }}>
        <div />
        {DAYS.map((d, i) => (
          <div key={i} className="text-[9px] font-semibold text-[#5a6490] text-center py-[5px] px-0.5">
            {d}
          </div>
        ))}
      </div>

      {/* Hour rows */}
      {HOURS.map(hour => (
        <div key={hour} className="grid" style={{ gridTemplateColumns: '36px repeat(7, 1fr)' }}>
          <div className="text-[8px] text-[#9aa0bc] text-right pr-1 leading-[18px] h-[18px]">
            {formatHour(hour)}
          </div>
          {DAYS.map((_, day) => {
            const key = cellKey(day, hour)
            const state = grid[key] ?? 'empty'
            return (
              <button
                key={day}
                onClick={() => toggle(day, hour)}
                aria-label={`${DAYS[day]} ${formatHour(hour)} — ${state}`}
                className={`h-[18px] border-r border-[#eef0f6] last:border-r-0 transition-colors ${
                  state === 'avail'
                    ? 'bg-[#c8ecd8]'
                    : state === 'busy'
                    ? 'busy-cell'
                    : 'bg-white hover:bg-[#f0f2f8]'
                }`}
                style={
                  state === 'busy'
                    ? {
                        backgroundImage:
                          'repeating-linear-gradient(45deg, #e8d9b8, #e8d9b8 3px, #f5eedd 3px, #f5eedd 6px)',
                      }
                    : undefined
                }
              />
            )
          })}
        </div>
      ))}
    </div>
  )
}

// Helper: convert GridState → AvailabilityRecurring array for API
export function gridToAvailability(grid: GridState): { day_of_week: number; start_time: string; end_time: string }[] {
  const result: { day_of_week: number; start_time: string; end_time: string }[] = []

  for (const key of Object.keys(grid)) {
    if (grid[key] !== 'avail') continue
    const [dayStr, hourStr] = key.split('-')
    const day = parseInt(dayStr)
    const hour = parseInt(hourStr)
    const start_time = `${String(hour).padStart(2, '0')}:00`
    const end_time = `${String(hour + 1).padStart(2, '0')}:00`
    result.push({ day_of_week: day, start_time, end_time })
  }

  return result
}
