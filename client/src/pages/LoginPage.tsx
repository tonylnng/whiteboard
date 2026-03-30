import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import api from '../lib/api'
import { useAuthStore } from '../stores/auth.store'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { setAuth } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await api.post('/auth/login', { email, password })
      setAuth(data.accessToken, data.user)

      // Check for pending share token
      const pendingToken = sessionStorage.getItem('pendingShareToken')
      if (pendingToken) {
        sessionStorage.removeItem('pendingShareToken')
        navigate(`/board/join/${pendingToken}`, { replace: true })
      } else {
        navigate('/')
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || '登入失敗')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-blue-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-4xl mb-2">🎨</div>
          <h1 className="text-2xl font-bold text-gray-800">Whiteboard</h1>
          <p className="text-gray-500 mt-1 text-sm">登入你的帳號</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">密碼</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 font-medium transition-colors">
            {loading ? '登入中...' : '登入'}
          </button>
        </form>
        <p className="text-center text-sm text-gray-500 mt-4">
          沒有帳號？<Link to="/register" className="text-teal-600 hover:underline font-medium">立即註冊</Link>
        </p>
      </div>
    </div>
  )
}
