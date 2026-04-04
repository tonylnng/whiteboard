import { useEffect, useRef, useCallback } from 'react'
import { Socket } from 'socket.io-client'

interface CursorData {
  socketId: string
  x: number  // canvas coords
  y: number
  name: string
  color: string
}

interface Props {
  excalidrawApi: any | null
  socket: Socket | null
}

export default function RemoteCursors({ excalidrawApi, socket }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const cursorsRef = useRef<Record<string, CursorData>>({})
  const apiRef = useRef(excalidrawApi)
  const rafRef = useRef<number | null>(null)
  apiRef.current = excalidrawApi

  // Convert canvas coords → screen coords using current scroll/zoom
  const canvasToScreen = useCallback((cx: number, cy: number) => {
    const api = apiRef.current
    if (!api) return { x: cx, y: cy }
    try {
      const { zoom, scrollX, scrollY } = api.getAppState()
      const z = zoom?.value ?? 1
      return { x: cx * z + scrollX, y: cy * z + scrollY }
    } catch {
      return { x: cx, y: cy }
    }
  }, [])

  // RAF loop — re-renders cursor DOM directly for smooth scroll/zoom tracking
  const renderLoop = useCallback(() => {
    const container = containerRef.current
    if (!container) return

    const cursors = Object.values(cursorsRef.current)

    // Sync DOM nodes to current cursor set
    const existing = new Set(Array.from(container.children).map(c => (c as HTMLElement).dataset.sid))
    const current = new Set(cursors.map(c => c.socketId))

    // Remove stale
    for (const sid of existing) {
      if (!current.has(sid!)) {
        const el = container.querySelector(`[data-sid="${sid}"]`)
        if (el) container.removeChild(el)
      }
    }

    // Update / create
    for (const cursor of cursors) {
      const { x, y } = canvasToScreen(cursor.x, cursor.y)
      let el = container.querySelector<HTMLElement>(`[data-sid="${cursor.socketId}"]`)
      if (!el) {
        el = document.createElement('div')
        el.dataset.sid = cursor.socketId
        el.style.cssText = 'position:absolute;pointer-events:none;transition:left 80ms linear,top 80ms linear;'
        el.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 20 20" style="filter:drop-shadow(0 1px 2px rgba(0,0,0,0.3))">
            <path d="M3 2L17 10L10 12L7 18L3 2Z" fill="${cursor.color}" stroke="white" stroke-width="1.5"/>
          </svg>
          <div style="position:absolute;left:16px;top:14px;background:${cursor.color};color:white;font-size:11px;font-weight:600;padding:2px 6px;border-radius:8px;white-space:nowrap;box-shadow:0 1px 3px rgba(0,0,0,0.2)">${cursor.name}</div>
        `
        container.appendChild(el)
      }
      el.style.left = `${x - 2}px`
      el.style.top = `${y - 2}px`
    }

    rafRef.current = requestAnimationFrame(renderLoop)
  }, [canvasToScreen])

  // Start / stop RAF loop
  useEffect(() => {
    rafRef.current = requestAnimationFrame(renderLoop)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [renderLoop])

  // Socket event listeners
  useEffect(() => {
    if (!socket) return
    const onMove = (data: { socketId: string; x: number; y: number; name: string; color: string }) => {
      cursorsRef.current = { ...cursorsRef.current, [data.socketId]: data }
    }
    const onLeave = ({ socketId }: { socketId: string }) => {
      const next = { ...cursorsRef.current }
      delete next[socketId]
      cursorsRef.current = next
    }
    socket.on('cursor:move', onMove)
    socket.on('user:left', onLeave)
    return () => { socket.off('cursor:move', onMove); socket.off('user:left', onLeave) }
  }, [socket])

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 pointer-events-none overflow-hidden z-20"
    />
  )
}
