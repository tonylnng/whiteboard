import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../lib/api'
import { useAuthStore } from '../stores/auth.store'
import { toast } from 'sonner'

const COLORS = [
  '#e03131', '#2f9e44', '#1971c2', '#f08c00',
  '#7048e8', '#0c8599', '#e8590c', '#5c940d',
  '#c2255c', '#3bc9db', '#74c0fc', '#a9e34b',
]

const EMOJIS = ['😊', '🐱', '🦊', '🐻', '🦁', '🐯', '🦄', '🐸', '🤖', '👻', '⭐', '🎨']

export default function JoinBoardPage() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const { accessToken, setAuth } = useAuthStore()
  const [error, setError] = useState('')
  const [step, setStep] = useState<'loading' | 'guest-form' | 'joining'>('loading')
  const [guestName, setGuestName] = useState('')
  const [selectedColor, setSelectedColor] = useState(COLORS[0])
  const [selectedEmoji, setSelectedEmoji] = useState(EMOJIS[0])
  const [boardName, setBoardName] = useState('')

  useEffect(() => {
    if (!token) { setError('無效的連結'); return }

    if (accessToken) {
      api.post(`/boards/join/${token}`)
        .then(({ data }) => navigate(`/board/${data.id}`, { replace: true }))
        .catch(() => setError('分享連結無效或已過期'))
      return
    }

    api.get(`/share/${token}`)
      .then(({ data }) => {
        setBoardName(data.name)
        setStep('guest-form')
      })
      .catch(() => setError('分享連結無效或已過期'))
  }, [token, accessToken])

  const handleGuestJoin = async () => {
    if (!guestName.trim()) { toast.error('請輸入你的名字'); return }
    setStep('joining')
    try {
      const displayName = `${selectedEmoji} ${guestName.trim()}`
      const { data } = await api.post('/auth/guest', { shareToken: token, name: displayName })
      sessionStorage.setItem('guestToken', data.accessToken)
      sessionStorage.setItem('guestUser', JSON.stringify(data.user))
      setAuth(data.accessToken, data.user)
      navigate(`/board/${data.boardId}`, { replace: true })
    } catch {
      toast.error('加入失敗，請重試')
      setStep('guest-form')
    }
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full">
          <div className="text-5xl mb-4">🔗</div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">連結無效</h2>
          <p className="text-gray-500 mb-6 text-sm">{error}</p>
          <button onClick={() => navigate('/')}
            className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-medium">
            返回首頁
          </button>
        </div>
      </div>
    )
  }

  if (step === 'loading' || step === 'joining') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4 animate-pulse">🎨</div>
          <p className="text-gray-500 font-medium">{step === 'joining' ? '正在加入...' : '載入中...'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-blue-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-md overflow-hidden">
        <div className="bg-gradient-to-r from-teal-600 to-blue-600 px-6 py-5 text-white">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-3xl">🎨</span>
            <div>
              <p className="text-sm opacity-80">你被邀請加入</p>
              <h2 className="font-bold text-lg">{boardName || '協作白板'}</h2>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-5">
          <div className="flex justify-center">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-2xl shadow-md border-4 border-white ring-2"
              style={{ backgroundColor: selectedColor }}
            >
              {selectedEmoji}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">你的名字</label>
            <input
              type="text"
              value={guestName}
              onChange={e => setGuestName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleGuestJoin()}
              placeholder="輸入名字，例如：小明"
              maxLength={20}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-gray-800"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">選擇頭像</label>
            <div className="grid grid-cols-6 gap-2">
              {EMOJIS.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => setSelectedEmoji(emoji)}
                  className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center transition-all ${
                    selectedEmoji === emoji
                      ? 'bg-teal-100 ring-2 ring-teal-500 scale-110'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">選擇顏色</label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map(color => (
                <button
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  className={`w-8 h-8 rounded-full transition-transform ${
                    selectedColor === color ? 'scale-125 ring-2 ring-offset-2 ring-gray-400' : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <button
            onClick={handleGuestJoin}
            disabled={!guestName.trim()}
            className="w-full py-3 bg-teal-600 text-white rounded-xl font-semibold text-base hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            以訪客身份加入 →
          </button>

          <p className="text-center text-xs text-gray-400">
            已有帳號？<a href="/login" className="text-teal-600 hover:underline">登入</a>
          </p>
        </div>
      </div>
    </div>
  )
}
