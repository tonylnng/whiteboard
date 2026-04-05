import { useState } from 'react'

export interface DrawingStyle {
  strokeWidth: number       // 1 | 2 | 4
  strokeStyle: 'solid' | 'dashed' | 'dotted'
  fillStyle: 'solid' | 'hachure' | 'cross-hatch' | 'none'
  roughness: number         // 0 = architect, 1 = artist, 2 = cartoonist
  roundness: 'sharp' | 'round'
  opacity: number           // 10-100
}

// Matches Excalidraw's own defaults
export const DEFAULT_DRAWING_STYLE: DrawingStyle = {
  strokeWidth: 2,
  strokeStyle: 'solid',
  fillStyle: 'hachure',
  roughness: 1,
  roundness: 'sharp',
  opacity: 100,
}

const STORAGE_KEY = 'wb_drawing_style'

export function useDrawingStyle() {
  const [style, setStyleState] = useState<DrawingStyle>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) return { ...DEFAULT_DRAWING_STYLE, ...JSON.parse(saved) }
    } catch {}
    return DEFAULT_DRAWING_STYLE
  })

  const setStyle = (next: Partial<DrawingStyle>) => {
    setStyleState(prev => {
      const updated = { ...prev, ...next }
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)) } catch {}
      return updated
    })
  }

  const resetStyle = () => {
    setStyleState(DEFAULT_DRAWING_STYLE)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_DRAWING_STYLE)) } catch {}
  }

  return { style, setStyle, resetStyle }
}

/** Apply a DrawingStyle to an Excalidraw element overrides object */
export function applyStyle(style: DrawingStyle, extraOverrides: Record<string, any> = {}): Record<string, any> {
  return {
    strokeWidth: style.strokeWidth,
    strokeStyle: style.strokeStyle,
    roughness: style.roughness,
    opacity: style.opacity,
    roundness: style.roundness === 'round' ? { type: 3 } : null,
    ...extraOverrides,
  }
}
