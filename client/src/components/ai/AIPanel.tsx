import { useState } from 'react'
import { Editor, createShapeId, toRichText } from 'tldraw'
import { toast } from 'sonner'
import api from '../../lib/api'

interface Props { editor: Editor | null; boardId: string; onSave?: () => void }
type Feature = 'stickies' | 'agent' | 'sidekick'

const VALID_COLORS = ['yellow', 'green', 'blue', 'orange', 'violet', 'light-red', 'light-blue', 'light-green'] as const
type TColor = typeof VALID_COLORS[number]

function safeColor(c?: string): TColor {
  return VALID_COLORS.includes(c as TColor) ? (c as TColor) : 'yellow'
}

function createNoteShape(editor: Editor, x: number, y: number, text: string, color: TColor) {
  const id = createShapeId()
  editor.createShape({
    id, type: 'note', x, y,
    props: {
      richText: toRichText(text), color, size: 'm', font: 'draw',
      align: 'middle', verticalAlign: 'middle', growY: 0,
      fontSizeAdjustment: 0, url: '', scale: 1, labelColor: 'black',
    },
  })
  return id
}

function executeActions(editor: Editor, actions: any[], getCenter: () => { x: number; y: number }): number {
  let count = 0
  for (const action of actions) {
    const p = action.params || {}
    try {
      switch (action.type) {
        case 'create_sticky': {
          createNoteShape(editor, p.x ?? 100, p.y ?? 100, p.text ?? '', safeColor(p.color))
          count++
          break
        }
        case 'create_shape': {
          editor.createShape({
            id: createShapeId(), type: 'geo',
            x: p.x ?? 100, y: p.y ?? 100,
            props: {
              geo: p.type === 'ellipse' ? 'ellipse' : p.type === 'diamond' ? 'diamond' : 'rectangle',
              w: p.width ?? 160, h: p.height ?? 80,
              richText: toRichText(p.text ?? ''),
              fill: 'solid', color: safeColor(p.color),
              dash: 'draw', size: 'm', font: 'draw',
              align: 'middle', verticalAlign: 'middle',
              growY: 0, url: '', scale: 1, labelColor: 'black',
            },
          })
          count++
          break
        }
        case 'create_text': {
          editor.createShape({
            id: createShapeId(), type: 'text',
            x: p.x ?? 100, y: p.y ?? 100,
            props: {
              richText: toRichText(p.text ?? ''),
              size: (['s','m','l','xl'].includes(p.fontSize) ? p.fontSize : 'l') as any,
              color: 'black' as const, w: 400, autoSize: true, scale: 1,
              textAlign: 'start' as any, font: 'draw' as any,
            },
          })
          count++
          break
        }
        case 'update_shape': {
          const s = editor.getShape(p.id as any) as any
          if (s) {
            const updates: any = { id: s.id, type: s.type }
            if (p.x !== undefined || p.y !== undefined) {
              updates.x = p.x ?? s.x
              updates.y = p.y ?? s.y
            }
            if (p.color !== undefined || p.text !== undefined) {
              updates.props = { ...s.props }
              if (p.color !== undefined) updates.props.color = safeColor(p.color)
              if (p.text !== undefined) updates.props.richText = toRichText(p.text)
            }
            editor.updateShape(updates)
            count++
          }
          break
        }
        case 'move_shape': {
          const s = editor.getShape(p.id as any)
          if (s) { editor.updateShape({ ...s, x: p.x, y: p.y }); count++ }
          break
        }
        case 'delete_shape': {
          const s = editor.getShape(p.id as any)
          if (s) { editor.deleteShape(p.id as any); count++ }
          break
        }
      }
    } catch (e) {
      console.error('[Agent] action failed:', action.type, e)
    }
  }
  return count
}

