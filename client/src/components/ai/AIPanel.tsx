import { useState } from 'react'
import { toast } from 'sonner'
import api from '../../lib/api'

interface Props { excalidrawApi: any | null; boardId: string; onSave?: () => void }
type Feature = 'stickies' | 'agent' | 'sidekick'

function mkId() { return Math.random().toString(36).substr(2, 9) }

function mkBase(overrides: any) {
  return {
    id: mkId(),
    angle: 0,
    strokeColor: '#374151',
    backgroundColor: 'transparent',
    fillStyle: 'hachure' as const,
    strokeWidth: 1,
    strokeStyle: 'solid' as const,
    roughness: 0,
    opacity: 100,
    seed: Math.floor(Math.random() * 100000),
    versionNonce: Math.floor(Math.random() * 100000),
    version: 1,
    isDeleted: false,
    boundElements: null,
    updated: Date.now(),
    locked: false,
    groupIds: [],
    frameId: null,
    link: null,
    ...overrides,
  }
}

function mkRect(x: number, y: number, w: number, h: number, bg: string, stroke?: string) {
  return mkBase({ type: 'rectangle', x, y, width: w, height: h, backgroundColor: bg, fillStyle: 'solid', strokeColor: stroke || bg })
}

function mkText(x: number, y: number, w: number, text: string, fontSize = 13, color = '#374151', align: string = 'center') {
  const safeText = text ?? ''
  const lines = Math.max(1, (safeText.match(/\n/g) || []).length + 1)
  return mkBase({
    type: 'text', x, y, width: w, height: Math.ceil(fontSize * 1.25 * lines),
    text: safeText, originalText: safeText, fontSize, fontFamily: 1,
    textAlign: align, verticalAlign: 'top', baseline: Math.ceil(fontSize * 0.8),
    containerId: null, autoResize: true, lineHeight: 1.25,
    strokeColor: color, backgroundColor: 'transparent', fillStyle: 'hachure',
  })
}

const STICKY_COLORS = ['#fef08a', '#bbf7d0', '#bfdbfe', '#fed7aa', '#e9d5ff', '#fecaca']

function createStickyElements(x: number, y: number, text: string, color: string) {
  const rectId = mkId()
  const rect = mkBase({
    type: 'rectangle', id: rectId, x, y, width: 180, height: 120,
    backgroundColor: color, fillStyle: 'solid', strokeColor: color, roughness: 0,
  })
  const textEl = mkBase({
    type: 'text', x: x + 8, y: y + 10, width: 164, height: 100,
    text, originalText: text, fontSize: 13, fontFamily: 1,
    textAlign: 'center', verticalAlign: 'top', baseline: 10,
    containerId: null, autoResize: true, lineHeight: 1.25,
    strokeColor: '#374151', backgroundColor: 'transparent', fillStyle: 'hachure',
  })
  return [rect, textEl]
}

function getCanvasCenter(api: any): { cx: number; cy: number } {
  try {
    const appState = api.getAppState()
    const zoom = appState.zoom?.value || 1
    return {
      cx: (window.innerWidth / 2 - appState.scrollX) / zoom,
      cy: (window.innerHeight / 2 - appState.scrollY) / zoom,
    }
  } catch {
    return { cx: 0, cy: 0 }
  }
}

