import {
  ShapeUtil,
  HTMLContainer,
  TLBaseShape,
  Rectangle2d,
  stopEventPropagation,
} from 'tldraw'
import { useState, useRef, useEffect } from 'react'

export type VoteItemShapeProps = {
  w: number
  h: number
  label: string
  color: string
}

export type VoteItemShape = TLBaseShape<'vote-item', VoteItemShapeProps>

const COLORS: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  yellow:  { bg: '#fef9c3', border: '#fbbf24', text: '#92400e', dot: '#f59e0b' },
  green:   { bg: '#dcfce7', border: '#4ade80', text: '#14532d', dot: '#22c55e' },
  blue:    { bg: '#dbeafe', border: '#60a5fa', text: '#1e3a8a', dot: '#3b82f6' },
  violet:  { bg: '#ede9fe', border: '#a78bfa', text: '#4c1d95', dot: '#8b5cf6' },
  red:     { bg: '#fee2e2', border: '#f87171', text: '#7f1d1d', dot: '#ef4444' },
  orange:  { bg: '#ffedd5', border: '#fb923c', text: '#7c2d12', dot: '#f97316' },
}

function VoteItemComponent({ shape, isEditing, onLabelChange }: {
  shape: VoteItemShape
  isEditing: boolean
  onLabelChange: (label: string) => void
}) {
  const { w, h, label, color } = shape.props
  const theme = COLORS[color] || COLORS.yellow
  const [draft, setDraft] = useState(label)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  return (
    <HTMLContainer
      id={shape.id}
      style={{ width: w, height: h, pointerEvents: 'all' }}
      onPointerDown={stopEventPropagation}
    >
      <div style={{
        width: '100%',
        height: '100%',
        background: theme.bg,
        border: `2px solid ${theme.border}`,
        borderRadius: 12,
        boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        fontFamily: 'system-ui, sans-serif',
        boxSizing: 'border-box',
      }}>
        {/* Top strip */}
        <div style={{
          background: theme.border,
          padding: '4px 10px',
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 12 }}>🗳️</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: 1 }}>Vote Item</span>
        </div>

        {/* Label area */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12 }}>
          {isEditing ? (
            <textarea
              ref={inputRef}
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onBlur={() => onLabelChange(draft)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  onLabelChange(draft)
                }
                e.stopPropagation()
              }}
              style={{
                width: '100%',
                height: '100%',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                resize: 'none',
                fontSize: Math.max(13, Math.min(18, w / 12)),
                fontWeight: 600,
                color: theme.text,
                textAlign: 'center',
                fontFamily: 'system-ui, sans-serif',
                cursor: 'text',
              }}
            />
          ) : (
            <div style={{
              fontSize: Math.max(13, Math.min(18, w / 12)),
              fontWeight: 600,
              color: theme.text,
              textAlign: 'center',
              wordBreak: 'break-word',
              lineHeight: 1.4,
            }}>
              {label || 'Double-click to edit'}
            </div>
          )}
        </div>
      </div>
    </HTMLContainer>
  )
}

export class VoteItemShapeUtil extends ShapeUtil<VoteItemShape> {
  static override type = 'vote-item' as const

  override canEdit = () => true
  override isAspectRatioLocked = () => false

  override getDefaultProps(): VoteItemShapeProps {
    return { w: 200, h: 120, label: 'Vote Item', color: 'yellow' }
  }

  override getGeometry(shape: VoteItemShape) {
    return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true })
  }

  override component(shape: VoteItemShape) {
    const isEditing = this.editor.getEditingShapeId() === shape.id

    const handleLabelChange = (newLabel: string) => {
      this.editor.updateShape<VoteItemShape>({
        id: shape.id,
        type: 'vote-item',
        props: { label: newLabel || 'Vote Item' },
      })
      this.editor.setEditingShape(null)
    }

    return (
      <VoteItemComponent
        shape={shape}
        isEditing={isEditing}
        onLabelChange={handleLabelChange}
      />
    )
  }

  override indicator(shape: VoteItemShape) {
    return <rect width={shape.props.w} height={shape.props.h} rx={12} ry={12} />
  }

  override onResize(shape: VoteItemShape, info: any) {
    const { scaleX, scaleY } = info
    return {
      props: {
        w: Math.max(120, shape.props.w * scaleX),
        h: Math.max(80, shape.props.h * scaleY),
      },
    }
  }

  override onDoubleClick(shape: VoteItemShape) {
    this.editor.setEditingShape(shape.id)
    return
  }
}