// Simple markdown renderer
function MarkdownResult({ content }: { content: string }) {
  const lines = content.split('\n')
  return (
    <div className="text-sm text-gray-700 leading-relaxed space-y-1">
      {lines.map((line, i) => {
        if (line.startsWith('### ')) return <h3 key={i} className="font-bold text-gray-800 mt-3 mb-1 text-sm">{line.slice(4)}</h3>
        if (line.startsWith('## ')) return <h2 key={i} className="font-bold text-gray-800 mt-4 mb-1">{line.slice(3)}</h2>
        if (line.startsWith('# ')) return <h1 key={i} className="font-bold text-gray-800 text-base mt-4 mb-2">{line.slice(2)}</h1>
        if (line.startsWith('- [ ] ') || line.startsWith('- [x] ')) {
          const done = line.startsWith('- [x] ')
          return <div key={i} className="flex items-start gap-2 ml-3">
            <span className={`mt-0.5 w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center text-xs ${done ? 'bg-teal-500 border-teal-500 text-white' : 'border-gray-400'}`}>{done ? '✓' : ''}</span>
            <span className={done ? 'line-through text-gray-400' : ''}>{line.slice(6)}</span>
          </div>
        }
        if (line.startsWith('- ')) return <div key={i} className="flex items-start gap-2 ml-3"><span className="text-gray-400 mt-1">•</span><span>{line.slice(2)}</span></div>
        if (/^\d+\. /.test(line)) {
          const num = line.match(/^(\d+)\. /)?.[1]
          return <div key={i} className="flex items-start gap-2 ml-3"><span className="text-gray-500 font-medium w-5 shrink-0">{num}.</span><span>{line.replace(/^\d+\. /, '')}</span></div>
        }
        if (line.startsWith('**') && line.endsWith('**')) return <p key={i} className="font-semibold text-gray-800">{line.slice(2, -2)}</p>
        if (line === '') return <div key={i} className="h-1" />
        // Inline bold
        const parts = line.split(/(\*\*[^*]+\*\*)/g)
        return <p key={i}>{parts.map((part, j) =>
          part.startsWith('**') && part.endsWith('**')
            ? <strong key={j}>{part.slice(2, -2)}</strong>
            : part
        )}</p>
      })}
    </div>
  )
}

