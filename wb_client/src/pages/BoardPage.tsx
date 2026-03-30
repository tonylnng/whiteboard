import { useParams, useNavigate } from 'react-router-dom'
import { useEffect, useState, useCallback } from 'react'
import { Tldraw, Editor } from 'tldraw'
import 'tldraw/tldraw.css'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Share2, Download, Sparkles, X } from 'lucide-react'
import api from '../lib/api'
import { toast } from 'sonner'
import AIPanel from '../components/ai/AIPanel'

export default function BoardPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [editor, setEditor] = useState<Editor | null>(null)
  const [aiOpen, setAiOpen] = useState(false)
  const [boardName, setBoardName] = useState('未命名白板')

  const { data: board } = useQuery({
    queryKey: ['board', id],
    queryFn: () => api.get(`/boards/${id}`).then(r => r.data),
    enabled: !!id,
  })

  useEffect(() => {
    if (board?.name) setBoardName(board.name)
  }, [board])

  const handleMount = useCallback((e: Editor) => {
    setEditor(e)
  }, [])

  const handleShare = async () => {
    try {
      const { data } = await api.post(`/boards/${id}/share`, { permission: 'viewer' })
      await navigator.clipboard.writeText(data.shareUrl)
      toast.success('分享連結已複製到剪貼板')
    } catch { toast.error('分享失敗') }
  }

  const handleExport = async () => {
    if (!editor) return
    try {
      const { exportToBlob } = await import('tldraw')
      const shapeIds = [...editor.getCurrentPageShapeIds()]
      if (!shapeIds.length) { toast.error('畫布是空的'); return }
      const blob = await exportToBlob({ editor, ids: shapeIds, format: 'png', opts: { scale: 2 } })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `${boardName}.png`; a.click()
      URL.revokeObjectURL(url)
    } catch (e) { toast.error('匯出失敗') }
  }

  return (
    <div className="flex flex-col h-screen bg-white">
      <header className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-white z-10 h-12">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft size={18} className="text-gray-600" />
          </button>
          <span className="font-medium text-gray-800 text-sm">{boardName}</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setAiOpen(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 text-white rounded-lg text-sm hover:bg-teal-700 transition-colors">
            <Sparkles size={14} /> AI
          </button>
          <button onClick={handleShare} className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-colors">
            <Share2 size={14} /> 分享
          </button>
          <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-colors">
            <Download size={14} /> 匯出
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 relative">
          <Tldraw onMount={handleMount} />
        </div>

        {aiOpen && (
          <div className="w-80 border-l border-gray-200 bg-white flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <span className="font-medium text-sm flex items-center gap-1.5"><Sparkles size={14} className="text-teal-600" /> AI 助手</span>
              <button onClick={() => setAiOpen(false)} className="p-1 hover:bg-gray-100 rounded"><X size={16} /></button>
            </div>
            <AIPanel editor={editor} boardId={id!} />
          </div>
        )}
      </div>
    </div>
  )
}
