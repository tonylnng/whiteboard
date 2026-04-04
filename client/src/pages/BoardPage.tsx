import { useParams, useNavigate } from 'react-router-dom'
import { useEffect, useState, useCallback, useRef } from 'react'
import { lazy, Suspense } from 'react'
type ExcalidrawImperativeAPI = any

const ExcalidrawBoard = lazy(() => import('../components/board/ExcalidrawBoard'))
import { ArrowLeft, Download, Sparkles, X, Users, Check, Pencil } from 'lucide-react'
import api from '../lib/api'
import { toast } from 'sonner'
import AIPanel from '../components/ai/AIPanel'
import RemoteCursors from '../components/board/RemoteCursors'
import MediaEmbed from '../components/board/MediaEmbed'
import BrainstormToolbar from '../components/board/BrainstormToolbar'
import { useCollaboration } from '../hooks/useCollaboration'
import VoteBadgeOverlay from '../components/board/VoteBadgeOverlay'
import VoteResultsPopup from '../components/board/VoteResultsPopup'
import { useAuthStore } from '../stores/auth.store'

export default function BoardPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { accessToken, user } = useAuthStore()
  const [excalidrawApi, setExcalidrawApi] = useState<ExcalidrawImperativeAPI | null>(null)
  const [aiOpen, setAiOpen] = useState(false)
  const [boardName, setBoardName] = useState('未命名白板')
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved')
  const [excalidrawInitialData, setExcalidrawInitialData] = useState<any>(null)
  const excalidrawDataRef = useRef<{ elements: any[]; appState: any; files: any } | null>(null)

  const saveTimerRef = useRef<any>(null)
  const isSavingRef = useRef(false)

  const isViewer = (user as any)?.role === 'viewer'
  const { remoteUsers, sendCursor, broadcastElements, isFacilitator, sessionState, voteMap, castVote, removeVote, socket } = useCollaboration(
    id || '', accessToken, user?.id, excalidrawApi
  )

  const maxVotes = sessionState?.voting?.maxVotes || 5
  const myVotesUsed = sessionState?.voting?.userVoteCount?.[user?.id || ''] || 0
  const myVotesRemaining = Math.max(0, maxVotes - myVotesUsed)

  const [showVoteResults, setShowVoteResults] = useState(false)
  const [finalVoteMap, setFinalVoteMap] = useState<Record<string, number>>({})

  const prevVotingActiveRef = useRef(false)
  useEffect(() => {
    const currentlyActive = sessionState?.voting?.active || false
    if (prevVotingActiveRef.current && !currentlyActive) {
      if (Object.keys(voteMap).length > 0) {
        setFinalVoteMap({ ...voteMap })
        setShowVoteResults(true)
      }
    }
    prevVotingActiveRef.current = currentlyActive
  }, [sessionState?.voting?.active, voteMap])

  useEffect(() => {
    if (!id) return
    api.get(`/boards/${id}`)
      .then(({ data }) => {
        if (data?.name) { setBoardName(data.name); setNameInput(data.name) }
        if (data?.excalidrawSnapshot) {
          setExcalidrawInitialData(data.excalidrawSnapshot)
        }
      })
      .catch(console.warn)
  }, [id])

  const doSave = useCallback(async () => {
    if (!id || isSavingRef.current) return
    isSavingRef.current = true
    setSaveStatus('saving')
    try {
      if (!excalidrawDataRef.current) { setSaveStatus('saved'); return }
      await api.post(`/boards/${id}/snapshot`, { excalidrawSnapshot: excalidrawDataRef.current })
      setSaveStatus('saved')
    } catch { setSaveStatus('unsaved') }
    finally { isSavingRef.current = false }
  }, [id])

  const manualSave = useCallback(async () => {
    clearTimeout(saveTimerRef.current)
    await doSave()
    toast.success('已儲存')
  }, [doSave])

  const saveName = async () => {
    if (!id || !nameInput.trim()) return
    try {
      await api.patch(`/boards/${id}`, { name: nameInput.trim() })
      setBoardName(nameInput.trim())
      setEditingName(false)
    } catch { toast.error('重命名失敗') }
  }

  const handleShare = async () => {
    try {
      const { data } = await api.post(`/boards/${id}/share`, { permission: 'editor' })
      await navigator.clipboard.writeText(data.shareUrl)
      toast.success('分享連結已複製！對方打開後可以訪客身份加入協作')
    } catch { toast.error('分享失敗') }
  }

  const handleExport = async () => {
    if (!excalidrawApi) { toast.error('畫布未就緒'); return }
    try {
      const blob = await excalidrawApi.exportToBlob({ mimeType: 'image/png', quality: 1 })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = `${boardName}.png`; a.click()
      URL.revokeObjectURL(url)
      toast.success('已匯出 PNG')
    } catch { toast.error('匯出失敗') }
  }

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!excalidrawApi) return
    try {
      const appState = excalidrawApi.getAppState()
      const zoom = appState.zoom?.value || 1
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
      const canvasX = (e.clientX - rect.left - appState.scrollX) / zoom
      const canvasY = (e.clientY - rect.top - appState.scrollY) / zoom
      sendCursor(canvasX, canvasY)
    } catch {}
  }, [excalidrawApi, sendCursor])

  useEffect(() => {
    return () => { clearTimeout(saveTimerRef.current) }
  }, [])

  const onlineCount = remoteUsers.length
  const statusColor = saveStatus === 'saved' ? 'text-green-500' : saveStatus === 'saving' ? 'text-yellow-500' : 'text-orange-400'

  return (
    <>
    <div className="flex flex-col h-screen bg-white">
      <header className="flex items-center justify-between px-3 py-2 border-b border-gray-200 bg-white z-30 shrink-0 gap-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0 shrink-0">
          <button onClick={() => navigate('/')} className="p-1.5 hover:bg-gray-100 rounded-lg shrink-0">
            <ArrowLeft size={18} className="text-gray-600" />
          </button>
          {editingName ? (
            <div className="flex items-center gap-1">
              <input value={nameInput} onChange={e => setNameInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditingName(false) }}
                className="text-sm font-medium border border-teal-400 rounded px-2 py-0.5 focus:outline-none w-40" autoFocus />
              <button onClick={saveName} className="p-1 text-green-500 hover:bg-green-50 rounded"><Check size={14} /></button>
              <button onClick={() => setEditingName(false)} className="p-1 text-gray-400 hover:bg-gray-100 rounded"><X size={14} /></button>
            </div>
          ) : (
            <button onClick={() => { setEditingName(true); setNameInput(boardName) }}
              className="flex items-center gap-1 group hover:bg-gray-50 rounded px-1 py-0.5">
              <span className="font-medium text-gray-800 text-sm truncate max-w-32">{boardName}</span>
              <Pencil size={11} className="text-gray-400 opacity-0 group-hover:opacity-100 shrink-0" />
            </button>
          )}
          <span className={`text-xs ${statusColor} shrink-0`}>●</span>
          {onlineCount > 0 && (
            <div className="flex items-center gap-1">
              <div className="flex -space-x-1">
                {remoteUsers.slice(0, 3).map(u => (
                  <div key={u.socketId} title={u.name}
                    className="w-5 h-5 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold text-white"
                    style={{ backgroundColor: u.color }}>
                    {u.name[0]?.toUpperCase()}
                  </div>
                ))}
              </div>
              <span className="text-xs text-gray-400">{onlineCount}人</span>
            </div>
          )}
          {isFacilitator && (
            <span className="text-xs bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded font-medium">🎤 主持人</span>
          )}
          {isViewer && (
            <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-medium">👁️ 只讀</span>
          )}
        </div>

        <div className="flex-1 flex items-center justify-center min-w-0">
          <BrainstormToolbar
            excalidrawApi={excalidrawApi}
            socket={socket}
            isFacilitator={isFacilitator}
            sessionState={sessionState}
            onSessionUpdate={() => {}}
            voteMap={voteMap}
            myVotesRemaining={myVotesRemaining}
          />
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button onClick={manualSave} disabled={saveStatus === 'saved' || isViewer}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${saveStatus === 'saved' ? 'border-gray-200 text-gray-400 cursor-default' : 'border-teal-500 text-teal-600 hover:bg-teal-50'}`}>
            儲存
          </button>
          <button onClick={() => setAiOpen(v => !v)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs transition-colors ${aiOpen ? 'bg-teal-700 text-white' : 'bg-teal-600 text-white hover:bg-teal-700'}`}>
            <Sparkles size={13} /> AI
          </button>
          <MediaEmbed excalidrawApi={excalidrawApi} />
          <button onClick={handleShare}
            className="flex items-center gap-1 px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs hover:bg-gray-50">
            <Users size={13} /> 分享
          </button>
          <button onClick={handleExport}
            className="flex items-center gap-1 px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs hover:bg-gray-50">
            <Download size={13} /> 匯出
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        <div className="flex-1 relative" onPointerMove={handlePointerMove}>
          <Suspense fallback={<div className="flex items-center justify-center h-full text-gray-400">載入白板...</div>}>
            <ExcalidrawBoard
              initialData={excalidrawInitialData}
              onMount={setExcalidrawApi}
              onChange={(elements, appState, files) => {
                excalidrawDataRef.current = { elements: elements as any[], appState, files }
                setSaveStatus('unsaved')
                clearTimeout(saveTimerRef.current)
                saveTimerRef.current = setTimeout(doSave, 3000)
                // Broadcast changes to collaborators in real-time (editors only)
                if (!isViewer) broadcastElements(elements)
              }}
            />
          </Suspense>
          <RemoteCursors excalidrawApi={excalidrawApi} socket={socket} />
          <VoteBadgeOverlay
            excalidrawApi={excalidrawApi}
            voteMap={voteMap}
            votingActive={sessionState?.voting?.active || false}
            onVote={castVote}
            onUnvote={removeVote}
          />
        </div>
        {aiOpen && (
          <div className="w-72 border-l border-gray-200 bg-white flex flex-col shrink-0">
            <div className="flex items-center justify-between px-3 py-2.5 border-b shrink-0">
              <span className="font-medium text-sm flex items-center gap-1.5">
                <Sparkles size={14} className="text-teal-600" /> AI 助手
              </span>
              <button onClick={() => setAiOpen(false)} className="p-1 hover:bg-gray-100 rounded text-gray-400">
                <X size={15} />
              </button>
            </div>
            <AIPanel excalidrawApi={excalidrawApi} boardId={id!} onSave={manualSave} />
          </div>
        )}
      </div>
    </div>
      {showVoteResults && (
        <VoteResultsPopup
          excalidrawApi={excalidrawApi}
          voteMap={finalVoteMap}
          onClose={() => setShowVoteResults(false)}
        />
      )}
    </>
  )
}
