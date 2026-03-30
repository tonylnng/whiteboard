import { useState } from 'react'
import { Editor } from 'tldraw'
import { toast } from 'sonner'
import api from '../../lib/api'

interface Props { editor: Editor | null; boardId: string }

type Feature = 'stickies' | 'diagram' | 'summary' | 'text' | 'agent' | 'sidekick'

export default function AIPanel({ editor, boardId }: Props) {
  const [feature, setFeature] = useState<Feature>('stickies')
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string>('')

  const features = [
    { id: 'stickies', label: '🗒️ 便利貼生成' },
    { id: 'diagram', label: '📊 文字轉圖表' },
    { id: 'summary', label: '📝 畫布摘要' },
    { id: 'text', label: '✏️ 文案助手' },
    { id: 'agent', label: '🤖 Canvas Agent' },
    { id: 'sidekick', label: '💼 AI Sidekick' },
  ] as const

  const getPlaceholder = () => {
    switch (feature) {
      case 'stickies': return '輸入主題，例如：產品發布計劃'
      case 'diagram': return '描述想要的圖表，例如：用戶登入流程'
      case 'summary': return '選擇摘要格式後點擊生成'
      case 'text': return '輸入要處理的文字'
      case 'agent': return '告訴 AI 要對畫布做什麼'
      case 'sidekick': return '向 AI 顧問提問'
    }
  }

  const run = async () => {
    if (!input.trim() && feature !== 'summary') { toast.error('請輸入內容'); return }
    setLoading(true)
    setResult('')
    try {
      if (feature === 'stickies') {
        const { data } = await api.post('/ai/generate-stickies', { topic: input, count: 8 })
        setResult(`生成了 ${data.length} 張便利貼\n\n${data.map((s: any) => `• ${s.text}`).join('\n')}`)
        toast.success('便利貼已生成')
      } else if (feature === 'diagram') {
        const { data } = await api.post('/ai/text-to-diagram', { description: input })
        setResult(`圖表類型：${data.type}\n元素數量：${data.shapes?.length || 0}`)
        toast.success('圖表已生成')
      } else if (feature === 'summary') {
        const shapes = editor ? [...editor.getCurrentPageShapeIds()].map(id => {
          const s = editor.getShape(id) as any
          return { type: s?.type || 'shape', text: s?.props?.text || s?.props?.richText || '' }
        }).filter(s => s.text) : []
        if (!shapes.length) { toast.error('畫布上沒有文字內容'); setLoading(false); return }
        const { data } = await api.post('/ai/board-summary', { elements: shapes, format: 'summary' })
        setResult(data.content)
      } else if (feature === 'text') {
        const { data } = await api.post('/ai/text-assist', { text: input, action: 'rewrite' })
        setResult(data.result)
      } else if (feature === 'agent') {
        const shapes = editor ? [...editor.getCurrentPageShapeIds()].map(id => {
          const s = editor.getShape(id) as any
          return { id, type: s?.type, text: s?.props?.text || '', x: s?.x || 0, y: s?.y || 0 }
        }) : []
        const { data } = await api.post('/ai/canvas-agent', { message: input, canvasState: { shapes } })
        setResult(data.message || JSON.stringify(data.actions, null, 2))
      } else if (feature === 'sidekick') {
        const { data } = await api.post('/ai/sidekick/invoke', { sidekickId: 'pm', message: input })
        setResult(data.reply)
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || '請求失敗')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-gray-100">
        <div className="flex flex-wrap gap-1">
          {features.map(f => (
            <button key={f.id} onClick={() => { setFeature(f.id); setResult(''); setInput('') }}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${feature === f.id ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-3 border-b border-gray-100">
        <textarea value={input} onChange={e => setInput(e.target.value)} placeholder={getPlaceholder()}
          rows={3}
          className="w-full text-sm border border-gray-200 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none" />
        <button onClick={run} disabled={loading}
          className="w-full mt-2 py-1.5 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-50 transition-colors">
          {loading ? '處理中...' : '執行'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {result ? (
          <div className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-lg p-3">{result}</div>
        ) : (
          <p className="text-xs text-gray-400 text-center mt-4">選擇功能並輸入內容後點擊執行</p>
        )}
      </div>
    </div>
  )
}
