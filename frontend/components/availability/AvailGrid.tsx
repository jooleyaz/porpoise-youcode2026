'use client'

import { useState, useCallback, useRef, useEffect } from 'react'

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const HOURS = [6, 7, 8, 9, 10, 11, 12, 13, 14, 17, 18, 22]

// 'oncall' = tentative / on-call (yellow diagonal stripe, colorblind-accessible)
type CellState = 'empty' | 'oncall'
type GridState = Record<string, CellState>

function cellKey(day: number, hour: number) {
  return `${day}-${hour}`
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

  // Drag state: track whether we're painting 'oncall' or 'empty'
  const dragging = useRef(false)
  const paintValue = useRef<CellState>('oncall')

  const paint = useCallback((day: number, hour: number) => {
    setGrid(prev => {
      const key = cellKey(day, hour)
      if (prev[key] === paintValue.current) return prev // already correct, no update
      const next = { ...prev, [key]: paintValue.current }
      onChange?.(next)
      return next
    })
  }, [onChange])

  function startDrag(day: number, hour: number) {
    dragging.current = true
    // Determine paint direction from the current cell state
    setGrid(prev => {
      const key = cellKey(day, hour)
      const current = prev[key] ?? 'empty'
      paintValue.current = current === 'oncall' ? 'empty' : 'oncall'
      const next = { ...prev, [key]: paintValue.current }
      onChange?.(next)
      return next
    })
  }

  function stopDrag() {
    dragging.current = false
  }

  function enterCell(day: number, hour: number) {
    if (dragging.current) paint(day, hour)
  }

  // Stop drag on mouseup anywhere in the document
  useEffect(() => {
    document.addEventListener('mouseup', stopDrag)
    document.addEventListener('touchend', stopDrag)
    return () => {
      document.removeEventListener('mouseup', stopDrag)
      document.removeEventListener('touchend', stopDrag)
    }
  }, [])

  // Touch: find which cell is under the touch point and paint it
  function handleTouchMove(e: React.TouchEvent) {
    if (!dragging.current) return
    e.preventDefault()
    const touch = e.touches[0]
    const el = document.elementFromPoint(touch.clientX, touch.clientY)
    if (!el) return
    const dayAttr = el.getAttribute('data-day')
    const hourAttr = el.getAttribute('data-hour')
    if (dayAttr !== null && hourAttr !== null) {
      paint(parseInt(dayAttr), parseInt(hourAttr))
    }
  }

  return (
    <div
      className="rounded-xl border border-[#d0d4e8] overflow-hidden bg-white select-none"
      onMouseLeave={stopDrag}
      onTouchMove={handleTouchMove}
    >
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
              <div
                key={day}
                data-day={day}
                data-hour={hour}
                onMouseDown={() => startDrag(day, hour)}
                onMouseEnter={() => enterCell(day, hour)}
                onTouchStart={(e) => { e.preventDefault(); startDrag(day, hour) }}
                aria-label={`${DAYS[day]} ${formatHour(hour)} — ${state}`}
                className="h-[18px] border-r border-[#eef0f6] last:border-r-0 cursor-pointer"
                style={
                  state === 'oncall'
                    ? { backgroundImage: 'repeating-linear-gradient(45deg, #e8c96a, #e8c96a 3px, #fdf3c0 3px, #fdf3c0 6px)' }
                    : { background: 'white' }
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
    if (grid[key] !== 'oncall') continue
    const [dayStr, hourStr] = key.split('-')
    const hour = parseInt(hourStr)
    result.push({
      day_of_week: parseInt(dayStr),
      start_time: `${String(hour).padStart(2, '0')}:00`,
      end_time:   `${String(hour + 1).padStart(2, '0')}:00`,
    })
  }
  return result
}
