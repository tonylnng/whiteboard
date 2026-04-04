import { useEffect, useRef, useState, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { toast } from 'sonner'

export interface RemoteUser {
  socketId: string
  id: string
  name: string
  color: string
  cursor?: { x: number; y: number }
  isFacilitator?: boolean
}

export interface SessionState {
  voting: {
    votes: Record<string, string[]>
    userVoteCount: Record<string, number>
    maxVotes: number
    active: boolean
  }
  timer: { endTime: number | null; duration: number; active: boolean }
  anonymousMode: boolean
  facilitatorId: string | null
  spotlight: any
  cursorsLocked: boolean
}

export interface VoteData {
  shapeId: string
  votes: number
  userVotesRemaining: number
}

export function useCollaboration(boardId: string, accessToken: string | null, userId?: string, excalidrawApi?: any) {
  const socketRef = useRef<Socket | null>(null)
  const [remoteUsers, setRemoteUsers] = useState<RemoteUser[]>([])
  const [connected, setConnected] = useState(false)
  const [isFacilitator, setIsFacilitator] = useState(false)
  const [sessionState, setSessionState] = useState<SessionState | null>(null)
  const [voteMap, setVoteMap] = useState<Record<string, number>>({})
  const [socketState, setSocketState] = useState<Socket | null>(null)
  const excalidrawApiRef = useRef(excalidrawApi)
  excalidrawApiRef.current = excalidrawApi

  // Track whether an update came from a remote patch (to avoid echo)
  const applyingRemoteRef = useRef(false)
  // Debounce timer for outgoing patches
  const patchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Last elements we sent, to avoid sending unchanged data
  const lastSentRef = useRef<string>('')

  useEffect(() => {
    if (!boardId || !accessToken) return

    const socket = io('/collab', {
      auth: { token: accessToken },
      query: { boardId },
      transports: ['websocket', 'polling'],
      path: '/socket.io',
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    })
    socketRef.current = socket

    socket.on('connect', () => {
      console.log('[Collab] Connected:', socket.id)
      setConnected(true)
      setSocketState(socket)
    })
    socket.on('connect_error', (err) => console.error('[Collab] Error:', err.message))
    socket.on('disconnect', () => { setConnected(false) })

    socket.on('room:users', (users: RemoteUser[]) => {
      setRemoteUsers(users)
      if (users.length === 0) setIsFacilitator(true)
    })
    socket.on('user:joined', (user: RemoteUser) => {
      setRemoteUsers(prev => [...prev.filter(u => u.socketId !== user.socketId), user])
    })
    socket.on('user:left', ({ socketId }: { socketId: string }) => {
      setRemoteUsers(prev => prev.filter(u => u.socketId !== socketId))
    })

    socket.on('session:state', (state: SessionState) => {
      setSessionState(state)
      if (userId && state.facilitatorId === userId) setIsFacilitator(true)
    })

    socket.on('cursor:move', ({ socketId, x, y, name, color }: any) => {
      setRemoteUsers(prev => prev.map(u => u.socketId === socketId ? { ...u, cursor: { x, y } } : u))
    })

    // ─── Real-time canvas sync ──────────────────────────────────────────────
    socket.on('store:patch', ({ patch }: { socketId: string; patch: { elements: any[] } }) => {
      const api = excalidrawApiRef.current
      if (!api || !patch?.elements?.length) return
      try {
        applyingRemoteRef.current = true
        // Merge remote elements with current scene
        const currentElements = api.getSceneElements() as any[]
        const elementMap = new Map<string, any>()
        for (const el of currentElements) elementMap.set(el.id, el)
        for (const el of patch.elements) {
          const existing = elementMap.get(el.id)
          // Only apply if remote version is newer (or element is new)
          if (!existing || (el.version ?? 0) >= (existing.version ?? 0)) {
            elementMap.set(el.id, el)
          }
        }
        api.updateScene({ elements: Array.from(elementMap.values()) })
      } catch (e) {
        console.error('[Collab] Failed to apply remote patch:', e)
      } finally {
        // Reset flag after Excalidraw finishes processing the update
        setTimeout(() => { applyingRemoteRef.current = false }, 0)
      }
    })

    // Voting events
    socket.on('vote:started', (voting: any) => {
      setSessionState(s => s ? { ...s, voting } : null)
      setVoteMap({})
      toast.success(`🗳️ Voting started! You have ${voting.maxVotes} votes`)
    })
    socket.on('vote:ended', (voting: any) => {
      setSessionState(s => s ? { ...s, voting } : null)
      toast.info('🗳️ Voting ended')
    })
    socket.on('vote:update', ({ shapeId, votes, userVotesRemaining, userId: vUserId }: { shapeId: string; votes: number; userVotesRemaining: number; userId: string }) => {
      setVoteMap(prev => ({ ...prev, [shapeId]: votes }))
      setSessionState(s => {
        if (!s) return s
        return {
          ...s,
          voting: {
            ...s.voting,
            userVoteCount: {
              ...s.voting.userVoteCount,
              [vUserId]: (s.voting.maxVotes || 5) - userVotesRemaining,
            }
          }
        }
      })
    })
    socket.on('vote:error', ({ message }: { message: string }) => toast.error(message))

    // Timer events
    socket.on('timer:started', ({ endTime, duration }: { endTime: number; duration: number }) => {
      setSessionState(s => s ? { ...s, timer: { endTime, duration, active: true } } : null)
    })
    socket.on('timer:stopped', () => {
      setSessionState(s => s ? { ...s, timer: { endTime: null, duration: 0, active: false } } : null)
    })

    // Anonymous / facilitator events
    socket.on('anonymous:changed', ({ enabled }: { enabled: boolean }) => {
      setSessionState(s => s ? { ...s, anonymousMode: enabled } : null)
      toast.info(enabled ? '👤 匿名模式已開啟' : '👤 匿名模式已關閉')
    })
    socket.on('facilitator:changed', ({ userId: newFacId, name }: any) => {
      toast.info(`🎤 ${name} 成為主持人`)
      if (userId === newFacId) { setIsFacilitator(true); toast.success('你現在是主持人！') }
    })
    socket.on('facilitator:cursors-locked', ({ locked }: { locked: boolean }) => {
      setSessionState(s => s ? { ...s, cursorsLocked: locked } : null)
      toast.info(locked ? '🔒 游標已鎖定' : '🔓 游標已解鎖')
    })
    socket.on('facilitator:spotlight', () => {
      try {
        excalidrawApiRef.current?.scrollToContent()
      } catch {}
    })

    return () => {
      if (patchTimerRef.current) clearTimeout(patchTimerRef.current)
      socket.disconnect()
      socketRef.current = null
      setSocketState(null)
      setRemoteUsers([])
      setConnected(false)
      setIsFacilitator(false)
    }
  }, [boardId, accessToken, userId])

  const sendCursor = useCallback((x: number, y: number) => {
    socketRef.current?.emit('cursor:move', { x, y })
  }, [])

  // Called from BoardPage onChange — debounced, skips echo from remote patches
  const broadcastElements = useCallback((elements: readonly any[]) => {
    if (applyingRemoteRef.current) return
    const socket = socketRef.current
    if (!socket?.connected) return

    // Only send changed elements (compare serialized to last sent)
    const serialized = JSON.stringify(elements.map(e => ({ id: e.id, version: e.version })))
    if (serialized === lastSentRef.current) return
    lastSentRef.current = serialized

    if (patchTimerRef.current) clearTimeout(patchTimerRef.current)
    patchTimerRef.current = setTimeout(() => {
      socket.emit('store:patch', { patch: { elements } })
    }, 50) // 50ms debounce — fast enough for real-time feel
  }, [])

  const castVote = useCallback((shapeId: string) => {
    socketRef.current?.emit('vote:cast', { shapeId })
  }, [])

  const removeVote = useCallback((shapeId: string) => {
    socketRef.current?.emit('vote:remove', { shapeId })
  }, [])

  return {
    remoteUsers, connected, isFacilitator,
    sessionState, voteMap,
    sendCursor, broadcastElements, castVote, removeVote,
    socket: socketState,
  }
}
