import { useCallback } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer, LabelList } from 'recharts'
import { X, Download, BarChart2 } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  excalidrawApi: any | null
  voteMap: Record<string, number>
  onClose: () => void
}

const COLORS = ['#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444', '#f97316', '#06b6d4', '#84cc16']

function truncate(str: string, max: number) {
  return str.length > max ? str.slice(0, max) + '...' : str
}

function mkId() { return Math.random().toString(36).substr(2, 9) }

export default function VoteResultsPopup({ excalidrawApi, voteMap, onClose }: Props) {
  const getLabel = useCallback((elementId: string): string => {
    if (!excalidrawApi) return elementId.slice(0, 8)
    try {
      const elements = excalidrawApi.getSceneElements() as any[]
      const el = elements.find((e: any) => e.id === elementId)
      if (!el) return 'Element'
      const text = el.text || el.label || ''
      const cleaned = text.replace(/\n/g, ' ').trim()
      return truncate(cleaned || el.type, 28)
    } catch {
      return elementId.slice(0, 8)
    }
  }, [excalidrawApi])

  const data = Object.entries(voteMap)
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a)
    .map(([id, votes]) => ({ id, name: getLabel(id), votes }))

  const totalVotes = data.reduce((s, d) => s + d.votes, 0)
  const maxVotes = data[0]?.votes || 1

  const insertToCanvas = useCallback(() => {
    if (!excalidrawApi) return
    if (data.length === 0) { toast.error('No votes to insert'); return }

    try {
      const appState = excalidrawApi.getAppState()
      const zoom = appState.zoom?.value || 1
      const cx = (window.innerWidth / 2 - appState.scrollX) / zoom
      const cy = (window.innerHeight / 2 - appState.scrollY) / zoom

      const w = 500, h = data.length * 44 + 100
      const now = Date.now()
      const mkEl = (overrides: any) => ({
        id: mkId(), angle: 0, strokeColor: '#374151', backgroundColor: 'transparent',
        fillStyle: 'hachure' as const, strokeWidth: 1, strokeStyle: 'solid' as const,
        roughness: 0, opacity: 100, seed: Math.floor(Math.random() * 100000),
        versionNonce: Math.floor(Math.random() * 100000), version: 1, isDeleted: false,
        boundElements: null, updated: now, locked: false, ...overrides,
      })

      const newElements: any[] = []
      // Background
      newElements.push(mkEl({ type: 'rectangle', x: cx - w / 2, y: cy - h / 2, width: w, height: h, backgroundColor: '#fffbeb', strokeColor: '#f59e0b', strokeWidth: 2 }))
      // Helper for compliant text elements
      const mkTxt = (x: number, y: number, width: number, text: string, fontSize: number, color: string, align: 'left' | 'center' | 'right' = 'left') =>
        mkEl({ type: 'text', x, y, width, height: Math.ceil(fontSize * 1.25), text, originalText: text, fontSize, fontFamily: 1, textAlign: align, verticalAlign: 'top', baseline: Math.ceil(fontSize * 0.8), containerId: null, autoResize: true, lineHeight: 1.25, strokeColor: color, backgroundColor: 'transparent' })
      // Title
      newElements.push(mkTxt(cx - w / 2 + 20, cy - h / 2 + 14, w - 40, `🏆 Vote Results — Total: ${totalVotes} votes`, 18, '#1f2937'))
      // Bars
      data.forEach((item, i) => {
        const barMaxW = w - 200
        const barW = Math.max(4, (item.votes / maxVotes) * barMaxW)
        const y = cy - h / 2 + 60 + i * 44
        const label = `${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`} ${item.name}`
        newElements.push(mkEl({ type: 'rectangle', x: cx - w / 2 + 160, y, width: barW, height: 30, backgroundColor: COLORS[i % COLORS.length], strokeColor: COLORS[i % COLORS.length] }))
        newElements.push(mkTxt(cx - w / 2 + 10, y + 6, 145, label, 13, '#374151'))
        newElements.push(mkTxt(cx - w / 2 + 165 + barW, y + 6, 60, `${item.votes}`, 13, '#374151'))
      })

      excalidrawApi.updateScene({ elements: [...excalidrawApi.getSceneElements(), ...newElements] })
      try { excalidrawApi.scrollToContent() } catch {}
      toast.success('Vote chart inserted into whiteboard!')
      onClose()
    } catch (e) {
      console.error(e)
      toast.error('Insert failed, please try again')
    }
  }, [excalidrawApi, data, totalVotes, onClose])

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b bg-gradient-to-r from-yellow-50 to-orange-50">
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            <BarChart2 size={18} className="text-yellow-600" />
            Vote Results
            <span className="text-sm font-normal text-gray-500 ml-1">Total: {totalVotes} votes</span>
          </h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        <div style={{ background: '#ffffff', padding: '20px' }}>
          <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 24 }}>🏆</span>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#1f2937' }}>Vote Results</div>
              <div style={{ fontSize: 12, color: '#6b7280' }}>Total: {totalVotes} votes</div>
            </div>
          </div>

          {data.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#9ca3af', padding: '32px 0' }}>No votes received</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={Math.max(160, data.length * 48 + 40)}>
                <BarChart data={data} layout="vertical" margin={{ top: 4, right: 70, left: 8, bottom: 4 }}>
                  <XAxis type="number" domain={[0, maxVotes]} tickCount={Math.min(maxVotes + 1, 6)} allowDecimals={false} tick={{ fontSize: 11, fill: '#6b7280' }} />
                  <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 12, fill: '#374151' }} />
                  <Tooltip formatter={(v: number) => [`${v} votes`, 'Count']} contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }} />
                  <Bar dataKey="votes" radius={[0, 6, 6, 0]} barSize={28}>
                    <LabelList dataKey="votes" position="right" style={{ fontSize: 12, fontWeight: 700, fill: '#374151' }} formatter={(v: number) => `${v} votes`} />
                    {data.map((entry, i) => <Cell key={entry.id} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {data.slice(0, 5).map((item, i) => (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 18, flexShrink: 0, minWidth: 28 }}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 13, fontWeight: 500, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: COLORS[i % COLORS.length], flexShrink: 0, marginLeft: 8 }}>{item.votes} votes</span>
                      </div>
                      <div style={{ height: 4, background: '#f3f4f6', borderRadius: 2, marginTop: 4 }}>
                        <div style={{ height: 4, borderRadius: 2, width: `${(item.votes / maxVotes) * 100}%`, background: COLORS[i % COLORS.length] }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="flex gap-3 px-5 py-4 border-t bg-gray-50">
          <button onClick={insertToCanvas} disabled={data.length === 0}
            className="flex-1 py-2.5 bg-yellow-500 text-white rounded-xl font-semibold text-sm hover:bg-yellow-600 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
            <Download size={15} />
            Insert to Whiteboard
          </button>
          <button onClick={onClose} className="px-5 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-600 hover:bg-gray-100">Close</button>
        </div>
      </div>
    </div>
  )
}
