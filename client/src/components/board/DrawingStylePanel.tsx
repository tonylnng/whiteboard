import { DrawingStyle } from '../../hooks/useDrawingStyle'

interface Props {
  style: DrawingStyle
  onChange: (next: Partial<DrawingStyle>) => void
  onReset: () => void
}

const STROKE_WIDTHS = [
  { value: 1, label: 'Thin', icon: '─' },
  { value: 2, label: 'Bold', icon: '━' },
  { value: 4, label: 'Extra', icon: '▬' },
]

const STROKE_STYLES = [
  { value: 'solid' as const, label: 'Solid', icon: '─' },
  { value: 'dashed' as const, label: 'Dashed', icon: '- -' },
  { value: 'dotted' as const, label: 'Dotted', icon: '···' },
]

const FILL_STYLES = [
  { value: 'hachure' as const, label: 'Hachure', icon: '▨' },
  { value: 'cross-hatch' as const, label: 'Cross', icon: '▤' },
  { value: 'solid' as const, label: 'Solid', icon: '■' },
  { value: 'none' as const, label: 'None', icon: '□' },
]

const ROUGHNESS = [
  { value: 0, label: 'Architect' },
  { value: 1, label: 'Artist' },
  { value: 2, label: 'Cartoonist' },
]

export default function DrawingStylePanel({ style, onChange, onReset }: Props) {
  return (
    <div className="p-3 space-y-3">

      {/* Stroke Width */}
      <div>
        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Stroke Width</p>
        <div className="flex gap-1.5">
          {STROKE_WIDTHS.map(opt => (
            <button
              key={opt.value}
              onClick={() => onChange({ strokeWidth: opt.value })}
              className={`flex-1 flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg border text-xs transition-colors ${style.strokeWidth === opt.value ? 'bg-teal-600 text-white border-teal-600' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'}`}
            >
              <span style={{ fontSize: opt.value === 1 ? 10 : opt.value === 2 ? 13 : 16 }}>{opt.icon}</span>
              <span className="text-[10px]">{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Stroke Style */}
      <div>
        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Stroke Style</p>
        <div className="flex gap-1.5">
          {STROKE_STYLES.map(opt => (
            <button
              key={opt.value}
              onClick={() => onChange({ strokeStyle: opt.value })}
              className={`flex-1 flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg border text-xs transition-colors ${style.strokeStyle === opt.value ? 'bg-teal-600 text-white border-teal-600' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'}`}
            >
              <span className="font-mono text-[11px]">{opt.icon}</span>
              <span className="text-[10px]">{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Fill Style */}
      <div>
        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Fill</p>
        <div className="grid grid-cols-4 gap-1.5">
          {FILL_STYLES.map(opt => (
            <button
              key={opt.value}
              onClick={() => onChange({ fillStyle: opt.value })}
              className={`flex flex-col items-center gap-0.5 px-1 py-1.5 rounded-lg border text-xs transition-colors ${style.fillStyle === opt.value ? 'bg-teal-600 text-white border-teal-600' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'}`}
            >
              <span className="text-base leading-none">{opt.icon}</span>
              <span className="text-[10px] leading-none">{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Sloppiness */}
      <div>
        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Sloppiness</p>
        <div className="flex gap-1.5">
          {ROUGHNESS.map(opt => (
            <button
              key={opt.value}
              onClick={() => onChange({ roughness: opt.value })}
              className={`flex-1 px-2 py-1.5 rounded-lg border text-xs font-medium transition-colors ${style.roughness === opt.value ? 'bg-teal-600 text-white border-teal-600' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Edges */}
      <div>
        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Edges</p>
        <div className="flex gap-1.5">
          {[
            { value: 'sharp' as const, label: 'Sharp', icon: '⬛' },
            { value: 'round' as const, label: 'Round', icon: '🟦' },
          ].map(opt => (
            <button
              key={opt.value}
              onClick={() => onChange({ roundness: opt.value })}
              className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg border text-xs font-medium transition-colors ${style.roundness === opt.value ? 'bg-teal-600 text-white border-teal-600' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'}`}
            >
              <span>{opt.icon}</span> {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Opacity */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Opacity</p>
          <span className="text-xs font-mono text-gray-600">{style.opacity}%</span>
        </div>
        <input
          type="range" min={10} max={100} step={10}
          value={style.opacity}
          onChange={e => onChange({ opacity: Number(e.target.value) })}
          className="w-full h-1.5 rounded-full accent-teal-600 cursor-pointer"
        />
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
