import { useEffect, useState, useRef, useCallback } from 'react'
import { Editor } from 'tldraw'

interface Props {
  editor: Editor | null
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
  hasMyVote: boolean
}

// Shape types that should NOT get vote badges
const SKIP_TYPES = new Set(['arrow', 'line', 'draw', 'highlight', 'laser'])

export default function VoteBadgeOverlay({ editor, voteMap, votingActive, onVote, onUnvote }: Props) {
  const [badges, setBadges] = useState<BadgeInfo[]>([])
  const editorRef = useRef(editor)
  editorRef.current = editor
  const rafRef = useRef<number | null>(null)
  const voteMapRef = useRef(voteMap)
  voteMapRef.current = voteMap
  const votingActiveRef = useRef(votingActive)
  votingActiveRef.current = votingActive

  const computeBadges = useCallback(() => {
    const ed = editorRef.current
    if (!ed) { setBadges([]); return }

    const shapeIds = [...ed.getCurrentPageShapeIds()]
    const result: BadgeInfo[] = []

    for (const id of shapeIds) {
      const shape = ed.getShape(id) as any
      if (!shape) continue
      // During voting: only show badges on vote-item shapes
      // After voting: show any shape that got votes
      if (votingActiveRef.current && shape.type !== "vote-item") continue
      if (!votingActiveRef.current && SKIP_TYPES.has(shape.type)) continue

      const count = voteMapRef.current[id] || 0
      if (!votingActiveRef.current && count === 0) continue

      try {
        const bounds = ed.getShapePageBounds(id)
        if (!bounds) continue
        // Position badge at top-right corner of shape
        const screen = ed.pageToScreen({ x: bounds.x + bounds.w, y: bounds.y })
        result.push({ id, x: screen.x, y: screen.y, count, hasMyVote: false })
      } catch {
        continue
      }
    }

    setBadges(result)
  }, [])

  // Use RAF loop to update badge positions continuously (handles zoom/pan)
  useEffect(() => {
    if (!editor) return

    let running = true
    let lastTime = 0
    const loop = (time: number) => {
      if (!running) return
      if (time - lastTime > 100) { // ~10fps
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
  }, [editor, computeBadges])

  // Recompute when voteMap or votingActive changes
  useEffect(() => {
    computeBadges()
  }, [voteMap, votingActive, computeBadges])

  if (!votingActive && Object.keys(voteMap).length === 0) return null

  return (
    <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
      {badges.map(badge => (
        <div
          key={badge.id}
          style={{
            position: 'absolute',
            left: badge.x - 4,
            top: badge.y - 4,
            pointerEvents: votingActive ? 'auto' : 'none',
            zIndex: 31,
          }}
        >
          {badge.count > 0 ? (
            // Voted badge - click to add more, right-click to remove
            <div
              style={{ display: 'flex', gap: 2 }}
              onClick={votingActive ? () => onVote(badge.id) : undefined}
              onContextMenu={votingActive ? (e) => { e.preventDefault(); onUnvote(badge.id) } : undefined}
            >
              <div style={{
                background: '#f59e0b',
                color: 'white',
                fontSize: 11,
                fontWeight: 700,
                minWidth: 26,
                height: 22,
                borderRadius: 999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 6px',
                boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                border: '2px solid white',
                cursor: votingActive ? 'pointer' : 'default',
                userSelect: 'none',
                gap: 3,
              }}>
                <span>🗳️</span>
                <span>{badge.count}</span>
              </div>
              {votingActive && (
                <div
                  style={{
                    background: 'rgba(239,68,68,0.85)',
                    color: 'white',
                    fontSize: 11,
                    fontWeight: 700,
                    width: 18,
                    height: 18,
                    borderRadius: 999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                    border: '1.5px solid white',
                    cursor: 'pointer',
                    alignSelf: 'center',
                    userSelect: 'none',
                  }}
                  onClick={(e) => { e.stopPropagation(); onUnvote(badge.id) }}
                  title="撤回投票"
                >
                  −
                </div>
              )}
            </div>
          ) : (
            // No votes yet - show + button
            votingActive && (
              <div
                style={{
                  background: 'rgba(156,163,175,0.85)',
                  color: 'white',
                  fontSize: 14,
                  fontWeight: 700,
                  width: 22,
                  height: 22,
                  borderRadius: 999,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                  border: '2px solid white',
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
                onClick={() => onVote(badge.id)}
                title="投票"
              >
                +
              </div>
            )
          )}
        </div>
      ))}

      {/* Bottom hint banner */}
      {votingActive && (
        <div style={{
          position: 'absolute',
          bottom: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.72)',
          color: 'white',
          padding: '8px 18px',
          borderRadius: 999,
          fontSize: 12,
          fontWeight: 600,
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
          display: 'flex',
          gap: 12,
          alignItems: 'center',
        }}>
          <span>🗳️ 點擊 <strong>+</strong> 投票</span>
          <span style={{ opacity: 0.6 }}>|</span>
          <span>點擊 <strong style={{ color: '#fca5a5' }}>−</strong> 撤票</span>
        </div>
      )}
    </div>
  )
}
