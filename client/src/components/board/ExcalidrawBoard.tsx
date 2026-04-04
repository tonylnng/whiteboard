import { useCallback } from 'react'
import { Excalidraw } from '@excalidraw/excalidraw'
import '@excalidraw/excalidraw/index.css'

interface ExcalidrawBoardProps {
  initialData?: any
  onChange?: (elements: readonly any[], appState: any, files: any) => void
  onMount?: (api: any) => void
  darkMode?: boolean
}

export default function ExcalidrawBoard({ initialData, onChange, onMount, darkMode }: ExcalidrawBoardProps) {
  const handleMount = useCallback((api: any) => {
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
