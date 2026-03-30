import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Plus, LogOut, Moon, Sun, Folder, Search, Grid } from 'lucide-react'
import api from '../lib/api'
import { useAuthStore } from '../stores/auth.store'
import { useUIStore } from '../stores/ui.store'

export default function DashboardPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user, logout } = useAuthStore()
  const { theme, toggleTheme } = useUIStore()
  const [search, setSearch] = useState('')
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null)

  const { data: boards = [], isLoading } = useQuery({
    queryKey: ['boards', selectedFolder, search],
    queryFn: () => api.get('/boards', { params: { folderId: selectedFolder, search } }).then(r => r.data),
  })

  const { data: folders = [] } = useQuery({
    queryKey: ['folders'],
    queryFn: () => api.get('/folders').then(r => r.data),
  })

  const createBoard = useMutation({
    mutationFn: () => api.post('/boards', { name: '未命名白板', folderId: selectedFolder }).then(r => r.data),
    onSuccess: (board) => { queryClient.invalidateQueries({ queryKey: ['boards'] }); navigate(`/board/${board.id}`) },
    onError: () => toast.error('建立失敗'),
  })

  const deleteBoard = useMutation({
    mutationFn: (id: string) => api.delete(`/boards/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['boards'] }); toast.success('已刪除') },
  })

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <aside className="w-56 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎨</span>
            <span className="font-bold text-gray-800 dark:text-white">Whiteboard</span>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
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
          <button onClick={toggleTheme} className="w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />} {theme === 'dark' ? '淺色模式' : '深色模式'}
          </button>
          <button onClick={handleLogout} className="w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 text-red-500 hover:bg-red-50">
            <LogOut size={16} /> 登出
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-gray-800 dark:text-white">我的白板</h1>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜尋白板..."
                className="pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
            </div>
          </div>
          <button onClick={() => createBoard.mutate()}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm font-medium transition-colors">
            <Plus size={16} /> 新建白板
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => <div key={i} className="h-40 bg-gray-200 rounded-xl animate-pulse" />)}
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
                <div key={board.id} onClick={() => navigate(`/board/${board.id}`)}
                  className="group bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 cursor-pointer hover:shadow-md transition-all hover:border-teal-300">
                  <div className="h-28 bg-gradient-to-br from-teal-50 to-blue-50 dark:from-teal-900 dark:to-blue-900 rounded-lg mb-3 flex items-center justify-center">
                    <span className="text-3xl">🎨</span>
                  </div>
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 dark:text-white truncate">{board.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{new Date(board.updatedAt).toLocaleDateString('zh-TW')}</p>
                    </div>
                    <button onClick={e => { e.stopPropagation(); if (confirm('確定刪除？')) deleteBoard.mutate(board.id) }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all text-xs">✕</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
