import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  Users, BarChart2, Shield, Trash2, ArrowLeft,
  TrendingUp, Layout, Share2, Globe, UserCheck,
  ChevronUp, ChevronDown
} from 'lucide-react'
import api from '../lib/api'

// ── Types ────────────────────────────────────────────────────────────────────

interface AdminUser {
  id: string
  name: string
  email: string
  isAdmin: boolean
  createdAt: string
  updatedAt: string
  boardCount: number
}

interface Stats {
  overview: {
    totalUsers: number
    totalBoards: number
    publicBoards: number
    sharedBoards: number
    collabBoards: number
  }
  boardsPerDay: { date: string; count: number }[]
  usersPerDay: { date: string; count: number }[]
  boardTypes: { type: string; count: number }[]
  topUsers: { userId: string; name: string; email: string; boardCount: number }[]
}

// ── Mini bar chart ────────────────────────────────────────────────────────────

function SparkBar({ data, color = '#14b8a6' }: { data: { date: string; count: number }[]; color?: string }) {
  if (!data.length) return <p className="text-xs text-gray-400">No data</p>
  const max = Math.max(...data.map(d => d.count), 1)
  return (
    <div className="flex items-end gap-0.5 h-14 mt-2">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-0.5" title={`${d.date}: ${d.count}`}>
          <div
            style={{ height: `${Math.max(4, (d.count / max) * 48)}px`, backgroundColor: color }}
            className="w-full rounded-sm opacity-80 hover:opacity-100 transition-opacity"
          />
        </div>
      ))}
    </div>
  )
}

// ── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, color = 'teal' }: { icon: React.ReactNode; label: string; value: number; color?: string }) {
  const colors: Record<string, string> = {
    teal: 'bg-teal-50 text-teal-600',
    blue: 'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
    green: 'bg-green-50 text-green-600',
  }
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colors[color] || colors.teal}`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-800">{value.toLocaleString()}</p>
        <p className="text-xs text-gray-500">{label}</p>
      </div>
    </div>
  )
}

// ── Users tab ────────────────────────────────────────────────────────────────

function UsersTab({ users, onUpdate, onDelete }: {
  users: AdminUser[]
  onUpdate: (id: string, data: any) => void
  onDelete: (id: string) => void
}) {
  const [sortBy, setSortBy] = useState<'name' | 'createdAt' | 'boardCount'>('createdAt')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [search, setSearch] = useState('')

  const toggleSort = (col: typeof sortBy) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(col); setSortDir('asc') }
  }

  const filtered = users
    .filter(u => !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      let av: any = a[sortBy], bv: any = b[sortBy]
      if (sortBy === 'createdAt') { av = new Date(av).getTime(); bv = new Date(bv).getTime() }
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })

  const SortIcon = ({ col }: { col: typeof sortBy }) => sortBy === col
    ? sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
    : <span className="w-3" />

  return (
    <div>
      <div className="mb-4">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search users..."
          className="w-full max-w-xs px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <button onClick={() => toggleSort('name')} className="flex items-center gap-1 hover:text-gray-700">
                  Name <SortIcon col="name" />
                </button>
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <button onClick={() => toggleSort('boardCount')} className="flex items-center gap-1 hover:text-gray-700">
                  Boards <SortIcon col="boardCount" />
                </button>
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <button onClick={() => toggleSort('createdAt')} className="flex items-center gap-1 hover:text-gray-700">
                  Joined <SortIcon col="createdAt" />
                </button>
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map(user => (
              <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-bold">
                      {user.name[0]?.toUpperCase() || '?'}
                    </div>
                    <span className="font-medium text-gray-800">{user.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-500">{user.email}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1 text-gray-600">
                    <Layout size={12} /> {user.boardCount}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs">{new Date(user.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  {user.isAdmin
                    ? <span className="inline-flex items-center gap-1 text-xs font-medium bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full"><Shield size={10} /> Admin</span>
                    : <span className="text-xs text-gray-400">Member</span>
                  }
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 justify-end">
                    <button
                      onClick={() => onUpdate(user.id, { isAdmin: !user.isAdmin })}
                      title={user.isAdmin ? 'Revoke admin' : 'Make admin'}
                      className={`p-1.5 rounded-lg transition-colors ${user.isAdmin ? 'text-purple-500 hover:bg-purple-50' : 'text-gray-400 hover:text-purple-500 hover:bg-purple-50'}`}>
                      <UserCheck size={14} />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Delete user "${user.name}"? This cannot be undone.`)) onDelete(user.id)
                      }}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-10 text-center text-gray-400 text-sm">No users found</div>
        )}
      </div>
    </div>
  )
}

// ── Stats tab ─────────────────────────────────────────────────────────────────

