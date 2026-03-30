import { useEffect, useState, useCallback, useRef } from 'react'
import { Editor, TLShapeId } from 'tldraw'
import { Play } from 'lucide-react'

interface Props {
  editor: Editor | null
}

interface OverlayState {
  id: string
  x: number
  y: number
  w: number
  h: number
}

export default function EmbedInteractionOverlay({ editor }: Props) {
  const [overlay, setOverlay] = useState<OverlayState | null>(null)
  const [interactive, setInteractive] = useState(false)
  const editorRef = useRef(editor)
  editorRef.current = editor

  const refresh = useCallback(() => {
    const ed = editorRef.current
    if (!ed) return
    const sel = ed.getSelectedShapeIds()
    if (sel.length !== 1) { setOverlay(null); return }
    const shape = ed.getShape(sel[0]) as any
    if (!shape || shape.type !== 'embed') { setOverlay(null); return }
    const bounds = ed.getShapePageBounds(sel[0])
    if (!bounds) { setOverlay(null); return }
    const tl = ed.pageToScreen({ x: bounds.x, y: bounds.y })
    const br = ed.pageToScreen({ x: bounds.x + bounds.w, y: bounds.y + bounds.h })
    setOverlay({ id: sel[0], x: tl.x, y: tl.y, w: br.x - tl.x, h: br.y - tl.y })
    setInteractive(false)
  }, [])

  useEffect(() => {
    if (!editor) return
    const unsub = editor.store.listen(refresh, { scope: 'all' })
    return unsub
  }, [editor, refresh])

  const onPlayClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (editor && overlay) {
      editor.setSelectedShapes([])
      setInteractive(true)
    }
  }, [editor, overlay])

  const onEdgeClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (editor && overlay) {
      editor.setSelectedShapes([overlay.id as TLShapeId])
      setInteractive(false)
    }
  }, [editor, overlay])

  if (!overlay || interactive) return null

  const pad = Math.min(48, Math.min(overlay.w, overlay.h) * 0.22)
  const iconSize = Math.max(24, Math.min(48, overlay.h * 0.12))

  return (
    <div
      style={{ position: 'absolute', left: overlay.x, top: overlay.y, width: overlay.w, height: overlay.h, zIndex: 150, cursor: 'move', pointerEvents: 'auto' }}
      onClick={onEdgeClick}
    >
      {/* Center play zone */}
      <div
        style={{
          position: 'absolute', left: pad, top: pad, right: pad, bottom: pad,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: 10, background: 'rgba(0,0,0,0.06)',
          cursor: 'pointer', transition: 'background 0.15s',
        }}
        onClick={onPlayClick}
        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.15)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.06)')}
      >
        <div style={{
          background: 'rgba(0,0,0,0.65)', borderRadius: 999,
          width: iconSize * 1.6, height: iconSize * 1.6,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 3px 16px rgba(0,0,0,0.4)',
        }}>
          <Play size={iconSize} fill="white" color="white" />
        </div>
        <span style={{
          position: 'absolute', bottom: 8, fontSize: 11, fontWeight: 600,
          color: 'rgba(255,255,255,0.9)', background: 'rgba(0,0,0,0.5)',
          padding: '2px 8px', borderRadius: 6,
        }}>點擊播放</span>
      </div>
      {/* Edge hint */}
      <div style={{
        position: 'absolute', top: 4, right: 6,
        background: 'rgba(0,0,0,0.45)', color: 'white',
        fontSize: 10, padding: '2px 6px', borderRadius: 4, pointerEvents: 'none',
      }}>拖動移動 / 邊角縮放</div>
    </div>
  )
}
