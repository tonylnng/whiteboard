import { useParams, useNavigate } from 'react-router-dom'
import { useEffect, useState, useCallback, useRef } from 'react'
import { Tldraw, Editor } from 'tldraw'
import 'tldraw/tldraw.css'
import { lazy, Suspense } from 'react'
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw'

const ExcalidrawBoard = lazy(() => import('../components/board/ExcalidrawBoard'))
import { ArrowLeft, Download, Sparkles, X, Users, Check, Pencil } from 'lucide-react'
import api from '../lib/api'
import { toast } from 'sonner'
import AIPanel from '../components/ai/AIPanel'
import RemoteCursors from '../components/board/RemoteCursors'
import EmbedInteractionOverlay from '../components/board/EmbedInteractionOverlay'
import ShapeLibrary from '../components/board/ShapeLibrary'
import MediaEmbed from '../components/board/MediaEmbed'
import BrainstormToolbar from '../components/board/BrainstormToolbar'
import { useCollaboration } from '../hooks/useCollaboration'
import VoteBadgeOverlay from '../components/board/VoteBadgeOverlay'
import VoteResultsPopup from '../components/board/VoteResultsPopup'
import { useAuthStore } from '../stores/auth.store'
import { VoteChartShapeUtil } from '../shapes/VoteChartShape'
import { VoteItemShapeUtil } from '../shapes/VoteItemShape'


const customShapeUtils = [VoteChartShapeUtil, VoteItemShapeUtil]