function StatsTab({ stats }: { stats: Stats }) {
  const { overview, boardsPerDay, usersPerDay, boardTypes, topUsers } = stats

  const totalBoardType = boardTypes.reduce((s, t) => s + t.count, 0)

  return (
    <div className="space-y-6">
      {/* Overview cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard icon={<Users size={18} />} label="Total Users" value={overview.totalUsers} color="teal" />
        <StatCard icon={<Layout size={18} />} label="Total Boards" value={overview.totalBoards} color="blue" />
        <StatCard icon={<Globe size={18} />} label="Public Boards" value={overview.publicBoards} color="green" />
        <StatCard icon={<Share2 size={18} />} label="Shared Boards" value={overview.sharedBoards} color="orange" />
        <StatCard icon={<Users size={18} />} label="Collab Boards" value={overview.collabBoards} color="purple" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={14} className="text-teal-500" />
            <p className="text-sm font-semibold text-gray-700">Boards Created (30d)</p>
          </div>
          <SparkBar data={boardsPerDay} color="#14b8a6" />
          <p className="text-xs text-gray-400 mt-1">{boardsPerDay.length} days with activity</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Users size={14} className="text-blue-500" />
            <p className="text-sm font-semibold text-gray-700">New Users (30d)</p>
          </div>
          <SparkBar data={usersPerDay} color="#3b82f6" />
          <p className="text-xs text-gray-400 mt-1">{usersPerDay.length} days with signups</p>
        </div>
      </div>

      {/* Board types + top users */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Board type breakdown */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm font-semibold text-gray-700 mb-3">Board Types</p>
          <div className="space-y-2">
            {boardTypes.map(t => (
              <div key={t.type}>
                <div className="flex justify-between text-xs text-gray-600 mb-0.5">
                  <span className="capitalize">{t.type}</span>
                  <span>{t.count} ({totalBoardType ? Math.round(t.count / totalBoardType * 100) : 0}%)</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${t.type === 'excalidraw' ? 'bg-teal-500' : 'bg-orange-400'}`}
                    style={{ width: `${totalBoardType ? (t.count / totalBoardType) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top users */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm font-semibold text-gray-700 mb-3">Top Users by Boards</p>
          <div className="space-y-2">
            {topUsers.slice(0, 7).map((u, i) => (
              <div key={u.userId} className="flex items-center gap-2">
                <span className="w-5 text-xs text-gray-400 text-right">{i + 1}</span>
                <div className="w-6 h-6 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-bold shrink-0">
                  {u.name[0]?.toUpperCase() || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-700 truncate">{u.name}</p>
                  <p className="text-[10px] text-gray-400 truncate">{u.email}</p>
                </div>
                <span className="text-xs font-bold text-teal-600 shrink-0">{u.boardCount}</span>
              </div>
            ))}
            {topUsers.length === 0 && <p className="text-xs text-gray-400">No data yet</p>}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<'users' | 'stats'>('users')

  const { data: users = [], isLoading: usersLoading, error: usersError } = useQuery<AdminUser[]>({
    queryKey: ['admin-users'],
    queryFn: () => api.get('/admin/users').then(r => r.data),
    retry: false,
  })

  const { data: stats, isLoading: statsLoading } = useQuery<Stats>({
    queryKey: ['admin-stats'],
    queryFn: () => api.get('/admin/stats').then(r => r.data),
    enabled: tab === 'stats',
    retry: false,
  })

  const updateUser = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.patch(`/admin/users/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-users'] }); toast.success('User updated') },
    onError: () => toast.error('Failed to update user'),
  })

  const deleteUser = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/users/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-users'] }); toast.success('User deleted') },
    onError: () => toast.error('Failed to delete user'),
  })

  if (usersError) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-5xl mb-4">🔒</div>
          <h2 className="text-lg font-semibold text-gray-800 mb-2">Admin Access Required</h2>
          <p className="text-sm text-gray-500 mb-4">You don't have permission to access this page.</p>
          <button onClick={() => navigate('/')} className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm hover:bg-teal-700">
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <button onClick={() => navigate('/')} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500">
            <ArrowLeft size={18} />
          </button>
          <div className="flex items-center gap-2">
            <Shield size={20} className="text-purple-600" />
            <h1 className="text-lg font-bold text-gray-800">Admin Portal</h1>
          </div>
          <div className="flex items-center gap-1 ml-4 border border-gray-200 rounded-lg p-0.5">
            <button
              onClick={() => setTab('users')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === 'users' ? 'bg-gray-100 text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}>
              <Users size={14} /> Users
              {!usersLoading && <span className="ml-0.5 text-xs bg-teal-100 text-teal-700 rounded-full px-1.5 py-0.5">{users.length}</span>}
            </button>
            <button
              onClick={() => setTab('stats')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === 'stats' ? 'bg-gray-100 text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}>
              <BarChart2 size={14} /> Analytics
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-6">
        {tab === 'users' && (
          usersLoading ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <UsersTab
              users={users}
              onUpdate={(id, data) => updateUser.mutate({ id, data })}
              onDelete={(id) => deleteUser.mutate(id)}
            />
          )
        )}

        {tab === 'stats' && (
          statsLoading || !stats ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <StatsTab stats={stats} />
          )
        )}
      </div>
    </div>
  )
}
