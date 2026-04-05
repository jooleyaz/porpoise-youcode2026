const DEFAULT_DATA = [
  { label: 'Oct', value: 18 },
  { label: 'Nov', value: 26 },
  { label: 'Dec', value: 22 },
  { label: 'Jan', value: 34 },
  { label: 'Feb', value: 30 },
  { label: 'Mar', value: 46 },
  { label: 'Apr', value: 40 },
]

interface ChartAreaProps {
  title?: string
  data?: { label: string; value: number }[]
}

export default function ChartArea({ title, data = DEFAULT_DATA }: ChartAreaProps) {
  const SVG_W = 180
  const SVG_H = 44
  const n = data.length

  const values = data.map(d => d.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1

  // Normalize: higher value → lower y (SVG y-axis is inverted)
  const pts = data.map((d, i) => {
    const x = n === 1 ? SVG_W / 2 : (i / (n - 1)) * SVG_W
    const y = SVG_H - ((d.value - min) / range) * (SVG_H - 6)
    return { x, y, label: d.label }
  })

  const polyline = pts.map(p => `${p.x},${p.y}`).join(' ')

  return (
    <div className="bg-[#D8EAEF] rounded-xl px-[12px] py-[10px]">
      {title && (
        <div className="text-[10px] font-semibold text-[#3D4975] mb-[4px]">{title}</div>
      )}
      <svg viewBox={`0 0 ${SVG_W} 55`} preserveAspectRatio="none" className="w-full h-[52px]">
        <polyline points={polyline} fill="none" stroke="#3D4975" strokeWidth="1.8" />
        {pts.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="2.5" fill="#3D4975" />
        ))}
        {pts.map((p, i) => (
          <text key={i} x={p.x} y="54" fontSize="7" fill="#5a7a8a" textAnchor={i === n - 1 ? 'end' : i === 0 ? 'start' : 'middle'}>
            {p.label}
          </text>
        ))}
      </svg>
    </div>
  )
}
