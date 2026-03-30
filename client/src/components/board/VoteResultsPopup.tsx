import { useCallback } from 'react'
import { Editor, createShapeId } from 'tldraw'
import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer, LabelList } from 'recharts'
import { X, Download, BarChart2 } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  editor: Editor | null
  voteMap: Record<string, number>
  onClose: () => void
}

const COLORS = ['#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444', '#f97316', '#06b6d4', '#84cc16']

function truncate(str: string, max: number) {
  return str.length > max ? str.slice(0, max) + '...' : str
}

function extractText(node: any): string {
  if (!node) return ''
  if (typeof node === 'string') return node
  if (node.text) return node.text
  if (Array.isArray(node)) return node.map(extractText).filter(Boolean).join(' ')
  if (node.children) return extractText(node.children)
  if (node.content) return extractText(node.content)
  return ''
}

export default function VoteResultsPopup({ editor, voteMap, onClose }: Props) {
  const getLabel = useCallback((shapeId: string): string => {
    if (!editor) return shapeId.slice(0, 8)
    try {
      const shape = editor.getShape(shapeId as any) as any
      if (!shape) return 'Shape'
      const text = extractText(shape?.props?.richText)
        || shape?.props?.text
        || shape?.props?.label
        || ''
      const cleaned = text.replace(/\n/g, ' ').trim()
      return truncate(cleaned || shape.type, 28)
    } catch {
      return shapeId.slice(0, 8)
    }
  }, [editor])

  const data = Object.entries(voteMap)
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a)
    .map(([id, votes]) => ({ id, name: getLabel(id), votes }))

  const totalVotes = data.reduce((s, d) => s + d.votes, 0)
  const maxVotes = data[0]?.votes || 1

  const insertToCanvas = useCallback(() => {
    if (!editor) return
    if (data.length === 0) { toast.error('No votes to insert'); return }

    try {
      const b = editor.getViewportPageBounds()
      const cx = b.x + b.w / 2
      const cy = b.y + b.h / 2
      const w = Math.max(380, Math.min(560, b.w * 0.65))
      const h = Math.max(200, data.length * 56 + 100)

      editor.createShape({
        id: createShapeId(),
        type: 'vote-chart',
        x: cx - w / 2,
        y: cy - h / 2,
        props: {
          w,
          h,
          chartData: data.map(d => ({ name: d.name, votes: d.votes })),
          totalVotes,
        },
      } as any)

      try { (editor as any).zoomToContent?.() } catch {}
      toast.success('Vote chart inserted into whiteboard!')
      onClose()
    } catch (e) {
      console.error(e)
      toast.error('Insert failed, please try again')
    }
  }, [editor, data, totalVotes, onClose])

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">

        {/* Header */}
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

        {/* Chart area - this gets screenshotted */}
        <div style={{ background: '#ffffff', padding: '20px' }}>
          {/* Chart title */}
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
              {/* Recharts bar chart */}
              <ResponsiveContainer width="100%" height={Math.max(160, data.length * 48 + 40)}>
                <BarChart data={data} layout="vertical" margin={{ top: 4, right: 70, left: 8, bottom: 4 }}>
                  <XAxis type="number" domain={[0, maxVotes]} tickCount={Math.min(maxVotes + 1, 6)} allowDecimals={false} tick={{ fontSize: 11, fill: '#6b7280' }} />
                  <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 12, fill: '#374151' }} />
                  <Tooltip
                    formatter={(v: number) => [`${v} votes`, 'Count']}
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
                  />
                  <Bar dataKey="votes" radius={[0, 6, 6, 0]} barSize={28}>
                    <LabelList dataKey="votes" position="right" style={{ fontSize: 12, fontWeight: 700, fill: '#374151' }} formatter={(v: number) => `${v} votes`} />
                    {data.map((entry, i) => (
                      <Cell key={entry.id} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              {/* Rankings */}
              <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {data.slice(0, 5).map((item, i) => (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 18, flexShrink: 0, minWidth: 28 }}>
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}
                    </span>
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

        {/* Actions */}
        <div className="flex gap-3 px-5 py-4 border-t bg-gray-50">
          <button
            onClick={insertToCanvas}
            disabled={data.length === 0}
            className="flex-1 py-2.5 bg-yellow-500 text-white rounded-xl font-semibold text-sm hover:bg-yellow-600 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Download size={15} />
            Insert to Whiteboard
          </button>
          <button onClick={onClose} className="px-5 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-600 hover:bg-gray-100">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
