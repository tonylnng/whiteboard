import { useState } from 'react'
import { Play, X } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  excalidrawApi: any | null
}

interface EmbedPreset {
  label: string
  icon: string
  placeholder: string
  example: string
}

const PRESETS: EmbedPreset[] = [
  { label: 'YouTube', icon: '▶️', placeholder: 'https://www.youtube.com/watch?v=...', example: 'https://youtu.be/dQw4w9WgXcQ' },
  { label: 'Vimeo', icon: '🎬', placeholder: 'https://vimeo.com/...', example: 'https://vimeo.com/123456789' },
  { label: 'Google Slides', icon: '📊', placeholder: 'https://docs.google.com/presentation/...', example: 'https://docs.google.com/presentation/d/xxx/edit' },
  { label: 'Google Docs', icon: '📄', placeholder: 'https://docs.google.com/document/...', example: 'https://docs.google.com/document/d/xxx/edit' },
  { label: 'Figma', icon: '🎨', placeholder: 'https://www.figma.com/file/...', example: 'https://www.figma.com/file/xxx' },
  { label: 'CodePen', icon: '💻', placeholder: 'https://codepen.io/user/pen/...', example: 'https://codepen.io/user/pen/abc123' },
  { label: 'Spotify', icon: '🎵', placeholder: 'https://open.spotify.com/track/...', example: 'https://open.spotify.com/track/xxx' },
  { label: 'Custom URL', icon: '🌐', placeholder: 'https://...', example: 'Any embeddable URL' },
]

function detectPreset(url: string): number {
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 0
  if (url.includes('vimeo.com')) return 1
  if (url.includes('docs.google.com/presentation')) return 2
  if (url.includes('docs.google.com/document')) return 3
  if (url.includes('figma.com')) return 4
  if (url.includes('codepen.io')) return 5
  if (url.includes('spotify.com')) return 6
  return 7
}

function mkId() { return Math.random().toString(36).substr(2, 9) }

export default function MediaEmbed({ excalidrawApi }: Props) {
  const [open, setOpen] = useState(false)
  const [url, setUrl] = useState('')
  const [selectedPreset, setSelectedPreset] = useState(0)
  const [width, setWidth] = useState(640)
  const [height, setHeight] = useState(400)

  const handleInsert = () => {
    if (!excalidrawApi || !url.trim()) {
      toast.error('請輸入 URL')
      return
    }
    const trimmedUrl = url.trim()
    const preset = PRESETS[selectedPreset]

    try {
      const appState = excalidrawApi.getAppState()
      const zoom = appState.zoom?.value || 1
      const cx = (window.innerWidth / 2 - appState.scrollX) / zoom
      const cy = (window.innerHeight / 2 - appState.scrollY) / zoom

      const newEl = {
        id: mkId(),
        type: 'embeddable',
        x: cx - width / 2,
        y: cy - height / 2,
        width,
        height,
        link: trimmedUrl,
        angle: 0,
        strokeColor: '#374151',
        backgroundColor: 'transparent',
        fillStyle: 'hachure' as const,
        strokeWidth: 1,
        strokeStyle: 'solid' as const,
        roughness: 1,
        opacity: 100,
        seed: Math.floor(Math.random() * 100000),
        versionNonce: Math.floor(Math.random() * 100000),
        version: 1,
        isDeleted: false,
        boundElements: null,
        updated: Date.now(),
        locked: false,
      }

      excalidrawApi.updateScene({
        elements: [...excalidrawApi.getSceneElements(), newEl],
      })
      try { excalidrawApi.scrollToContent() } catch {}
      toast.success(`已嵌入 ${preset.label}`)
      setUrl('')
      setOpen(false)
    } catch (e) {
      console.error('Embed error:', e)
      toast.error('無法嵌入此 URL，請確認連結有效')
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:text-teal-600 hover:bg-teal-50 rounded-lg border border-gray-200 transition-colors"
        title="嵌入媒體"
      >
        <Play size={13} />
        嵌入媒體
      </button>

      {open && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                <Play size={16} className="text-teal-600" />
                嵌入媒體到白板
              </h3>
              <button onClick={() => setOpen(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X size={18} className="text-gray-500" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">媒體類型</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {PRESETS.map((p, i) => (
                    <button key={p.label} onClick={() => setSelectedPreset(i)}
                      className={`flex flex-col items-center gap-1 p-2 rounded-lg text-xs border transition-all ${selectedPreset === i ? 'bg-teal-50 border-teal-400 text-teal-700' : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'}`}>
                      <span className="text-lg">{p.icon}</span>
                      <span className="font-medium leading-tight text-center">{p.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">URL</label>
                <input type="url" value={url}
                  onChange={e => { setUrl(e.target.value); setSelectedPreset(detectPreset(e.target.value)) }}
                  onKeyDown={e => e.key === 'Enter' && handleInsert()}
                  placeholder={PRESETS[selectedPreset].placeholder}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  autoFocus />
                <p className="text-xs text-gray-400 mt-1">例如：{PRESETS[selectedPreset].example}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">寬度 (px)</label>
                  <select value={width} onChange={e => { const w = Number(e.target.value); setWidth(w); if (selectedPreset <= 1) setHeight(Math.round(w * 9 / 16)) }}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none">
                    <option value={480}>480</option>
                    <option value={640}>640</option>
                    <option value={854}>854</option>
                    <option value={1280}>1280</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">高度 (px)</label>
                  <select value={height} onChange={e => setHeight(Number(e.target.value))}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none">
                    <option value={270}>270</option>
                    <option value={360}>360</option>
                    <option value={400}>400</option>
                    <option value={480}>480</option>
                    <option value={720}>720</option>
                  </select>
                </div>
              </div>

              <div className="bg-blue-50 rounded-lg px-3 py-2 text-xs text-blue-600">
                💡 支援：YouTube、Vimeo、Google Slides/Docs、Figma、CodePen、Spotify 等可嵌入連結
              </div>

              <button onClick={handleInsert} disabled={!url.trim()}
                className="w-full py-2.5 bg-teal-600 text-white rounded-xl font-semibold text-sm hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2">
                <Play size={15} />
                嵌入到白板
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
