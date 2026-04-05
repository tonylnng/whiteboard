import { DrawingStyle } from '../../hooks/useDrawingStyle'

interface Props {
  style: DrawingStyle
  onChange: (next: Partial<DrawingStyle>) => void
  onReset: () => void
}

// ── SVG icons matching Excalidraw's native property panel ──────────────────

function IconStrokeWidth1() {
  return <svg width="20" height="20" viewBox="0 0 20 20"><line x1="2" y1="10" x2="18" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
}
function IconStrokeWidth2() {
  return <svg width="20" height="20" viewBox="0 0 20 20"><line x1="2" y1="10" x2="18" y2="10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>
}
function IconStrokeWidth4() {
  return <svg width="20" height="20" viewBox="0 0 20 20"><line x1="2" y1="10" x2="18" y2="10" stroke="currentColor" strokeWidth="5" strokeLinecap="round" /></svg>
}

function IconSolid() {
  return <svg width="20" height="20" viewBox="0 0 20 20"><line x1="2" y1="10" x2="18" y2="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
}
function IconDashed() {
  return <svg width="20" height="20" viewBox="0 0 20 20"><line x1="2" y1="10" x2="18" y2="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="4 3" /></svg>
}
function IconDotted() {
  return <svg width="20" height="20" viewBox="0 0 20 20"><line x1="2" y1="10" x2="18" y2="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="1.5 3" /></svg>
}

// Sloppiness icons — smooth, slightly wavy, very wavy
function IconSloppy0() {
  // architect: smooth curve
  return (
    <svg width="20" height="20" viewBox="0 0 20 20">
      <path d="M2 13 Q6 7 10 10 Q14 13 18 7" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    </svg>
  )
}
function IconSloppy1() {
  // artist: slightly wobbly
  return (
    <svg width="20" height="20" viewBox="0 0 20 20">
      <path d="M2 12 Q5 6 8 10 Q11 14 14 8 Q16 5 18 9" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    </svg>
  )
}
function IconSloppy2() {
  // cartoonist: very wobbly
  return (
    <svg width="20" height="20" viewBox="0 0 20 20">
      <path d="M2 13 Q4 5 7 12 Q9 17 12 8 Q14 3 16 11 Q17 14 18 9" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    </svg>
  )
}

// Edge icons — sharp corners vs rounded
function IconSharp() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20">
      <rect x="3" y="3" width="14" height="14" rx="0" stroke="currentColor" strokeWidth="1.5" fill="none" strokeDasharray="3 2" />
    </svg>
  )
}
function IconRound() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20">
      <rect x="3" y="3" width="14" height="14" rx="4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeDasharray="3 2" />
    </svg>
  )
}

// ── Row of icon toggle buttons ─────────────────────────────────────────────

interface ToggleRowProps<T> {
  options: { value: T; icon: React.ReactNode; label: string }[]
  selected: T
  onChange: (v: T) => void
}
function ToggleRow<T>({ options, selected, onChange }: ToggleRowProps<T>) {
  return (
    <div className="flex gap-1">
      {options.map((opt, i) => (
        <button
          key={i}
          title={opt.label}
          onClick={() => onChange(opt.value)}
          className={`flex items-center justify-center w-9 h-9 rounded-lg border transition-colors
            ${selected === opt.value
              ? 'bg-violet-100 text-violet-700 border-violet-300'
              : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
            }`}
        >
          {opt.icon}
        </button>
      ))}
    </div>
  )
}

// ── Main panel ─────────────────────────────────────────────────────────────

export default function DrawingStylePanel({ style, onChange, onReset }: Props) {
  return (
    <div className="p-3 space-y-4">

      {/* Stroke width */}
      <div>
        <p className="text-[11px] font-semibold text-gray-500 mb-2">Stroke width</p>
        <ToggleRow
          options={[
            { value: 1, icon: <IconStrokeWidth1 />, label: 'Thin' },
            { value: 2, icon: <IconStrokeWidth2 />, label: 'Bold' },
            { value: 4, icon: <IconStrokeWidth4 />, label: 'Extra bold' },
          ]}
          selected={style.strokeWidth}
          onChange={v => onChange({ strokeWidth: v })}
        />
      </div>

      {/* Stroke style */}
      <div>
        <p className="text-[11px] font-semibold text-gray-500 mb-2">Stroke style</p>
        <ToggleRow
          options={[
            { value: 'solid' as const, icon: <IconSolid />, label: 'Solid' },
            { value: 'dashed' as const, icon: <IconDashed />, label: 'Dashed' },
            { value: 'dotted' as const, icon: <IconDotted />, label: 'Dotted' },
          ]}
          selected={style.strokeStyle}
          onChange={v => onChange({ strokeStyle: v })}
        />
      </div>

      {/* Sloppiness */}
      <div>
        <p className="text-[11px] font-semibold text-gray-500 mb-2">Sloppiness</p>
        <ToggleRow
          options={[
            { value: 0, icon: <IconSloppy0 />, label: 'Architect' },
            { value: 1, icon: <IconSloppy1 />, label: 'Artist' },
            { value: 2, icon: <IconSloppy2 />, label: 'Cartoonist' },
          ]}
          selected={style.roughness}
          onChange={v => onChange({ roughness: v })}
        />
      </div>

      {/* Edges */}
      <div>
        <p className="text-[11px] font-semibold text-gray-500 mb-2">Edges</p>
        <ToggleRow
          options={[
            { value: 'sharp' as const, icon: <IconSharp />, label: 'Sharp' },
            { value: 'round' as const, icon: <IconRound />, label: 'Round' },
          ]}
          selected={style.roundness}
          onChange={v => onChange({ roundness: v })}
        />
      </div>

      {/* Opacity */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] font-semibold text-gray-500">Opacity</p>
          <span className="text-[11px] font-mono text-gray-500 tabular-nums">{style.opacity}</span>
        </div>
        <div className="relative flex items-center gap-2">
          <span className="text-[10px] text-gray-400 shrink-0 w-3">0</span>
          <input
            type="range" min={10} max={100} step={10}
            value={style.opacity}
            onChange={e => onChange({ opacity: Number(e.target.value) })}
            className="flex-1 h-2 rounded-full accent-violet-600 cursor-pointer"
            style={{
              background: `linear-gradient(to right, #7c3aed ${(style.opacity - 10) / 90 * 100}%, #e5e7eb ${(style.opacity - 10) / 90 * 100}%)`,
            }}
          />
          <span className="text-[10px] text-gray-400 shrink-0 w-6 text-right">100</span>
        </div>
      </div>

      {/* Reset */}
      <div className="pt-1 border-t border-gray-100">
        <button
          onClick={onReset}
          className="w-full py-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          ↺ Reset to defaults
        </button>
      </div>
    </div>
  )
}
