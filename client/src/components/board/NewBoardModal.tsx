import { useState } from 'react'
import { X } from 'lucide-react'

interface NewBoardModalProps {
  onConfirm: (boardType: 'tldraw' | 'excalidraw') => void
  onClose: () => void
}

export default function NewBoardModal({ onConfirm, onClose }: NewBoardModalProps) {
  const [selected, setSelected] = useState<'tldraw' | 'excalidraw'>('tldraw')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">新建白板</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-400">
            <X size={18} />
          </button>
        </div>

        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">選擇白板模式</p>

        <div className="grid grid-cols-2 gap-3 mb-6">
          {/* Clean Mode - tldraw */}
          <button
            onClick={() => setSelected('tldraw')}
            className={`relative flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all ${
              selected === 'tldraw'
                ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/30'
                : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
            }`}
          >
            {selected === 'tldraw' && (
              <div className="absolute top-2 right-2 w-4 h-4 bg-teal-500 rounded-full flex items-center justify-center">
                <svg viewBox="0 0 12 12" className="w-2.5 h-2.5 text-white fill-current">
                  <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            )}
            {/* Preview */}
            <div className="w-full h-20 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 flex items-center justify-center overflow-hidden">
              <svg viewBox="0 0 80 50" className="w-full h-full p-2">
                <rect x="10" y="10" width="25" height="15" rx="3" fill="#14b8a6" opacity="0.8"/>
                <rect x="45" y="10" width="25" height="15" rx="3" fill="#6366f1" opacity="0.8"/>
                <rect x="25" y="32" width="30" height="12" rx="3" fill="#f59e0b" opacity="0.8"/>
                <line x1="22" y1="18" x2="45" y2="18" stroke="#94a3b8" strokeWidth="1.5" markerEnd="url(#a)"/>
                <line x1="40" y1="25" x2="40" y2="32" stroke="#94a3b8" strokeWidth="1.5"/>
              </svg>
            </div>
            <div className="text-center">
              <p className="font-medium text-sm text-gray-800 dark:text-white">清晰模式</p>
              <p className="text-xs text-gray-400 mt-0.5">專業、精準、功能豐富</p>
              <div className="flex flex-wrap gap-1 justify-center mt-1.5">
                <span className="text-[10px] bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300 px-1.5 py-0.5 rounded-full">AI 助手</span>
                <span className="text-[10px] bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300 px-1.5 py-0.5 rounded-full">34 形狀</span>
                <span className="text-[10px] bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300 px-1.5 py-0.5 rounded-full">協作</span>
              </div>
            </div>
          </button>

          {/* Sketch Mode - Excalidraw */}
          <button
            onClick={() => setSelected('excalidraw')}
            className={`relative flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all ${
              selected === 'excalidraw'
                ? 'border-orange-400 bg-orange-50 dark:bg-orange-900/30'
                : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
            }`}
          >
            {selected === 'excalidraw' && (
              <div className="absolute top-2 right-2 w-4 h-4 bg-orange-400 rounded-full flex items-center justify-center">
                <svg viewBox="0 0 12 12" className="w-2.5 h-2.5 text-white fill-current">
                  <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            )}
            {/* Preview */}
            <div className="w-full h-20 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 flex items-center justify-center overflow-hidden">
              <svg viewBox="0 0 80 50" className="w-full h-full p-2" style={{ fontFamily: 'cursive' }}>
                {/* Sketchy hand-drawn style */}
                <path d="M10,12 Q12,10 14,11 Q22,9 34,12 Q36,13 35,20 Q35,26 22,25 Q10,26 10,20 Q9,14 10,12" fill="none" stroke="#e07b39" strokeWidth="1.5"/>
                <path d="M44,12 Q46,9 60,10 Q70,11 70,20 Q71,27 57,26 Q44,27 44,20 Q43,13 44,12" fill="none" stroke="#6965db" strokeWidth="1.5"/>
                <path d="M25,34 Q26,31 40,30 Q55,29 55,35 Q56,41 40,42 Q25,43 24,37 Q24,34 25,34" fill="none" stroke="#f5a623" strokeWidth="1.5"/>
                <path d="M22,18 Q33,17 44,18" stroke="#6b7280" strokeWidth="1" strokeDasharray="2,1"/>
                <path d="M40,26 Q40,29 40,30" stroke="#6b7280" strokeWidth="1" strokeDasharray="2,1"/>
              </svg>
            </div>
            <div className="text-center">
              <p className="font-medium text-sm text-gray-800 dark:text-white">草圖模式</p>
              <p className="text-xs text-gray-400 mt-0.5">手繪風格、快速構思</p>
              <div className="flex flex-wrap gap-1 justify-center mt-1.5">
                <span className="text-[10px] bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300 px-1.5 py-0.5 rounded-full">手繪感</span>
                <span className="text-[10px] bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300 px-1.5 py-0.5 rounded-full">輕量</span>
                <span className="text-[10px] bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300 px-1.5 py-0.5 rounded-full">匯出</span>
              </div>
            </div>
          </button>
        </div>

        <button
          onClick={() => onConfirm(selected)}
          className={`w-full py-2.5 rounded-xl text-sm font-medium text-white transition-colors ${
            selected === 'excalidraw'
              ? 'bg-orange-400 hover:bg-orange-500'
              : 'bg-teal-600 hover:bg-teal-700'
          }`}
        >
          建立白板
        </button>
      </div>
    </div>
  )
}
