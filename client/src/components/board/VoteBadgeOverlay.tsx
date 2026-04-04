import { useEffect, useState, useRef, useCallback } from 'react'

interface Props {
  excalidrawApi: any | null
  voteMap: Record<string, number>
  votingActive: boolean
  onVote: (shapeId: string) => void
  onUnvote: (shapeId: string) => void
}

interface BadgeInfo {
  id: string
  x: number
  y: number
  count: number
}

const SKIP_TYPES = new Set(['arrow', 'line', 'freedraw', 'text'])

export default function VoteBadgeOverlay({ excalidrawApi, voteMap, votingActive, onVote, onUnvote }: Props) {
  const [badges, setBadges] = useState<BadgeInfo[]>([])
  const apiRef = useRef(excalidrawApi)
  apiRef.current = excalidrawApi
  const rafRef = useRef<number | null>(null)
  const voteMapRef = useRef(voteMap)
  voteMapRef.current = voteMap
  const votingActiveRef = useRef(votingActive)
  votingActiveRef.current = votingActive
  const containerRef = useRef<HTMLDivElement | null>(null)

  const computeBadges = useCallback(() => {
    const api = apiRef.current
    if (!api) { setBadges([]); return }

    try {
      const elements = api.getSceneElements() as any[]
      const appState = api.getAppState()
      const zoom = appState.zoom?.value || 1
      const scrollX = appState.scrollX || 0
      const scrollY = appState.scrollY || 0

      const result: BadgeInfo[] = []
      for (const el of elements) {
        if (el.isDeleted) continue
        if (SKIP_TYPES.has(el.type)) continue
        const count = voteMapRef.current[el.id] || 0
        if (!votingActiveRef.current && count === 0) continue

        // Convert scene coords to screen coords (relative to container)
        const screenX = (el.x + (el.width || 0)) * zoom + scrollX
        const screenY = el.y * zoom + scrollY
        result.push({ id: el.id, x: screenX, y: screenY, count })
      }
      setBadges(result)
    } catch {
      setBadges([])
    }
  }, [])

  useEffect(() => {
    if (!excalidrawApi) return
    let running = true
    let lastTime = 0
    const loop = (time: number) => {
      if (!running) return
      if (time - lastTime > 100) {
        lastTime = time
        computeBadges()
      }
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => {
      running = false
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [excalidrawApi, computeBadges])

  useEffect(() => { computeBadges() }, [voteMap, votingActive, computeBadges])

  if (!votingActive && Object.keys(voteMap).length === 0) return null

  return (
    <div ref={containerRef} className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
      {badges.map(badge => (
        <div key={badge.id} style={{ position: 'absolute', left: badge.x - 4, top: badge.y - 4, pointerEvents: votingActive ? 'auto' : 'none', zIndex: 31 }}>
          {badge.count > 0 ? (
            <div style={{ display: 'flex', gap: 2 }}
              onClick={votingActive ? () => onVote(badge.id) : undefined}
              onContextMenu={votingActive ? (e) => { e.preventDefault(); onUnvote(badge.id) } : undefined}>
              <div style={{
                background: '#f59e0b', color: 'white', fontSize: 11, fontWeight: 700,
                minWidth: 26, height: 22, borderRadius: 999,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '0 6px', boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                border: '2px solid white', cursor: votingActive ? 'pointer' : 'default',
                userSelect: 'none', gap: 3,
              }}>
                <span>🗳️</span><span>{badge.count}</span>
              </div>
              {votingActive && (
                <div style={{
                  background: 'rgba(239,68,68,0.85)', color: 'white', fontSize: 11, fontWeight: 700,
                  width: 18, height: 18, borderRadius: 999,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.2)', border: '1.5px solid white',
                  cursor: 'pointer', alignSelf: 'center', userSelect: 'none',
                }}
                  onClick={(e) => { e.stopPropagation(); onUnvote(badge.id) }} title="撤回投票">
                  −
                </div>
              )}
            </div>
          ) : (
            votingActive && (
              <div style={{
                background: 'rgba(156,163,175,0.85)', color: 'white', fontSize: 14, fontWeight: 700,
                width: 22, height: 22, borderRadius: 999,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 1px 4px rgba(0,0,0,0.2)', border: '2px solid white',
                cursor: 'pointer', userSelect: 'none',
              }} onClick={() => onVote(badge.id)} title="投票">
                +
              </div>
            )
          )}
        </div>
      ))}
      {votingActive && (
        <div style={{
          position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.72)', color: 'white', padding: '8px 18px',
          borderRadius: 999, fontSize: 12, fontWeight: 600, pointerEvents: 'none',
          whiteSpace: 'nowrap', display: 'flex', gap: 12, alignItems: 'center',
        }}>
          <span>🗳️ 點擊 <strong>+</strong> 投票</span>
          <span style={{ opacity: 0.6 }}>|</span>
          <span>點擊 <strong style={{ color: '#fca5a5' }}>−</strong> 撤票</span>
        </div>
      )}
    </div>
  )
}
