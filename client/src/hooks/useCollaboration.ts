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
      // Scroll to fit content in Excalidraw
      try {
        excalidrawApiRef.current?.scrollToContent()
      } catch {}
    })

    return () => {
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

  const castVote = useCallback((shapeId: string) => {
    socketRef.current?.emit('vote:cast', { shapeId })
  }, [])

  const removeVote = useCallback((shapeId: string) => {
    socketRef.current?.emit('vote:remove', { shapeId })
  }, [])

  return {
    remoteUsers, connected, isFacilitator,
    sessionState, voteMap,
    sendCursor, castVote, removeVote,
    socket: socketState,
  }
}