function executeActions(api: any, actions: any[], getCenter: () => { cx: number; cy: number }): number {
  let count = 0
  const existing = api.getSceneElements() as any[]
  const newElements: any[] = []

  for (const action of actions) {
    const p = action.params || {}
    try {
      switch (action.type) {
        case 'create_sticky': {
          const elems = createStickyElements(p.x ?? 100, p.y ?? 100, p.text ?? '', STICKY_COLORS[count % STICKY_COLORS.length])
          newElements.push(...elems)
          count++
          break
        }
        case 'create_shape': {
          const type = p.type === 'ellipse' ? 'ellipse' : p.type === 'diamond' ? 'diamond' : 'rectangle'
          newElements.push(mkBase({
            type, x: p.x ?? 100, y: p.y ?? 100,
            width: p.width ?? 160, height: p.height ?? 80,
            backgroundColor: p.color || '#bfdbfe', fillStyle: 'solid',
            strokeColor: p.color || '#bfdbfe',
          }))
          if (p.text) {
            newElements.push(mkText(p.x ?? 100 + 8, p.y ?? 100 + 8, (p.width ?? 160) - 16, p.text))
          }
          count++
          break
        }
        case 'create_text': {
          newElements.push(mkText(p.x ?? 100, p.y ?? 100, 400, p.text ?? '', p.fontSize || 16, '#374151', 'left'))
          count++
          break
        }
        case 'update_shape': {
          const idx = existing.findIndex((e: any) => e.id === p.id)
          if (idx >= 0) {
            const updated = { ...existing[idx] }
            if (p.x !== undefined) updated.x = p.x
            if (p.y !== undefined) updated.y = p.y
            if (p.color !== undefined) updated.backgroundColor = p.color
            if (p.text !== undefined) updated.text = p.text
            existing[idx] = updated
            count++
          }
          break
        }
        case 'delete_shape': {
          const idx = existing.findIndex((e: any) => e.id === p.id)
          if (idx >= 0) {
            existing[idx] = { ...existing[idx], isDeleted: true }
            count++
          }
          break
        }
      }
    } catch (e) {
      console.error('[Agent] action failed:', action.type, e)
    }
  }

  api.updateScene({ elements: [...existing, ...newElements] })
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
        if (line.startsWith('- ')) return <div key={i} className="flex items-start gap-2 ml-3"><span className="text-gray-400 mt-1">•</span><span>{line.slice(2)}</span></div>
        if (/^\d+\. /.test(line)) {
          const num = line.match(/^(\d+)\. /)?.[1]
          return <div key={i} className="flex items-start gap-2 ml-3"><span className="text-gray-500 font-medium w-5 shrink-0">{num}.</span><span>{line.replace(/^\d+\. /, '')}</span></div>
        }
        if (line === '') return <div key={i} className="h-1" />
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

export default function AIPanel({ excalidrawApi, boardId, onSave }: Props) {
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
    if (!excalidrawApi) return []
    const elements = excalidrawApi.getSceneElements() as any[]
    return elements
      .filter((e: any) => !e.isDeleted)
      .map((e: any) => ({
        id: e.id, type: e.type,
        text: e.text || '',
        x: e.x || 0, y: e.y || 0,
        width: e.width || 200, height: e.height || 120,
      }))
  }

  const run = async () => {
    if (!input.trim()) { toast.error('請輸入內容'); return }
    if (!excalidrawApi) { toast.error('畫布未就緒'); return }
    setLoading(true)
    setResult('')

    try {
      if (feature === 'stickies') {
        const { data } = await api.post('/ai/generate-stickies', { topic: input, count: 6 })
        if (!data?.length) { toast.error('AI 未能生成，請重試'); return }
        const { cx, cy } = getCanvasCenter(excalidrawApi)
        const cols = 3
        const newElements: any[] = []
        for (let i = 0; i < data.length; i++) {
          const x = cx + (i % cols) * 200 - (cols * 200 / 2)
          const y = cy + Math.floor(i / cols) * 140 - 70
          newElements.push(...createStickyElements(x, y, data[i].text || '', STICKY_COLORS[i % STICKY_COLORS.length]))
        }
        excalidrawApi.updateScene({ elements: [...excalidrawApi.getSceneElements(), ...newElements] })
        try { excalidrawApi.scrollToContent() } catch {}
        setResult(`✅ 已生成 ${data.length} 張便利貼`)
        toast.success(`已在畫布上生成 ${data.length} 張便利貼`)

      } else if (feature === 'agent') {
        const shapes = getShapes()
        const newHistory = [...chatHistory, { role: 'user', content: input }]
        const { cx, cy } = getCanvasCenter(excalidrawApi)
        const { data } = await api.post('/ai/canvas-agent', {
          message: input,
          canvasState: { shapes, viewportBounds: { x: cx - 400, y: cy - 300, w: 800, h: 600 } },
          chatHistory,
        })
        const reply = data.message || '完成'
        setResult(reply)
        setChatHistory([...newHistory, { role: 'assistant', content: reply }])
        if (data.actions?.length) {
          const count = executeActions(excalidrawApi, data.actions, () => getCanvasCenter(excalidrawApi))
          if (count > 0) {
            try { excalidrawApi.scrollToContent() } catch {}
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
    if (!excalidrawApi || !result) return
    const { cx, cy } = getCanvasCenter(excalidrawApi)
    const elems = createStickyElements(cx - 150, cy - 100, result.slice(0, 200), '#bfdbfe')
    excalidrawApi.updateScene({ elements: [...excalidrawApi.getSceneElements(), ...elems] })
    try { excalidrawApi.scrollToContent() } catch {}
    toast.success('已加到畫布')
  }

  return (
    <div className="flex flex-col h-full">
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

      <div className="p-3 border-b border-gray-100">
        <textarea value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) run() }}
          placeholder={getPlaceholder()} rows={feature === 'agent' ? 4 : 3}
          className="w-full text-sm border border-gray-200 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none placeholder-gray-400" />
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-gray-400">⌘+Enter 執行</span>
          <button onClick={run} disabled={loading}
            className="px-4 py-1.5 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-50 transition-colors flex items-center gap-1.5">
            {loading ? (<><span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />處理中</>) : '執行'}
          </button>
        </div>
      </div>

      {feature === 'agent' && chatHistory.length > 0 && (
        <div className="px-3 py-2 bg-teal-50 border-b border-teal-100 flex items-center justify-between">
          <span className="text-xs text-teal-600 font-medium">對話進行中（{Math.floor(chatHistory.length / 2)} 輪）</span>
          <button onClick={() => { setChatHistory([]); setResult('') }} className="text-xs text-teal-500 hover:text-teal-700 underline">清除</button>
        </div>
      )}

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
            <div className="text-3xl mb-3">{feature === 'stickies' ? '🗒️' : feature === 'agent' ? '🤖' : '💼'}</div>
            <p className="text-xs text-gray-400">輸入內容後點擊執行</p>
          </div>
        )}
      </div>
    </div>
  )
}
