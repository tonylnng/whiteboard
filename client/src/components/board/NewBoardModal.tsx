import { X } from 'lucide-react'

interface NewBoardModalProps {
  onConfirm: () => void
  onClose: () => void
}

export default function NewBoardModal({ onConfirm, onClose }: NewBoardModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">New Whiteboard</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-400">
            <X size={18} />
          </button>
        </div>

        {/* Preview */}
        <div className="w-full h-28 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 flex items-center justify-center mb-5 overflow-hidden">
          <svg viewBox="0 0 120 70" className="w-full h-full p-3">
            <rect x="10" y="12" width="30" height="18" rx="3" fill="#fef9c3" stroke="#f59e0b" strokeWidth="1.5"/>
            <rect x="48" y="12" width="30" height="18" rx="3" fill="#dcfce7" stroke="#16a34a" strokeWidth="1.5"/>
            <rect x="86" y="12" width="24" height="18" rx="3" fill="#dbeafe" stroke="#2563eb" strokeWidth="1.5"/>
            <rect x="26" y="40" width="68" height="16" rx="3" fill="#ede9fe" stroke="#7c3aed" strokeWidth="1.5"/>
            <line x1="40" y1="30" x2="48" y2="30" stroke="#94a3b8" strokeWidth="1" markerEnd="url(#a)"/>
            <line x1="78" y1="30" x2="86" y2="30" stroke="#94a3b8" strokeWidth="1"/>
            <line x1="60" y1="30" x2="60" y2="40" stroke="#94a3b8" strokeWidth="1"/>
          </svg>
        </div>

        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5 text-center">
          Create a new Excalidraw whiteboard with real-time collaboration, AI tools, templates, and voting.
        </p>

        <button
          onClick={onConfirm}
          className="w-full py-2.5 rounded-xl text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 transition-colors"
        >
          Create Board
        </button>
      </div>
    </div>
  )
}
