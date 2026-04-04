import { Component, ReactNode } from 'react'

interface State { hasError: boolean; error?: Error }
interface Props { children: ReactNode; onReset?: () => void }

export default class ExcalidrawErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: any) {
    console.error('[ExcalidrawErrorBoundary] caught:', error, info)
  }

  reset = () => {
    this.setState({ hasError: false, error: undefined })
    this.props.onReset?.()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-500 bg-white">
          <div className="text-4xl">⚠️</div>
          <p className="font-medium text-gray-700">白板遇到了問題</p>
          <p className="text-sm text-gray-400 max-w-xs text-center">
            {this.state.error?.message || '未知錯誤'}
          </p>
          <button
            onClick={this.reset}
            className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700"
          >
            重試
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
