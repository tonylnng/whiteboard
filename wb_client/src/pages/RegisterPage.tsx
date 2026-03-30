import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import api from '../lib/api'
import { useAuthStore } from '../stores/auth.store'

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const { setAuth } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await api.post('/auth/register', form)
      setAuth(data.accessToken, data.user)
      navigate('/')
    } catch (err: any) {
      toast.error(err.response?.data?.message || '註冊失敗')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-blue-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-4xl mb-2">🎨</div>
          <h1 className="text-2xl font-bold text-gray-800">創建帳號</h1>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {[
            { label: '名稱', key: 'name', type: 'text' },
            { label: 'Email', key: 'email', type: 'email' },
            { label: '密碼', key: 'password', type: 'password' },
          ].map(({ label, key, type }) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
              <input type={type} value={(form as any)[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
          ))}
          <button type="submit" disabled={loading}
            className="w-full py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 font-medium transition-colors">
            {loading ? '註冊中...' : '註冊'}
          </button>
        </form>
        <p className="text-center text-sm text-gray-500 mt-4">
          已有帳號？<Link to="/login" className="text-teal-600 hover:underline">立即登入</Link>
        </p>
      </div>
    </div>
  )
}
