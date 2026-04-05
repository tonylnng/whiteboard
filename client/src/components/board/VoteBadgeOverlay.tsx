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
  name: string   // the friendly [VOTE:name] label
}

// Elements whose text/label we inspect for [VOTE:...] tags
const CONTAINER_TYPES = new Set(['rectangle', 'ellipse', 'diamond', 'image'])

/** Extract the vote name from element text/label. Returns null if not a vote item. */
export function getVoteName(el: any): string | null {
  const raw = el?.customData?.voteName as string | undefined
  if (raw) return raw.trim()

  // Fallback: check text property (standalone text or bound text)
  const text: string = el?.text || el?.label || ''
  const m = text.match(/^\[VOTE(?::([^\]]*))?\]/i)
  if (!m) return null
  return (m[1] || '').trim() || 'Vote Item'
}

/** Get the vote name from an element OR its bound text child */
function resolveVoteName(el: any, elements: any[]): string | null {
  // direct
  const direct = getVoteName(el)
  if (direct !== null) return direct

  // check bound text children
  const boundIds: string[] = (el.boundElements || [])
    .filter((b: any) => b.type === 'text')
    .map((b: any) => b.id)

  for (const bid of boundIds) {
    const child = elements.find((e: any) => e.id === bid && !e.isDeleted)
    if (child) {
      const name = getVoteName(child)
      if (name !== null) return name
    }
  }
  return null
}

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
        // Only show badges on shapes that are marked as vote items
        if (!CONTAINER_TYPES.has(el.type) && el.type !== 'text') continue

        const voteName = resolveVoteName(el, elements)
        if (voteName === null) continue   // ← only tagged elements get badges

        const count = voteMapRef.current[el.id] || 0
        if (!votingActiveRef.current && count === 0) continue

        // Convert scene coords → screen coords (top-right corner of element)
        const screenX = (el.x + (el.width || 0)) * zoom + scrollX
        const screenY = el.y * zoom + scrollY

        result.push({ id: el.id, x: screenX, y: screenY, count, name: voteName })
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
            <div style={{ display: 'flex', gap: 2 }}>
              <div
                onClick={votingActive ? () => onVote(badge.id) : undefined}
                onContextMenu={votingActive ? (e) => { e.preventDefault(); onUnvote(badge.id) } : undefined}
                style={{
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
                <div
                  style={{
                    background: 'rgba(239,68,68,0.85)', color: 'white', fontSize: 11, fontWeight: 700,
                    width: 18, height: 18, borderRadius: 999,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.2)', border: '1.5px solid white',
                    cursor: 'pointer', alignSelf: 'center', userSelect: 'none',
                  }}
                  onClick={(e) => { e.stopPropagation(); onUnvote(badge.id) }}
                  title="Remove vote">
                  −
                </div>
              )}
            </div>
          ) : (
            votingActive && (
              <div
                style={{
                  background: 'rgba(245,158,11,0.75)', color: 'white', fontSize: 12, fontWeight: 700,
                  minWidth: 22, height: 22, borderRadius: 999, padding: '0 5px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3,
                  boxShadow: '0 1px 4px rgba(0,0,0,0.2)', border: '2px solid white',
                  cursor: 'pointer', userSelect: 'none',
                }}
                onClick={() => onVote(badge.id)}
                title={`Vote for "${badge.name}"`}>
                🗳️
              </div>
            )
          )}
        </div>
      ))}

      {/* Indicator strip: how many vote items exist */}
      {votingActive && badges.length === 0 && (
        <div style={{
          position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(239,68,68,0.9)', color: 'white', padding: '8px 20px',
          borderRadius: 999, fontSize: 12, fontWeight: 600, pointerEvents: 'none',
          whiteSpace: 'nowrap',
        }}>
          ⚠️ No voteable items found — use "Add Vote Item" to create some
        </div>
      )}

      {votingActive && badges.length > 0 && (
        <div style={{
          position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.72)', color: 'white', padding: '8px 18px',
          borderRadius: 999, fontSize: 12, fontWeight: 600, pointerEvents: 'none',
          whiteSpace: 'nowrap', display: 'flex', gap: 12, alignItems: 'center',
        }}>
          <span>🗳️ Click <strong>🗳️</strong> to vote</span>
          <span style={{ opacity: 0.6 }}>|</span>
          <span>Click <strong style={{ color: '#fca5a5' }}>−</strong> to remove vote</span>
          <span style={{ opacity: 0.6 }}>|</span>
          <span style={{ color: '#fde68a' }}>{badges.length} item{badges.length !== 1 ? 's' : ''} available</span>
        </div>
      )}
    </div>
  )
}
