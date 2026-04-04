import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Plus, LogOut, Moon, Sun, Grid, Folder, Search, Pencil, Trash2, Copy, Check, X } from 'lucide-react'
import NewBoardModal from '../components/board/NewBoardModal'
import api from '../lib/api'
import { useAuthStore } from '../stores/auth.store'
import { useUIStore } from '../stores/ui.store'

export default function DashboardPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user, logout } = useAuthStore()
  const { theme, toggleTheme } = useUIStore()
  const [search, setSearch] = useState('')
  const [showNewBoardModal, setShowNewBoardModal] = useState(false)
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')

  const { data: boards = [], isLoading } = useQuery({
    queryKey: ['boards', selectedFolder, search],
    queryFn: () => api.get('/boards', { params: { folderId: selectedFolder, search: search || undefined } }).then(r => r.data),
  })

  const { data: folders = [] } = useQuery({
    queryKey: ['folders'],
    queryFn: () => api.get('/folders').then(r => r.data),
  })

  const createBoard = useMutation({
    mutationFn: (boardType: 'tldraw' | 'excalidraw') => api.post('/boards', { name: '未命名白板', folderId: selectedFolder, boardType }).then(r => r.data),
    onSuccess: (board) => { queryClient.invalidateQueries({ queryKey: ['boards'] }); navigate(`/board/${board.id}`) },
    onError: () => toast.error('建立失敗'),
  })

  const deleteBoard = useMutation({
    mutationFn: (id: string) => api.delete(`/boards/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['boards'] }); toast.success('已刪除') },
    onError: () => toast.error('刪除失敗'),
  })

  const renameBoard = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => api.patch(`/boards/${id}`, { name }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['boards'] }); setEditingId(null) },
    onError: () => toast.error('重命名失敗'),
  })

  const cloneBoard = useMutation({
    mutationFn: (id: string) => api.post(`/boards/${id}/duplicate`).then(r => r.data),
    onSuccess: (board) => {
      queryClient.invalidateQueries({ queryKey: ['boards'] })
      toast.success('已複製白板')
      navigate(`/board/${board.id}`)
    },
    onError: () => toast.error('複製失敗'),
  })

  const startEdit = (e: React.MouseEvent, board: any) => {
    e.stopPropagation()
    setEditingId(board.id)
    setEditingName(board.name)
  }

  const confirmRename = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!editingId || !editingName.trim()) return
    renameBoard.mutate({ id: editingId, name: editingName.trim() })
  }

  const cancelEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingId(null)
  }

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <aside className="w-56 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col shrink-0">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎨</span>
            <span className="font-bold text-gray-800 dark:text-white">Whiteboard</span>
          </div>
          {user && <p className="text-xs text-gray-400 mt-1 truncate">{user.name}</p>}
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          <button onClick={() => setSelectedFolder(null)}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 ${!selectedFolder ? 'bg-teal-50 text-teal-700 dark:bg-teal-900 dark:text-teal-300' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
            <Grid size={16} /> 全部白板
          </button>
          {folders.map((f: any) => (
            <button key={f.id} onClick={() => setSelectedFolder(f.id)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 ${selectedFolder === f.id ? 'bg-teal-50 text-teal-700' : 'text-gray-600 hover:bg-gray-100'}`}>
              <Folder size={16} /> {f.name}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-gray-200 dark:border-gray-700 space-y-1">
          <button onClick={toggleTheme}
            className="w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />} {theme === 'dark' ? '淺色模式' : '深色模式'}
          </button>
          <button onClick={handleLogout}
            className="w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 text-red-500 hover:bg-red-50">
            <LogOut size={16} /> 登出
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-gray-800 dark:text-white">我的白板</h1>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜尋白板..."
                className="pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
            </div>
          </div>
          <button onClick={() => setShowNewBoardModal(true)} disabled={createBoard.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm font-medium disabled:opacity-50">
            <Plus size={16} /> 新建白板
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => <div key={i} className="h-48 bg-gray-200 rounded-xl animate-pulse" />)}
            </div>
          ) : boards.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <div className="text-5xl mb-4">🎨</div>
              <p className="text-lg font-medium">還沒有白板</p>
              <p className="text-sm mt-1">點擊「新建白板」開始創作</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {boards.map((board: any) => (
                <div key={board.id}
                  onClick={() => editingId !== board.id && navigate(`/board/${board.id}`)}
                  className="group bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden cursor-pointer hover:shadow-md transition-all hover:border-teal-300">
                  {/* Thumbnail */}
                  <div className={`h-32 flex items-center justify-center relative ${
                    board.boardType === 'excalidraw'
                      ? 'bg-gradient-to-br from-orange-50 to-yellow-50 dark:from-orange-900 dark:to-yellow-900'
                      : 'bg-gradient-to-br from-teal-50 to-blue-50 dark:from-teal-900 dark:to-blue-900'
                  }`}>
                    <span className="text-4xl">{board.boardType === 'excalidraw' ? '✏️' : '🎨'}</span>
                    <span className={`absolute top-2 right-2 text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                      board.boardType === 'excalidraw'
                        ? 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300'
                        : 'bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300'
                    }`}>
                      {board.boardType === 'excalidraw' ? '草圖' : '清晰'}
                    </span>
                  </div>
                  {/* Info */}
                  <div className="p-3">
                    {editingId === board.id ? (
                      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                        <input
                          value={editingName}
                          onChange={e => setEditingName(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') renameBoard.mutate({ id: board.id, name: editingName.trim() }); if (e.key === 'Escape') setEditingId(null) }}
                          className="flex-1 text-sm border border-teal-400 rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-teal-500"
                          autoFocus
                        />
                        <button onClick={confirmRename} className="p-1 text-green-500 hover:bg-green-50 rounded"><Check size={14} /></button>
                        <button onClick={cancelEdit} className="p-1 text-gray-400 hover:bg-gray-100 rounded"><X size={14} /></button>
                      </div>
                    ) : (
                      <p className="font-medium text-gray-800 dark:text-white truncate text-sm">{board.name}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-0.5">{new Date(board.updatedAt).toLocaleDateString('zh-TW')}</p>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={e => startEdit(e, board)}
                        title="重命名"
                        className="flex-1 flex items-center justify-center gap-1 py-1 text-xs text-gray-500 hover:text-teal-600 hover:bg-teal-50 rounded transition-colors">
                        <Pencil size={12} /> 重命名
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); cloneBoard.mutate(board.id) }}
                        title="複製"
                        className="flex-1 flex items-center justify-center gap-1 py-1 text-xs text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
                        <Copy size={12} /> 複製
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); if (confirm(`確定刪除「${board.name}」？`)) deleteBoard.mutate(board.id) }}
                        title="刪除"
                        className="flex-1 flex items-center justify-center gap-1 py-1 text-xs text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                        <Trash2 size={12} /> 刪除
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {showNewBoardModal && (
        <NewBoardModal
          onConfirm={(boardType) => {
            setShowNewBoardModal(false)
            createBoard.mutate(boardType)
          }}
          onClose={() => setShowNewBoardModal(false)}
        />
      )}
    </div>
  )
}