export default function BoardPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { accessToken, user } = useAuthStore()
  const [editor, setEditor] = useState<Editor | null>(null)
  const [excalidrawApi, setExcalidrawApi] = useState<ExcalidrawImperativeAPI | null>(null)
  const [boardType, setBoardType] = useState<'tldraw' | 'excalidraw'>('tldraw')
  const [aiOpen, setAiOpen] = useState(false)
  const [boardName, setBoardName] = useState('未命名白板')
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved')
  const [excalidrawInitialData, setExcalidrawInitialData] = useState<any>(null)
  const excalidrawDataRef = useRef<{ elements: any[]; appState: any; files: any } | null>(null)

  const saveTimerRef = useRef<any>(null)
  const editorRef = useRef<Editor | null>(null)
  const snapshotReadyRef = useRef(false)
  const isSavingRef = useRef(false)
  const unsubRef = useRef<(() => void) | null>(null)

  const { remoteUsers, sendCursor, isFacilitator, sessionState, voteMap, castVote, removeVote, socket } = useCollaboration(
    editor, id || '', accessToken, user?.id
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
      // Voting just ended
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
        if (data?.boardType) setBoardType(data.boardType)
        // Load excalidraw initial data if sketch mode
        if (data?.boardType === 'excalidraw' && data?.excalidrawSnapshot) {
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
      if (boardType === 'excalidraw') {
        if (!excalidrawDataRef.current) { setSaveStatus('saved'); return }
        await api.post(`/boards/${id}/snapshot`, { excalidrawSnapshot: excalidrawDataRef.current })
      } else {
        const ed = editorRef.current
        if (!ed) { setSaveStatus('saved'); return }
        const snapshot = ed.store.getSnapshot()
        await api.post(`/boards/${id}/snapshot`, { snapshot })
      }
      setSaveStatus('saved')
    } catch { setSaveStatus('unsaved') }
    finally { isSavingRef.current = false }
  }, [id, boardType])

  const manualSave = useCallback(async () => {
    clearTimeout(saveTimerRef.current)
    await doSave()
    toast.success('已儲存')
  }, [doSave])

  useEffect(() => {
    if (!id || snapshotReadyRef.current) return
    if (boardType === 'excalidraw') {
      // Excalidraw data loaded via board info (initialData already set)
      snapshotReadyRef.current = true
      return
    }
    if (!editor) return
    api.get(`/boards/${id}/snapshot`)
      .then(({ data }) => {
        if (data?.snapshot) {
          try { editor.store.loadSnapshot(data.snapshot) } catch (e) { console.warn(e) }
        }
        snapshotReadyRef.current = true
      })
      .catch(() => { snapshotReadyRef.current = true })
  }, [editor, id, boardType])

  const handleMount = useCallback((e: Editor) => {
    setEditor(e)
    editorRef.current = e
    if (unsubRef.current) unsubRef.current()
    unsubRef.current = e.store.listen(() => {
      if (!snapshotReadyRef.current) return
      setSaveStatus('unsaved')
      clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(doSave, 3000)
    }, { source: 'user', scope: 'document' })
  }, [doSave])

  const handlePointerMove = useCallback((_e: React.PointerEvent<HTMLDivElement>) => {
    if (!editor) return
    const point = editor.inputs.currentPagePoint
    sendCursor(point.x, point.y)
  }, [editor, sendCursor])

  useEffect(() => {
    return () => {
      if (unsubRef.current) unsubRef.current()
      clearTimeout(saveTimerRef.current)
    }
  }, [])

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
    if (!editor) return
    try {
      const { exportToBlob } = await import('tldraw')
      const shapeIds = [...editor.getCurrentPageShapeIds()]
      if (!shapeIds.length) { toast.error('畫布是空的'); return }
      const blob = await exportToBlob({ editor, ids: shapeIds, format: 'png', opts: { scale: 2 } })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = `${boardName}.png`; a.click()
      URL.revokeObjectURL(url)
      toast.success('已匯出 PNG')
    } catch { toast.error('匯出失敗') }
  }

  const onlineCount = remoteUsers.length
  const statusColor = saveStatus === 'saved' ? 'text-green-500' : saveStatus === 'saving' ? 'text-yellow-500' : 'text-orange-400'

  return (
    <>
    <div className="flex flex-col h-screen bg-white">
      {/* Top bar */}
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
        </div>

        {/* Brainstorm Toolbar - center */}
        <div className="flex-1 flex items-center justify-center min-w-0">
          <BrainstormToolbar
            editor={editor}
            socket={socket}
            isFacilitator={isFacilitator}
            sessionState={sessionState}
            onSessionUpdate={() => {}}
            voteMap={voteMap}
            myVotesRemaining={myVotesRemaining}
          />
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button onClick={manualSave} disabled={saveStatus === 'saved'}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${saveStatus === 'saved' ? 'border-gray-200 text-gray-400 cursor-default' : 'border-teal-500 text-teal-600 hover:bg-teal-50'}`}>
            儲存
          </button>
          <button onClick={() => setAiOpen(v => !v)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs transition-colors ${aiOpen ? 'bg-teal-700 text-white' : 'bg-teal-600 text-white hover:bg-teal-700'}`}>
            <Sparkles size={13} /> AI
          </button>
          <MediaEmbed editor={editor} />
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

      {/* Main: ShapeLibrary | Canvas | AIPanel */}
      <div className="flex flex-1 overflow-hidden relative">
        {boardType === 'tldraw' && <ShapeLibrary editor={editor} />}
        <div className="flex-1 relative" onPointerMove={handlePointerMove}>
          {boardType === 'excalidraw' ? (
            <Suspense fallback={<div className="flex items-center justify-center h-full text-gray-400">載入草圖模式...</div>}>
              <ExcalidrawBoard
                initialData={excalidrawInitialData}
                onMount={setExcalidrawApi}
                onChange={(elements, appState, files) => {
                  excalidrawDataRef.current = { elements: elements as any[], appState, files }
                  setSaveStatus('unsaved')
                  clearTimeout(saveTimerRef.current)
                  saveTimerRef.current = setTimeout(doSave, 3000)
                }}
              />
            </Suspense>
          ) : (
            <Tldraw shapeUtils={customShapeUtils} onMount={handleMount} />
          )}
          <RemoteCursors editor={boardType === 'tldraw' ? editor : null} socket={socket} />
          <EmbedInteractionOverlay editor={editor} />
          <VoteBadgeOverlay
            editor={editor}
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
            <AIPanel editor={editor} boardId={id!} onSave={manualSave} />
          </div>
        )}
      </div>
    </div>
      {showVoteResults && (
        <VoteResultsPopup
          editor={editor}
          voteMap={finalVoteMap}
          onClose={() => setShowVoteResults(false)}
        />
      )}
    </>
  )
}