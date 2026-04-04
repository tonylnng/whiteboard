import { useCallback } from 'react'
import { Excalidraw } from '@excalidraw/excalidraw'
import type { ExcalidrawImperativeAPI, ExcalidrawElement, AppState, BinaryFiles } from '@excalidraw/excalidraw'
import '@excalidraw/excalidraw/index.css'

interface ExcalidrawBoardProps {
  initialData?: { elements: readonly ExcalidrawElement[]; appState?: Partial<AppState>; files?: BinaryFiles } | null
  onChange?: (elements: readonly ExcalidrawElement[], appState: AppState, files: BinaryFiles) => void
  onMount?: (api: ExcalidrawImperativeAPI) => void
  darkMode?: boolean
}

export default function ExcalidrawBoard({ initialData, onChange, onMount, darkMode }: ExcalidrawBoardProps) {
  const apiRef = useRef<ExcalidrawImperativeAPI | null>(null)

  const handleMount = useCallback((api: ExcalidrawImperativeAPI) => {
    apiRef.current = api
    onMount?.(api)
  }, [onMount])

  return (
    <div className="w-full h-full">
      <Excalidraw
        excalidrawAPI={handleMount}
        initialData={initialData ?? undefined}
        onChange={onChange}
        theme={darkMode ? 'dark' : 'light'}
        UIOptions={{
          canvasActions: {
            export: { saveFileToDisk: true },
            loadScene: true,
          },
        }}
      />
    </div>
  )
}
