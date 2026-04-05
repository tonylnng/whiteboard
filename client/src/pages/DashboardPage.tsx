import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Plus, LogOut, Moon, Sun, Grid, Folder, Search, Pencil, Trash2, Copy, Check, X, Shield } from 'lucide-react'
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

  // Fetch /users/me to get isAdmin flag
  const { setAuth } = useAuthStore()
  useEffect(() => {
    api.get('/users/me').then(r => {
      if (r.data?.isAdmin !== undefined) {
        const token = localStorage.getItem('accessToken') || ''
        setAuth(token, { ...user, ...r.data })
      }
    }).catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const { data: boards = [], isLoading } = useQuery({
    queryKey: ['boards', selectedFolder, search],
    queryFn: () => api.get('/boards', { params: { folderId: selectedFolder, search: search || undefined } }).then(r => r.data),
  })

  const { data: folders = [] } = useQuery({
    queryKey: ['folders'],
    queryFn: () => api.get('/folders').then(r => r.data),
  })

  const createBoard = useMutation({
    mutationFn: () => api.post('/boards', { name: 'Untitled Board', folderId: selectedFolder, boardType: 'excalidraw' }).then(r => r.data),
    onSuccess: (board) => { queryClient.invalidateQueries({ queryKey: ['boards'] }); navigate(`/board/${board.id}`) },
    onError: () => toast.error('Failed to create board'),
  })

  const deleteBoard = useMutation({
    mutationFn: (id: string) => api.delete(`/boards/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['boards'] }); toast.success('Board deleted') },
    onError: () => toast.error('Failed to delete'),
  })

  const renameBoard = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => api.patch(`/boards/${id}`, { name }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['boards'] }); setEditingId(null) },
    onError: () => toast.error('Failed to rename'),
  })

  const cloneBoard = useMutation({
    mutationFn: (id: string) => api.post(`/boards/${id}/duplicate`).then(r => r.data),
    onSuccess: (board) => {
      queryClient.invalidateQueries({ queryKey: ['boards'] })
      toast.success('Board duplicated')
      navigate(`/board/${board.id}`)
    },
    onError: () => toast.error('Failed to duplicate'),
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
            <Grid size={16} /> All Boards
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
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />} {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </button>
          {user?.isAdmin && (
            <button onClick={() => navigate('/admin')}
              className="w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 text-purple-600 hover:bg-purple-50">
              <Shield size={16} /> Admin Portal
            </button>
          )}
          <button onClick={handleLogout}
            className="w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 text-red-500 hover:bg-red-50">
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-gray-800 dark:text-white">My Boards</h1>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search boards..."
                className="pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
            </div>
          </div>
          <button onClick={() => setShowNewBoardModal(true)} disabled={createBoard.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm font-medium disabled:opacity-50">
            <Plus size={16} /> New Board
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
              <p className="text-lg font-medium">No boards yet</p>
              <p className="text-sm mt-1">Click "New Board" to get started</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {boards.map((board: any) => (
                <div key={board.id}
                  onClick={() => editingId !== board.id && navigate(`/board/${board.id}`)}
                  className="group bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden cursor-pointer hover:shadow-md transition-all hover:border-teal-300">
                  {/* Thumbnail */}
                  <div className="h-32 flex items-center justify-center relative bg-gradient-to-br from-teal-50 to-blue-50 dark:from-teal-900 dark:to-blue-900">
                    <span className="text-4xl">🎨</span>
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
                    <p className="text-xs text-gray-400 mt-0.5">{new Date(board.updatedAt).toLocaleDateString()}</p>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={e => startEdit(e, board)}
                        title="Rename"
                        className="flex-1 flex items-center justify-center gap-1 py-1 text-xs text-gray-500 hover:text-teal-600 hover:bg-teal-50 rounded transition-colors">
                        <Pencil size={12} /> Rename
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); cloneBoard.mutate(board.id) }}
                        title="Duplicate"
                        className="flex-1 flex items-center justify-center gap-1 py-1 text-xs text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
                        <Copy size={12} /> Copy
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); if (confirm(`Delete "${board.name}"?`)) deleteBoard.mutate(board.id) }}
                        title="Delete"
                        className="flex-1 flex items-center justify-center gap-1 py-1 text-xs text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                        <Trash2 size={12} /> Delete
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
          onConfirm={() => {
            setShowNewBoardModal(false)
            createBoard.mutate()
          }}
          onClose={() => setShowNewBoardModal(false)}
        />
      )}
    </div>
  )
}
