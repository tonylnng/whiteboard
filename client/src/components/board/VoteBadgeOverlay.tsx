import { useEffect, useState, useRef, useCallback } from 'react'

interface Props {
  excalidrawApi: any | null
  voteMap: Record<string, number>
  votingActive: boolean
  onVote: (shapeId: string) => void
  onUnvote: (shapeId: string) => void
  myVotedIds?: Set<string>  // which element IDs this user has already voted on
}

interface BadgeInfo {
  id: string
  x: number
  y: number
  count: number
  name: string
}

const CONTAINER_TYPES = new Set(['rectangle', 'ellipse', 'diamond'])

/** Read the vote name from customData (preferred) or [VOTE:...] text fallback */
export function getVoteName(el: any): string | null {
  // Primary: customData.voteName (clean, user never sees the tag)
  const vn = el?.customData?.voteName as string | undefined
  if (vn && vn.trim()) return vn.trim()

  // Fallback: legacy [VOTE:name] text prefix
  const text: string = el?.text || el?.label || ''
  const m = text.match(/^\[VOTE(?::([^\]]*))?\]/i)
  if (!m) return null
  return (m[1] || '').trim() || 'Vote Item'
}

/** Resolve vote name from element OR its bound text child */
function resolveVoteName(el: any, elements: any[]): string | null {
  const direct = getVoteName(el)
  if (direct !== null) return direct

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

export default function VoteBadgeOverlay({
  excalidrawApi, voteMap, votingActive, onVote, onUnvote, myVotedIds = new Set(),
}: Props) {
  const [badges, setBadges] = useState<BadgeInfo[]>([])
  const apiRef = useRef(excalidrawApi)
  apiRef.current = excalidrawApi
  const rafRef = useRef<number | null>(null)
  const voteMapRef = useRef(voteMap)
  voteMapRef.current = voteMap
  const votingActiveRef = useRef(votingActive)
  votingActiveRef.current = votingActive
  const myVotedRef = useRef(myVotedIds)
  myVotedRef.current = myVotedIds

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
        if (!CONTAINER_TYPES.has(el.type) && el.type !== 'text') continue

        const voteName = resolveVoteName(el, elements)
        if (voteName === null) continue

        const count = voteMapRef.current[el.id] || 0
        if (!votingActiveRef.current && count === 0) continue

        // Top-right corner of element in screen coords
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
      if (time - lastTime > 100) { lastTime = time; computeBadges() }
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => { running = false; if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [excalidrawApi, computeBadges])

  useEffect(() => { computeBadges() }, [voteMap, votingActive, computeBadges])

  if (!votingActive && Object.keys(voteMap).length === 0) return null

  return (
    <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
      {badges.map(badge => {
        const hasVoted = myVotedRef.current.has(badge.id)
        return (
          <div key={badge.id} style={{
            position: 'absolute', left: badge.x - 4, top: badge.y - 4,
            pointerEvents: votingActive ? 'auto' : 'none', zIndex: 31,
          }}>
            {/* Single toggle button: click = vote if not voted, unvote if voted */}
            <div
              onClick={votingActive ? () => hasVoted ? onUnvote(badge.id) : onVote(badge.id) : undefined}
              title={hasVoted ? `Remove your vote from "${badge.name}"` : `Vote for "${badge.name}"`}
              style={{
                background: badge.count > 0
                  ? (hasVoted ? '#f59e0b' : 'rgba(245,158,11,0.75)')
                  : 'rgba(156,163,175,0.75)',
                color: 'white',
                fontSize: 11, fontWeight: 700,
                minWidth: badge.count > 0 ? 30 : 22,
                height: 22, borderRadius: 999,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '0 6px', gap: 3,
                boxShadow: hasVoted ? '0 2px 8px rgba(245,158,11,0.5)' : '0 1px 4px rgba(0,0,0,0.2)',
                border: hasVoted ? '2px solid white' : '1.5px solid rgba(255,255,255,0.8)',
                cursor: votingActive ? 'pointer' : 'default',
                userSelect: 'none',
                transition: 'all 0.15s ease',
                outline: hasVoted ? '2px solid #f59e0b' : 'none',
                outlineOffset: 1,
              }}>
              <span>🗳️</span>
              {badge.count > 0 && <span>{badge.count}</span>}
            </div>
          </div>
        )
      })}

      {/* Warning: voting active but no items tagged */}
      {votingActive && badges.length === 0 && (
        <div style={{
          position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(239,68,68,0.9)', color: 'white', padding: '8px 20px',
          borderRadius: 999, fontSize: 12, fontWeight: 600, pointerEvents: 'none', whiteSpace: 'nowrap',
        }}>
          ⚠️ No vote items found — use "+ Add Item" to create some
        </div>
      )}

      {/* Bottom hint */}
      {votingActive && badges.length > 0 && (
        <div style={{
          position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.72)', color: 'white', padding: '7px 16px',
          borderRadius: 999, fontSize: 11, fontWeight: 600, pointerEvents: 'none',
          whiteSpace: 'nowrap', display: 'flex', gap: 10, alignItems: 'center',
        }}>
          <span>🗳️ Click to vote · click again to remove</span>
          <span style={{ opacity: 0.5 }}>|</span>
          <span style={{ color: '#fde68a' }}>{badges.length} item{badges.length !== 1 ? 's' : ''}</span>
        </div>
      )}
    </div>
  )
}
