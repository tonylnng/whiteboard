import { useEffect, useState, useRef } from 'react'
import { Editor } from 'tldraw'
import { Socket } from 'socket.io-client'

interface CursorData {
  socketId: string
  x: number
  y: number
  name: string
  color: string
}

interface Props {
  editor: Editor | null
  socket: Socket | null
}

export default function RemoteCursors({ editor, socket }: Props) {
  const [cursors, setCursors] = useState<Record<string, CursorData>>({})
  const editorRef = useRef(editor)
  editorRef.current = editor

  useEffect(() => {
    if (!socket) return
    const onMove = (data: { socketId: string; x: number; y: number; name: string; color: string }) => {
      setCursors(prev => ({ ...prev, [data.socketId]: data }))
    }
    const onLeave = ({ socketId }: { socketId: string }) => {
      setCursors(prev => { const n = { ...prev }; delete n[socketId]; return n })
    }
    socket.on('cursor:move', onMove)
    socket.on('user:left', onLeave)
    return () => { socket.off('cursor:move', onMove); socket.off('user:left', onLeave) }
  }, [socket])

  if (!editor) return null

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
      {Object.values(cursors).map(cursor => {
        const ed = editorRef.current
        if (!ed) return null
        try {
          const screen = ed.pageToScreen({ x: cursor.x, y: cursor.y })
          return (
            <div key={cursor.socketId} style={{
              position: 'absolute',
              left: screen.x,
              top: screen.y,
              transform: 'translate(-2px, -2px)',
              pointerEvents: 'none',
              transition: 'left 80ms linear, top 80ms linear',
            }}>
              <svg width="20" height="20" viewBox="0 0 20 20" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }}>
                <path d="M3 2L17 10L10 12L7 18L3 2Z" fill={cursor.color} stroke="white" strokeWidth="1.5" />
              </svg>
              <div style={{
                position: 'absolute', left: 16, top: 14,
                background: cursor.color, color: 'white', fontSize: 11, fontWeight: 600,
                padding: '2px 6px', borderRadius: 8, whiteSpace: 'nowrap',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              }}>{cursor.name}</div>
            </div>
          )
        } catch { return null }
      })}
    </div>
  )
}
