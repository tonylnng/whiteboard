import { useState } from 'react'
import { Editor, createShapeId, toRichText } from 'tldraw'
import { SHAPE_CATEGORIES, ShapeSpec } from '../../lib/shapeLibrary'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface Props {
  editor: Editor | null
}

function insertShape(editor: Editor, specs: ShapeSpec[], cx: number, cy: number) {
  for (const spec of specs) {
    const id = createShapeId()
    const x = cx + (spec.x || 0)
    const y = cy + (spec.y || 0)

    try {
      if (spec.type === 'geo') {
        // Get existing richText from props or create from empty
        const props = { ...spec.props }
        // Convert any text label to richText format
        if (!props.richText) {
          props.richText = toRichText('')
        }
        editor.createShape({ id, type: 'geo', x, y, props })
      } else if (spec.type === 'text') {
        editor.createShape({
          id, type: 'text', x, y,
          props: { richText: toRichText(spec.props.text || ''), size: 'm', color: 'black', w: 200, autoSize: true, scale: 1, textAlign: 'middle' as any, font: 'draw' as any },
        })
      }
    } catch (e) {
      console.warn('[ShapeLib] insert failed:', spec.type, e)
    }
  }
  // Zoom to show inserted shapes
  try { (editor as any).zoomToContent() } catch {}
}

export default function ShapeLibrary({ editor }: Props) {
  const [open, setOpen] = useState(true)
  const [activeCategory, setActiveCategory] = useState('flowchart')

  const handleInsert = (specs: ShapeSpec[]) => {
    if (!editor) return
    const b = editor.getViewportPageBounds()
    const cx = b.x + b.w / 2
    const cy = b.y + b.h / 2
    insertShape(editor, specs, cx, cy)
  }

  const category = SHAPE_CATEGORIES.find(c => c.id === activeCategory)

  return (
    <div className="flex h-full shrink-0" style={{ zIndex: 10 }}>
      {/* Toggle button */}
      <button
        onClick={() => setOpen(v => !v)}
        className="absolute left-0 top-1/2 -translate-y-1/2 w-5 h-12 bg-white border border-gray-200 border-l-0 rounded-r-lg shadow-sm flex items-center justify-center hover:bg-gray-50 transition-colors"
        style={{ zIndex: 20 }}
        title={open ? '收起形狀庫' : '展開形狀庫'}
      >
        {open ? <ChevronLeft size={12} className="text-gray-500" /> : <ChevronRight size={12} className="text-gray-500" />}
      </button>

      {open && (
        <div className="w-52 bg-white border-r border-gray-200 flex flex-col h-full shadow-sm">
          {/* Header */}
          <div className="px-3 py-2.5 border-b border-gray-100 shrink-0">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">形狀庫</h3>
          </div>

          {/* Category tabs */}
          <div className="flex flex-col border-b border-gray-100 shrink-0">
            {SHAPE_CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors ${
                  activeCategory === cat.id
                    ? 'bg-teal-50 text-teal-700 font-medium border-r-2 border-teal-500'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <span className="text-base">{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>

          {/* Shapes grid */}
          <div className="flex-1 overflow-y-auto p-2">
            <div className="grid grid-cols-2 gap-1.5">
              {category?.shapes.map(shape => (
                <button
                  key={shape.id}
                  onClick={() => handleInsert(shape.create(0, 0))}
                  className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-teal-50 hover:border-teal-300 border border-transparent transition-all group cursor-pointer"
                  title={`插入 ${shape.label}`}
                  draggable
                  onDragEnd={(e) => {
                    if (!editor) return
                    // Convert screen drop position to page coords
                    const point = editor.screenToPage({ x: e.clientX, y: e.clientY })
                    insertShape(editor, shape.create(point.x, point.y), 0, 0)
                  }}
                >
                  <div
                    className="w-full aspect-video flex items-center justify-center"
                    dangerouslySetInnerHTML={{ __html: shape.preview }}
                    style={{ maxHeight: 44 }}
                  />
                  <span className="text-xs text-gray-500 group-hover:text-teal-600 text-center leading-tight">{shape.label}</span>
                </button>
              ))}
            </div>
            <p className="text-center text-xs text-gray-400 mt-3 mb-1">點擊插入或拖放到畫布</p>
          </div>
        </div>
      )}
    </div>
  )
}