export default function AIPanel({ editor, boardId, onSave }: Props) {
  const [feature, setFeature] = useState<Feature>('stickies')
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string>('')
  const [chatHistory, setChatHistory] = useState<any[]>([])

  const features = [
    { id: 'stickies', label: '🗒️ 便利貼', desc: '批量生成便利貼到畫布' },
    { id: 'agent', label: '🤖 Canvas Agent', desc: '用自然語言操作畫布' },
    { id: 'sidekick', label: '💼 AI 顧問', desc: '向 AI 專家提問' },
  ] as const

  const getPlaceholder = () => {
    switch (feature) {
      case 'stickies': return '輸入主題，例如：產品發布計劃、會議議題...'
      case 'agent': return '例如：\n• 幫我加三張便利貼排成一排\n• 在左上角加標題「會議記錄」\n• 幫我畫一個登入流程'
      case 'sidekick': return '向 AI 顧問提問，例如：如何提升用戶留存率？'
    }
  }

  const getShapes = () => {
    if (!editor) return []
    return [...editor.getCurrentPageShapeIds()].map(id => {
      const s = editor.getShape(id) as any
      // tldraw note shapes use richText, not text
      const richText = s?.props?.richText
      let text = s?.props?.text || ''
      if (!text && richText) {
        try {
          // richText is a TLRichText object; extract plain text
          const segments = richText?.paragraphs?.flatMap((p: any) => p.children?.map((c: any) => c.text || '') || []) || []
          text = segments.join(' ').trim()
        } catch {}
      }
      return { id, type: s?.type || 'shape', text, color: s?.props?.color || '', x: s?.x || 0, y: s?.y || 0, width: s?.props?.w || 200, height: s?.props?.h || 120 }
    })
  }

  const getCenter = () => {
    if (!editor) return { x: 200, y: 200 }
    const b = editor.getViewportPageBounds()
    return { x: b.x + b.w / 2, y: b.y + b.h / 2 }
  }

  const run = async () => {
    if (!input.trim()) { toast.error('請輸入內容'); return }
    if (!editor) { toast.error('畫布未就緒'); return }
    setLoading(true)
    setResult('')

    try {
      if (feature === 'stickies') {
        const { data } = await api.post('/ai/generate-stickies', { topic: input, count: 6 })
        if (!data?.length) { toast.error('AI 未能生成，請重試'); return }
        const colors: TColor[] = ['yellow', 'green', 'blue', 'orange', 'violet', 'light-red']
        const center = getCenter()
        const cols = 3
        for (let i = 0; i < data.length; i++) {
          createNoteShape(
            editor,
            center.x + (i % cols) * 230 - (cols * 230 / 2),
            center.y + Math.floor(i / cols) * 180 - 90,
            data[i].text || '',
            colors[i % colors.length],
          )
        }
        try { (editor as any).zoomToContent() } catch {}
        setResult(`✅ 已生成 ${data.length} 張便利貼`)
        toast.success(`已在畫布上生成 ${data.length} 張便利貼`)

      } else if (feature === 'agent') {
        const shapes = getShapes()
        const viewport = editor.getViewportPageBounds()
        const newHistory = [...chatHistory, { role: 'user', content: input }]
        const { data } = await api.post('/ai/canvas-agent', {
          message: input,
          canvasState: { shapes, viewportBounds: { x: viewport.x, y: viewport.y, w: viewport.w, h: viewport.h } },
          chatHistory,
        })
        const reply = data.message || '完成'
        setResult(reply)
        setChatHistory([...newHistory, { role: 'assistant', content: reply }])
        if (data.actions?.length) {
          const count = executeActions(editor, data.actions, getCenter)
          if (count > 0) {
            try { (editor as any).zoomToContent() } catch {}
            toast.success(`已執行 ${count} 個操作`)
          }
        }
        setInput('')
        return

      } else if (feature === 'sidekick') {
        const { data } = await api.post('/ai/sidekick/invoke', { sidekickId: 'pm', message: input })
        setResult(data.reply)
      }

      setInput('')
    } catch (e: any) {
      toast.error(e.response?.data?.message || '請求失敗，請重試')
    } finally {
      setLoading(false)
    }
  }

  const addToCanvas = () => {
    if (!editor || !result) return
    const center = getCenter()
    createNoteShape(editor, center.x - 150, center.y - 100, result, 'light-blue')
    try { (editor as any).zoomToContent() } catch {}
    toast.success('已加到畫布')
  }

  return (
    <div className="flex flex-col h-full">
      {/* Feature tabs */}
      <div className="p-3 border-b border-gray-100 space-y-1">
        {features.map(f => (
          <button key={f.id}
            onClick={() => { setFeature(f.id as Feature); setResult(''); setInput(''); setChatHistory([]) }}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${feature === f.id ? 'bg-teal-50 text-teal-700 border border-teal-200' : 'text-gray-600 hover:bg-gray-50'}`}>
            <span className="font-medium">{f.label}</span>
            <span className="block text-xs text-gray-400 mt-0.5">{f.desc}</span>
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="p-3 border-b border-gray-100">
        <textarea value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) run() }}
          placeholder={getPlaceholder()} rows={feature === 'agent' ? 4 : 3}
          className="w-full text-sm border border-gray-200 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none placeholder-gray-400" />
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-gray-400">⌘+Enter 執行</span>
          <button onClick={run} disabled={loading}
            className="px-4 py-1.5 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-50 transition-colors flex items-center gap-1.5">
            {loading ? (
              <><span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />處理中</>
            ) : '執行'}
          </button>
        </div>
      </div>

      {/* Agent history indicator */}
      {feature === 'agent' && chatHistory.length > 0 && (
        <div className="px-3 py-2 bg-teal-50 border-b border-teal-100 flex items-center justify-between">
          <span className="text-xs text-teal-600 font-medium">對話進行中（{Math.floor(chatHistory.length / 2)} 輪）</span>
          <button onClick={() => { setChatHistory([]); setResult('') }} className="text-xs text-teal-500 hover:text-teal-700 underline">清除</button>
        </div>
      )}

      {/* Result */}
      <div className="flex-1 overflow-y-auto p-3">
        {result ? (
          <div>
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
              <MarkdownResult content={result} />
            </div>
            {feature === 'sidekick' && (
              <button onClick={addToCanvas}
                className="mt-2 w-full py-1.5 border border-teal-400 text-teal-600 rounded-lg text-xs font-medium hover:bg-teal-50 transition-colors">
                📌 放到畫布
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <div className="text-3xl mb-3">
              {feature === 'stickies' ? '🗒️' : feature === 'agent' ? '🤖' : '💼'}
            </div>
            <p className="text-xs text-gray-400">輸入內容後點擊執行</p>
          </div>
        )}
      </div>
    </div>
  )
}
