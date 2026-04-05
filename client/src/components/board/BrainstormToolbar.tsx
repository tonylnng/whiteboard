import { useState, useEffect, useRef } from 'react'
import { Socket } from 'socket.io-client'
import { toast } from 'sonner'
import {
  Vote, Timer, LayoutTemplate, EyeOff, Brain,
  Play, Square, Lock, Unlock, Crosshair, X, Settings2
} from 'lucide-react'
import { useDrawingStyle, applyStyle } from '../../hooks/useDrawingStyle'
import DrawingStylePanel from './DrawingStylePanel'

interface Props {
  excalidrawApi: any | null
  socket: Socket | null
  isFacilitator: boolean
  sessionState: SessionState | null
  onSessionUpdate: (state: Partial<SessionState>) => void
  voteMap: Record<string, number>
  myVotesRemaining: number
}

interface SessionState {
  voting: { votes: Record<string, string[]>; userVoteCount: Record<string, number>; maxVotes: number; active: boolean }
  timer: { endTime: number | null; duration: number; active: boolean }
  anonymousMode: boolean
  facilitatorId: string | null
  spotlight: any
  cursorsLocked: boolean
}

// ── Excalidraw element helpers ──────────────────────────────────────────────

function mkId() { return Math.random().toString(36).substr(2, 9) }

function mkBase(overrides: Record<string, any>): any {
  return {
    id: mkId(),
    angle: 0,
    strokeColor: '#374151',
    backgroundColor: 'transparent',
    fillStyle: 'hachure',
    strokeWidth: 1,
    strokeStyle: 'solid',
    roughness: 0,
    opacity: 100,
    seed: Math.floor(Math.random() * 100000),
    versionNonce: Math.floor(Math.random() * 100000),
    version: 1,
    isDeleted: false,
    boundElements: null,
    updated: Date.now(),
    locked: false,
    groupIds: [],
    frameId: null,
    link: null,
    ...overrides,
  }
}

// Style-aware element factories — style is injected at call time
let _currentStyle: ReturnType<typeof import('../../hooks/useDrawingStyle').useDrawingStyle>['style'] | null = null

/**
 * mkShape — a SINGLE shape element with text baked in via containerId binding.
 * This produces one movable unit instead of a separate rect + text element.
 */
function mkShape(
  type: 'rectangle' | 'ellipse' | 'diamond',
  x: number, y: number, w: number, h: number,
  bg: string, label: string,
  textColor = '#1f2937', fontSize = 13, stroke?: string
): any[] {
  const shapeId = mkId()
  const textId = mkId()
  const s = _currentStyle
  const fillStyle = s?.fillStyle ?? 'hachure'
  const effectiveBg = fillStyle === 'none' ? 'transparent' : bg

  const shape = mkBase({
    ...(s ? applyStyle(s) : {}),
    id: shapeId,
    type, x, y, width: w, height: h,
    backgroundColor: effectiveBg,
    fillStyle,
    strokeColor: stroke || '#374151',
    boundElements: [{ type: 'text', id: textId }],
  })

  const safeText = label ?? ''
  const lines = Math.max(1, (safeText.match(/\n/g) || []).length + 1)
  const text = mkBase({
    id: textId,
    type: 'text',
    x: x + 8, y: y + 8,
    width: w - 16, height: Math.ceil(fontSize * 1.35 * lines),
    text: safeText, originalText: safeText,
    fontSize, fontFamily: 1,
    textAlign: 'center', verticalAlign: 'middle',
    baseline: Math.ceil(fontSize * 0.8),
    containerId: shapeId, autoResize: true, lineHeight: 1.35,
    strokeColor: textColor, backgroundColor: 'transparent', fillStyle: 'hachure',
    strokeWidth: 1, strokeStyle: 'solid', roughness: 0, opacity: 100,
  })

  return [shape, text]
}

/** Standalone floating text (headers, axis labels). Not part of any shape. */
function mkText(x: number, y: number, w: number, text: string, fontSize = 14, color = '#374151', align = 'center'): any {
  const safeText = text ?? ''
  const lines = Math.max(1, (safeText.match(/\n/g) || []).length + 1)
  return mkBase({
    type: 'text', x, y, width: w, height: Math.ceil(fontSize * 1.25 * lines),
    text: safeText, originalText: safeText, fontSize, fontFamily: 1,
    textAlign: align, verticalAlign: 'top', baseline: Math.ceil(fontSize * 0.8),
    containerId: null, autoResize: true, lineHeight: 1.25,
    strokeColor: color, backgroundColor: 'transparent', fillStyle: 'hachure',
    strokeWidth: 1, strokeStyle: 'solid', roughness: 0, opacity: 100,
  })
}

/** Shorthand for mkShape('rectangle', ...) */
function mkBox(x: number, y: number, w: number, h: number, bg: string, label: string, textColor = '#1f2937', fontSize = 13, stroke?: string): any[] {
  return mkShape('rectangle', x, y, w, h, bg, label, textColor, fontSize, stroke)
}

/** Plain rectangle with no text (for grid cells, backgrounds) */
function mkRect(x: number, y: number, w: number, h: number, bg: string, stroke?: string): any {
  const s = _currentStyle
  const fillStyle = s?.fillStyle ?? 'hachure'
  return mkBase({
    ...(s ? applyStyle(s) : {}),
    type: 'rectangle', x, y, width: w, height: h,
    backgroundColor: fillStyle === 'none' ? 'transparent' : bg,
    fillStyle,
    strokeColor: stroke || '#374151',
    boundElements: null,
  })
}

function getCenter(api: any): { cx: number; cy: number } {
  try {
    const appState = api.getAppState()
    const zoom = appState.zoom?.value || 1
    return {
      cx: (window.innerWidth / 2 - appState.scrollX) / zoom,
      cy: (window.innerHeight / 2 - appState.scrollY) / zoom,
    }
  } catch {
    return { cx: 0, cy: 0 }
  }
}

// Color palette
const C = {
  yellow: '#fef9c3', yellowDark: '#f59e0b',
  green: '#dcfce7', greenDark: '#16a34a',
  blue: '#dbeafe', blueDark: '#2563eb',
  orange: '#ffedd5', orangeDark: '#ea580c',
  violet: '#ede9fe', violetDark: '#7c3aed',
  red: '#fee2e2', redDark: '#dc2626',
  grey: '#f3f4f6', greyDark: '#6b7280',
  teal: '#ccfbf1', tealDark: '#0d9488',
  pink: '#fce7f3', pinkDark: '#db2777',
  indigo: '#e0e7ff', indigoDark: '#4338ca',
  black: '#1f2937', white: '#ffffff',
  lightGreen: '#d1fae5', lightBlue: '#e0f2fe',
}

// ── Templates ────────────────────────────────────────────────────────────────

const TEMPLATES = [
  // ── BRAINSTORM ────────────────────────────────────────────────────────────
  {
    id: 'hmw', category: 'brainstorm', name: 'HMW (How Might We)', icon: '💡',
    description: 'Brainstorm with "How Might We..." prompts',
    create: (api: any) => {
      const { cx, cy } = getCenter(api); const els: any[] = []
      els.push(mkText(cx - 220, cy - 300, 440, '💡 How Might We...', 32, '#1f2937'))
      const zones = [
        { label: 'Problem Definition\nHow Might We...', bg: C.yellow, dx: -310 },
        { label: 'Solution Ideas\n(free brainstorm)', bg: C.green, dx: 0 },
        { label: 'Best Ideas\n(voted & selected)', bg: C.blue, dx: 310 },
      ]
      zones.forEach(z => { els.push(...mkBox(cx + z.dx - 140, cy - 220, 280, 380, z.bg, z.label, C.black)) })
      return els
    },
  },
  {
    id: 'swot', category: 'strategy', name: 'SWOT Analysis', icon: '📊',
    description: 'Strengths, Weaknesses, Opportunities, Threats',
    create: (api: any) => {
      const { cx, cy } = getCenter(api); const els: any[] = []
      els.push(mkText(cx - 220, cy - 320, 440, '📊 SWOT Analysis', 32, '#1f2937'))
      const q = [
        { label: '💪 Strengths', bg: C.green, dx: -230, dy: -240 },
        { label: '⚠️ Weaknesses', bg: C.red, dx: 20, dy: -240 },
        { label: '🌟 Opportunities', bg: C.blue, dx: -230, dy: 20 },
        { label: '⚡ Threats', bg: C.orange, dx: 20, dy: 20 },
      ]
      q.forEach(item => { els.push(...mkBox(cx + item.dx, cy + item.dy, 240, 240, item.bg, item.label, C.black, 13)) })
      return els
    },
  },
  {
    id: '4ls', category: 'retro', name: '4Ls Retrospective', icon: '🔄',
    description: 'Liked / Learned / Lacked / Longed For',
    create: (api: any) => {
      const { cx, cy } = getCenter(api); const els: any[] = []
      els.push(mkText(cx - 260, cy - 320, 520, '🔄 4Ls Retrospective', 32, '#1f2937'))
      const zones = [
        { label: '❤️ Liked', bg: C.green, dx: -520 },
        { label: '📚 Learned', bg: C.blue, dx: -170 },
        { label: '😕 Lacked', bg: C.orange, dx: 180 },
        { label: '✨ Longed For', bg: C.violet, dx: 530 },
      ]
      zones.forEach(z => { els.push(...mkBox(cx + z.dx - 165, cy - 260, 330, 320, z.bg, z.label, C.black)) })
      return els
    },
  },
  {
    id: 'start-stop-continue', category: 'retro', name: 'Start / Stop / Continue', icon: '▶️',
    description: 'Action reflection framework',
    create: (api: any) => {
      const { cx, cy } = getCenter(api); const els: any[] = []
      els.push(mkText(cx - 240, cy - 300, 480, '▶️ Start / Stop / Continue', 28, '#1f2937'))
      const zones = [
        { label: '🟢 Start', bg: C.green, dx: -290 },
        { label: '🔴 Stop', bg: C.red, dx: 0 },
        { label: '🔵 Continue', bg: C.blue, dx: 290 },
      ]
      zones.forEach(z => { els.push(...mkBox(cx + z.dx - 130, cy - 240, 260, 380, z.bg, z.label, C.black)) })
      return els
    },
  },
  {
    id: 'rose-thorn-bud', category: 'retro', name: 'Rose / Thorn / Bud', icon: '🌹',
    description: 'Positives, challenges, potential',
    create: (api: any) => {
      const { cx, cy } = getCenter(api); const els: any[] = []
      els.push(mkText(cx - 200, cy - 300, 400, '🌹 Rose / Thorn / Bud', 28, '#1f2937'))
      const zones = [
        { label: '🌹 Rose\nPositives, what worked', bg: C.pink, dx: -290 },
        { label: '🌵 Thorn\nChallenges, issues', bg: C.orange, dx: 0 },
        { label: '🌱 Bud\nPotential, opportunities', bg: C.green, dx: 290 },
      ]
      zones.forEach(z => { els.push(...mkBox(cx + z.dx - 130, cy - 240, 260, 380, z.bg, z.label, C.black)) })
      return els
    },
  },
  // ── AGILE ─────────────────────────────────────────────────────────────────
  {
    id: 'pi-planning', category: 'agile', name: 'PI Planning Board', icon: '🚂',
    description: 'SAFe Program Increment Planning',
    create: (api: any) => {
      const { cx, cy } = getCenter(api); const els: any[] = []
      els.push(mkText(cx - 320, cy - 480, 640, '🚂 PI Planning Board', 28, '#1f2937'))
      const iters = ['Iteration 1', 'Iteration 2', 'Iteration 3', 'Iteration 4', 'IP Sprint']
      const iterColors = [C.blue, C.green, C.violet, C.orange, C.grey]
      iters.forEach((iter, i) => { els.push(...mkBox(cx - 600 + i * 250, cy - 420, 230, 50, iterColors[i], iter, C.black, 13)) })
      const teams = ['Team Alpha', 'Team Beta', 'Team Gamma', 'Team Delta']
      teams.forEach((team, t) => {
        els.push(...mkBox(cx - 860, cy - 360 + t * 170, 240, 150, C.grey, team, C.black, 14))
        iters.forEach((_, i) => { els.push(mkRect(cx - 600 + i * 250, cy - 360 + t * 170, 230, 150, C.white, '#d1d5db')) })
      })
      els.push(...mkBox(cx - 600, cy + 340, 600, 130, C.blue, 'PI Objectives', C.black, 14))
      els.push(...mkBox(cx + 30, cy + 340, 600, 130, C.red, 'ROAM Risks', C.black, 14))
      return els
    },
  },
  {
    id: 'roam-risk', category: 'agile', name: 'ROAM Risk Board', icon: '⚠️',
    description: 'Resolved / Owned / Accepted / Mitigated',
    create: (api: any) => {
      const { cx, cy } = getCenter(api); const els: any[] = []
      els.push(mkText(cx - 220, cy - 300, 440, '⚠️ ROAM Risk Board', 28, '#1f2937'))
      const q = [
        { label: '✅ Resolved', bg: C.green, dx: -280, dy: -240 },
        { label: '👤 Owned', bg: C.blue, dx: 20, dy: -240 },
        { label: '🤝 Accepted', bg: C.orange, dx: -280, dy: 20 },
        { label: '🛡️ Mitigated', bg: C.yellow, dx: 20, dy: 20 },
      ]
      q.forEach(item => { els.push(...mkBox(cx + item.dx, cy + item.dy, 280, 240, item.bg, item.label, C.black)) })
      return els
    },
  },
  {
    id: 'art-kanban', category: 'agile', name: 'ART Kanban', icon: '🔄',
    description: 'SAFe Agile Release Train Feature Flow',
    create: (api: any) => {
      const { cx, cy } = getCenter(api); const els: any[] = []
      els.push(mkText(cx - 320, cy - 360, 640, '🔄 ART Kanban', 28, '#1f2937'))
      const cols = [
        { label: 'Funnel', bg: C.grey }, { label: 'Analysis', bg: C.blue },
        { label: 'Implementation', bg: C.violet }, { label: 'Review', bg: C.orange },
        { label: 'Deploy', bg: C.green }, { label: 'Done', bg: C.teal },
      ]
      cols.forEach((col, i) => {
        els.push(...mkBox(cx - 760 + i * 260, cy - 300, 245, 50, col.bg, col.label, C.black, 12))
        els.push(mkRect(cx - 760 + i * 260, cy - 240, 245, 420, C.white, '#d1d5db'))
      })
      return els
    },
  },
  {
    id: 'user-story-map', category: 'agile', name: 'User Story Map', icon: '🗺️',
    description: 'Activities → Tasks → User Stories',
    create: (api: any) => {
      const { cx, cy } = getCenter(api); const els: any[] = []
      els.push(mkText(cx - 300, cy - 420, 600, '🗺️ User Story Map', 28, '#1f2937'))
      els.push(mkText(cx - 540, cy - 360, 300, 'BACKBONE (User Activities)', 13, C.blueDark, 'left'))
      const activities = ['Search', 'Browse', 'Order', 'Pay', 'Track']
      activities.forEach((act, i) => { els.push(...mkBox(cx - 540 + i * 230, cy - 320, 215, 65, C.blue, act, C.black, 14)) })
      els.push(mkText(cx - 540, cy - 240, 300, 'TASKS (User Tasks)', 13, C.violetDark, 'left'))
      activities.forEach((_, i) => { els.push(...mkBox(cx - 540 + i * 230, cy - 205, 215, 65, C.violet, 'Task', C.black, 13)) })
      const releases = [{ label: 'Release 1', bg: C.green }, { label: 'Release 2', bg: C.yellow }, { label: 'Release 3', bg: C.grey }]
      releases.forEach((rel, r) => { els.push(...mkBox(cx - 560, cy - 120 + r * 150, 1095, 140, rel.bg, rel.label, C.black, 14)) })
      return els
    },
  },
  {
    id: 'sailboat-retro', category: 'retro', name: 'Sailboat Retrospective', icon: '⛵',
    description: 'Wind, Anchor, Reef, Island',
    create: (api: any) => {
      const { cx, cy } = getCenter(api); const els: any[] = []
      els.push(mkText(cx - 300, cy - 380, 600, '⛵ Sailboat Retrospective', 28, '#1f2937'))
      const zones = [
        { label: '🌴 Island\nGoal / Vision', bg: C.green, dx: 200, dy: -280 },
        { label: '💨 Wind\nWhat drives us', bg: C.blue, dx: -420, dy: -180 },
        { label: '⚓ Anchor\nWhat slows us down', bg: C.red, dx: 200, dy: -60 },
        { label: '🪨 Reef\nRisks ahead', bg: C.orange, dx: -420, dy: 100 },
      ]
      zones.forEach(z => { els.push(...mkBox(cx + z.dx, cy + z.dy, 320, 200, z.bg, z.label, C.black)) })
      return els
    },
  },
  // ── STRATEGY ──────────────────────────────────────────────────────────────
  {
    id: 'business-model-canvas', category: 'strategy', name: 'Business Model Canvas', icon: '🏢',
    description: '9-block business model framework',
    create: (api: any) => {
      const { cx, cy } = getCenter(api); const els: any[] = []
      els.push(mkText(cx - 360, cy - 480, 720, '🏢 Business Model Canvas', 28, '#1f2937'))
      const cells = [
        { label: '🤝 Key Partners', bg: C.orange, x: cx - 680, y: cy - 400, w: 240, h: 290 },
        { label: '⚙️ Key Activities', bg: C.orange, x: cx - 420, y: cy - 400, w: 240, h: 135 },
        { label: '🔑 Key Resources', bg: C.orange, x: cx - 420, y: cy - 250, w: 240, h: 135 },
        { label: '💎 Value Propositions', bg: C.blue, x: cx - 160, y: cy - 400, w: 280, h: 290 },
        { label: '💬 Customer Relationships', bg: C.green, x: cx + 140, y: cy - 400, w: 240, h: 135 },
        { label: '📦 Channels', bg: C.green, x: cx + 140, y: cy - 250, w: 240, h: 135 },
        { label: '👥 Customer Segments', bg: C.green, x: cx + 400, y: cy - 400, w: 240, h: 290 },
        { label: '💸 Cost Structure', bg: C.red, x: cx - 680, y: cy - 90, w: 520, h: 130 },
        { label: '💰 Revenue Streams', bg: C.teal, x: cx - 140, y: cy - 90, w: 780, h: 130 },
      ]
      cells.forEach(cell => { els.push(...mkBox(cell.x, cell.y, cell.w, cell.h, cell.bg, cell.label, C.black, 12)) })
      return els
    },
  },
  {
    id: 'lean-canvas', category: 'strategy', name: 'Lean Canvas', icon: '🚀',
    description: 'Lean startup business model',
    create: (api: any) => {
      const { cx, cy } = getCenter(api); const els: any[] = []
      els.push(mkText(cx - 280, cy - 480, 560, '🚀 Lean Canvas', 28, '#1f2937'))
      const cells = [
        { label: '❗ Problem', bg: C.red, x: cx - 680, y: cy - 400, w: 240, h: 135 },
        { label: '💡 Solution', bg: C.green, x: cx - 420, y: cy - 400, w: 240, h: 135 },
        { label: '🌟 Unique Value Proposition', bg: C.blue, x: cx - 160, y: cy - 400, w: 280, h: 290 },
        { label: '🏆 Unfair Advantage', bg: C.violet, x: cx + 140, y: cy - 400, w: 240, h: 135 },
        { label: '👥 Customer Segments', bg: C.green, x: cx + 400, y: cy - 400, w: 240, h: 290 },
        { label: '📌 Existing Alternatives', bg: C.red, x: cx - 680, y: cy - 250, w: 240, h: 135 },
        { label: '📊 Key Metrics', bg: C.orange, x: cx - 420, y: cy - 250, w: 240, h: 135 },
        { label: '📣 Channels', bg: C.green, x: cx + 140, y: cy - 250, w: 240, h: 135 },
        { label: '💸 Cost Structure', bg: C.red, x: cx - 680, y: cy - 90, w: 520, h: 120 },
        { label: '💰 Revenue Streams', bg: C.teal, x: cx - 140, y: cy - 90, w: 780, h: 120 },
      ]
      cells.forEach(cell => { els.push(...mkBox(cell.x, cell.y, cell.w, cell.h, cell.bg, cell.label, C.black, 12)) })
      return els
    },
  },
  {
    id: 'okr-board', category: 'strategy', name: 'OKR Board', icon: '🎯',
    description: 'Objectives & Key Results',
    create: (api: any) => {
      const { cx, cy } = getCenter(api); const els: any[] = []
      els.push(mkText(cx - 200, cy - 400, 400, '🎯 OKR Board', 28, '#1f2937'))
      for (let o = 0; o < 3; o++) {
        els.push(...mkBox(cx - 510 + o * 360, cy - 350, 330, 65, C.blue, `Objective ${o + 1}`, C.black, 15))
        const krColors = [C.green, C.yellow, C.orange]
        for (let k = 0; k < 3; k++) {
          els.push(...mkBox(cx - 510 + o * 360, cy - 270 + k * 140, 330, 120, krColors[k], `KR${k + 1}:`, C.black, 13))
        }
      }
      return els
    },
  },
  {
    id: 'impact-effort', category: 'strategy', name: 'Impact vs Effort Matrix', icon: '📐',
    description: 'Priority decision 2×2 matrix',
    create: (api: any) => {
      const { cx, cy } = getCenter(api); const els: any[] = []
      els.push(mkText(cx - 280, cy - 420, 560, '📐 Impact vs Effort Matrix', 28, '#1f2937'))
      const q = [
        { label: '⭐ Quick Wins\nHigh impact × Low effort\nDo it now!', bg: C.green, dx: -320, dy: -340 },
        { label: '🎯 Big Bets\nHigh impact × High effort\nPlan it', bg: C.blue, dx: 20, dy: -340 },
        { label: '🌱 Fill-ins\nLow impact × Low effort\nDo if time allows', bg: C.yellow, dx: -320, dy: 10 },
        { label: '🚫 Time Sinks\nLow impact × High effort\nAvoid!', bg: C.red, dx: 20, dy: 10 },
      ]
      q.forEach(item => { els.push(...mkBox(cx + item.dx, cy + item.dy, 300, 300, item.bg, item.label, C.black)) })
      els.push(mkText(cx - 150, cy + 330, 520, '← Low effort ────────── High effort →', 13, '#6b7280'))
      return els
    },
  },
  // ── DESIGN THINKING ───────────────────────────────────────────────────────
  {
    id: 'empathy-map', category: 'design', name: 'Empathy Map', icon: '❤️',
    description: 'Says / Thinks / Does / Feels',
    create: (api: any) => {
      const { cx, cy } = getCenter(api); const els: any[] = []
      els.push(mkText(cx - 220, cy - 420, 440, '❤️ Empathy Map', 28, '#1f2937'))
      els.push(mkBase({ type: 'ellipse', x: cx - 90, y: cy - 90, width: 180, height: 180, backgroundColor: C.grey, fillStyle: 'solid', strokeColor: '#374151', strokeWidth: 1, roughness: 0, opacity: 100, boundElements: null }))
      els.push(mkText(cx - 90, cy - 20, 180, '👤 USER', 16, C.black))
      const quadrants = [
        { label: '💬 SAYS\nQuoted statements', bg: C.blue, dx: -370, dy: -300 },
        { label: '🧠 THINKS\nInner thoughts', bg: C.violet, dx: 80, dy: -300 },
        { label: '🖐️ DOES\nActions & behaviors', bg: C.green, dx: -370, dy: 80 },
        { label: '😊 FEELS\nEmotions & feelings', bg: C.orange, dx: 80, dy: 80 },
      ]
      quadrants.forEach(q => { els.push(...mkBox(cx + q.dx, cy + q.dy, 280, 240, q.bg, q.label, C.black)) })
      els.push(...mkBox(cx - 680, cy - 90, 290, 180, C.red, '😫 PAINS\nFears, frustrations', C.black, 13))
      els.push(...mkBox(cx + 380, cy - 90, 290, 180, C.green, '🌟 GAINS\nWins, joys, goals', C.black, 13))
      return els
    },
  },
  {
    id: 'user-journey', category: 'design', name: 'User Journey Map', icon: '🗺️',
    description: 'Stage / Action / Emotion / Pain point',
    create: (api: any) => {
      const { cx, cy } = getCenter(api); const els: any[] = []
      els.push(mkText(cx - 340, cy - 490, 680, '🗺️ User Journey Map', 28, '#1f2937'))
      const stages = ['Awareness', 'Consideration', 'Decision', 'Retention', 'Advocacy']
      const rows = [
        { label: '🎬 Actions', bg: C.blue }, { label: '💭 Thoughts', bg: C.violet },
        { label: '😊 Emotions', bg: C.orange }, { label: '😫 Pain Points', bg: C.red },
        { label: '💡 Opportunities', bg: C.green },
      ]
      stages.forEach((stage, i) => { els.push(...mkBox(cx - 620 + i * 260, cy - 430, 245, 55, C.black, stage, C.white, 12)) })
      rows.forEach((row, r) => {
        els.push(...mkBox(cx - 880, cy - 365 + r * 120, 240, 110, row.bg, row.label, C.black, 12))
        stages.forEach((_, i) => { els.push(mkRect(cx - 620 + i * 260, cy - 365 + r * 120, 245, 110, C.white, '#d1d5db')) })
      })
      return els
    },
  },
  {
    id: 'crazy-8s', category: 'brainstorm', name: 'Crazy 8s', icon: '🎲',
    description: '8 ideas in 8 minutes — fast divergent thinking',
    create: (api: any) => {
      const { cx, cy } = getCenter(api); const els: any[] = []
      els.push(mkText(cx - 360, cy - 480, 720, '🎲 Crazy 8s — 8 Ideas in 8 Minutes', 28, '#1f2937'))
      const labels = ['Idea 1', 'Idea 2', 'Idea 3', 'Idea 4', 'Idea 5', 'Idea 6', 'Idea 7', 'Idea 8']
      labels.forEach((label, i) => {
        const col = i % 4; const row = Math.floor(i / 4)
        els.push(...mkBox(cx - 660 + col * 340, cy - 400 + row * 360, 320, 340, C.grey, label, C.black, 14))
      })
      return els
    },
  },
  {
    id: 'five-whys', category: 'brainstorm', name: '5 Whys', icon: '❓',
    description: 'Root cause analysis',
    create: (api: any) => {
      const { cx, cy } = getCenter(api); const els: any[] = []
      els.push(mkText(cx - 200, cy - 420, 400, '❓ 5 Whys Analysis', 28, '#1f2937'))
      const levels = ['Problem Statement', 'Why 1?', 'Why 2?', 'Why 3?', 'Why 4?', 'Root Cause (Why 5?)']
      const colors = [C.red, C.orange, C.yellow, C.green, C.blue, C.violet]
      levels.forEach((label, i) => { els.push(...mkBox(cx - 400, cy - 360 + i * 110, 800, 90, colors[i], label, C.black, 14)) })
      return els
    },
  },
  {
    id: 'raci', category: 'strategy', name: 'RACI Matrix', icon: '📋',
    description: 'Responsibility assignment matrix',
    create: (api: any) => {
      const { cx, cy } = getCenter(api); const els: any[] = []
      els.push(mkText(cx - 280, cy - 440, 560, '📋 RACI Matrix', 28, '#1f2937'))
      const roles = ['Stakeholder 1', 'Stakeholder 2', 'Stakeholder 3', 'Stakeholder 4']
      const tasks = ['Task 1', 'Task 2', 'Task 3', 'Task 4', 'Task 5']
      els.push(...mkBox(cx - 620, cy - 380, 200, 50, C.grey, 'Task / Role', C.black, 13))
      roles.forEach((role, i) => { els.push(...mkBox(cx - 400 + i * 210, cy - 380, 200, 50, C.blue, role, C.black, 12)) })
      tasks.forEach((task, t) => {
        els.push(...mkBox(cx - 620, cy - 320 + t * 100, 200, 90, C.grey, task, C.black, 13))
        roles.forEach((_, i) => { els.push(mkRect(cx - 400 + i * 210, cy - 320 + t * 100, 200, 90, C.white, '#d1d5db')) })
      })
      const legend = [
        { label: 'R = Responsible', bg: C.red }, { label: 'A = Accountable', bg: C.orange },
        { label: 'C = Consulted', bg: C.yellow }, { label: 'I = Informed', bg: C.blue },
      ]
      legend.forEach((item, i) => { els.push(...mkBox(cx - 620 + i * 210, cy + 210, 200, 40, item.bg, item.label, C.black, 12)) })
      return els
    },
  },
]

// ── Timer display ─────────────────────────────────────────────────────────

function TimerDisplay({ endTime, onStop, isFacilitator }: { endTime: number; onStop: () => void; isFacilitator: boolean }) {
  const [remaining, setRemaining] = useState(Math.max(0, Math.ceil((endTime - Date.now()) / 1000)))
  const [bigNum, setBigNum] = useState<number | null>(null)
  const [showDone, setShowDone] = useState(false)
  const toastedRef = useRef(false)

  useEffect(() => {
    const interval = setInterval(() => {
      const r = Math.max(0, Math.ceil((endTime - Date.now()) / 1000))
      setRemaining(r)
      if (r <= 3 && r > 0) { setBigNum(r); setShowDone(false) }
      else if (r === 0) {
        setBigNum(null)
        if (!toastedRef.current) {
          toastedRef.current = true; setShowDone(true)
          toast('⏰ Time\'s up!', { duration: 4000 })
          setTimeout(() => setShowDone(false), 2000)
        }
        clearInterval(interval)
      } else { setBigNum(null); setShowDone(false) }
    }, 250)
    return () => clearInterval(interval)
  }, [endTime])

  const mins = Math.floor(remaining / 60)
  const secs = remaining % 60
  const isUrgent = remaining <= 30

  return (
    <>
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-mono font-bold ${isUrgent ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-teal-50 text-teal-700'}`}>
        <Timer size={14} />
        {mins}:{secs.toString().padStart(2, '0')}
        {isFacilitator && (
          <button onClick={onStop} className="ml-1 p-0.5 hover:bg-red-200 rounded"><Square size={10} /></button>
        )}
      </div>
      {bigNum !== null && (
        <div key={`big-${bigNum}`} style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.55)', pointerEvents: 'none', animation: 'countdown-pop 0.9s ease-out forwards' }}>
          <div style={{ fontSize: 'min(40vw, 40vh)', fontWeight: 900, lineHeight: 1, color: bigNum === 1 ? '#ef4444' : bigNum === 2 ? '#f97316' : '#22c55e', textShadow: '0 4px 30px rgba(255,255,255,0.4)', fontFamily: 'system-ui, sans-serif' }}>{bigNum}</div>
        </div>
      )}
      {showDone && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)', pointerEvents: 'none', animation: 'countdown-pop 1s ease-out forwards' }}>
          <div style={{ fontSize: 'min(25vw, 25vh)', lineHeight: 1 }}>⏰</div>
        </div>
      )}
    </>
  )
}

// ── Main component ────────────────────────────────────────────────────────

export default function BrainstormToolbar({ excalidrawApi, socket, isFacilitator, sessionState, onSessionUpdate, voteMap, myVotesRemaining }: Props) {
  const [showTemplates, setShowTemplates] = useState(false)
  const [showTimer, setShowTimer] = useState(false)
  const [timerMinutes, setTimerMinutes] = useState(5)
  const [showVoting, setShowVoting] = useState(false)
  const [templateTab, setTemplateTab] = useState<string>('all')
  const [templateSubTab, setTemplateSubTab] = useState<'browse' | 'style'>('browse')
  const [maxVotes, setMaxVotes] = useState(5)
  const [showAI, setShowAI] = useState(false)
  const [aiLoading, setAILoading] = useState(false)
  const [aiResult, setAIResult] = useState('')
  const { style: drawingStyle, setStyle: setDrawingStyle, resetStyle } = useDrawingStyle()

  // Inject current style into template element factories
  _currentStyle = drawingStyle

  const voting = sessionState?.voting
  const timer = sessionState?.timer
  const anonymousMode = sessionState?.anonymousMode || false
  const cursorsLocked = sessionState?.cursorsLocked || false

  const startVoting = () => { socket?.emit('vote:start', { maxVotes }); setShowVoting(false); toast.success(`Voting started! ${maxVotes} votes per person`) }
  const endVoting = () => { socket?.emit('vote:end'); toast.success('Voting ended') }
  const startTimer = () => { socket?.emit('timer:start', { duration: timerMinutes * 60 }); setShowTimer(false); toast.success(`Timer started: ${timerMinutes} min`) }
  const stopTimer = () => { socket?.emit('timer:stop') }
  const toggleAnonymous = () => { socket?.emit('anonymous:toggle') }
  const toggleLockCursors = () => { socket?.emit('facilitator:lock-cursors', { locked: !cursorsLocked }) }

  const spotlightCurrent = () => {
    socket?.emit('facilitator:spotlight', { bounds: null })
    toast.success('Spotlight sent to all participants')
  }

  const addVoteItem = () => {
    if (!excalidrawApi) return
    const { cx, cy } = getCenter(excalidrawApi)
    const id = Math.random().toString(36).substr(2, 9)
    const now = Date.now()
    const rect = {
      id, type: 'rectangle', x: cx - 100, y: cy - 60, width: 200, height: 120,
      angle: 0, strokeColor: '#f59e0b', backgroundColor: '#fef9c3', fillStyle: 'solid' as const,
      strokeWidth: 2, strokeStyle: 'solid' as const, roughness: 0, opacity: 100,
      seed: Math.floor(Math.random() * 100000), versionNonce: Math.floor(Math.random() * 100000),
      version: 1, isDeleted: false, boundElements: null, updated: now, locked: false,
    }
    excalidrawApi.updateScene({ elements: [...excalidrawApi.getSceneElements(), rect] })
  }

  const loadTemplate = (template: typeof TEMPLATES[0]) => {
    if (!excalidrawApi) return
    _currentStyle = drawingStyle  // ensure latest style is applied
    const newElements = template.create(excalidrawApi)
    excalidrawApi.updateScene({ elements: [...excalidrawApi.getSceneElements(), ...newElements] })
    setTimeout(() => { try { excalidrawApi.scrollToContent() } catch {} }, 100)
    setShowTemplates(false)
    toast.success(`Template loaded: ${template.name}`)
  }

  const runAIInsights = async () => {
    if (!excalidrawApi) return
    setAILoading(true)
    setShowAI(true)
    try {
      const elements = excalidrawApi.getSceneElements() as any[]
      const shapes = elements
        .filter((e: any) => !e.isDeleted && e.text)
        .map((e: any) => ({ type: e.type, text: e.text }))

      if (!shapes.length) {
        setAIResult('No text found on the canvas. Add some stickies or text elements first.')
        setAILoading(false)
        return
      }

      const response = await fetch('/api/ai/board-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken') || sessionStorage.getItem('guestToken') || ''}`,
        },
        body: JSON.stringify({ elements: shapes, format: 'brainstorm-insights' }),
      })
      const data = await response.json()
      setAIResult(data.content || data.message || JSON.stringify(data))
    } catch {
      setAIResult('Analysis failed. Please try again.')
    } finally {
      setAILoading(false)
    }
  }

  return (
    <>
      <div className="flex items-center gap-1.5 flex-wrap">
        {/* Timer */}
        {timer?.active && timer.endTime ? (
          <TimerDisplay endTime={timer.endTime} onStop={stopTimer} isFacilitator={isFacilitator} />
        ) : isFacilitator ? (
          <div className="relative">
            <button onClick={() => setShowTimer(v => !v)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:text-teal-600 hover:bg-teal-50 rounded-lg border border-gray-200 transition-colors">
              <Timer size={13} /> Timer
            </button>
            {showTimer && (
              <div className="absolute top-10 left-0 bg-white border border-gray-200 rounded-xl shadow-xl p-4 z-50 w-52">
                <p className="text-xs font-semibold text-gray-600 mb-2">Set duration (minutes)</p>
                <div className="flex gap-1.5 flex-wrap mb-3">
                  {[1, 2, 3, 5, 10, 15].map(m => (
                    <button key={m} onClick={() => setTimerMinutes(m)}
                      className={`px-2 py-1 rounded text-xs font-medium ${timerMinutes === m ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{m}m</button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input type="number" value={timerMinutes} onChange={e => setTimerMinutes(Number(e.target.value))} min={1} max={60}
                    className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500" />
                  <button onClick={startTimer}
                    className="px-3 py-1 bg-teal-600 text-white text-xs font-medium rounded-lg hover:bg-teal-700 flex items-center gap-1">
                    <Play size={11} /> Start
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : null}

        {/* Voting */}
        {voting?.active ? (
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-yellow-50 border border-yellow-300 rounded-lg text-xs font-medium text-yellow-700">
            <Vote size={13} />
            Voting
            <span className="px-1.5 py-0.5 bg-yellow-200 rounded font-bold">{myVotesRemaining} left</span>
            <button onClick={addVoteItem} className="px-1.5 py-0.5 bg-yellow-300 hover:bg-yellow-400 rounded text-xs text-yellow-900">+ Add</button>
            {isFacilitator && (
              <button onClick={endVoting} className="ml-1 px-1.5 py-0.5 bg-red-200 hover:bg-red-300 rounded text-xs text-red-700">End</button>
            )}
          </div>
        ) : isFacilitator ? (
          <div className="relative">
            <button onClick={() => setShowVoting(v => !v)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg border border-gray-200 transition-colors">
              <Vote size={13} /> Vote
            </button>
            {showVoting && (
              <div className="absolute top-10 left-0 bg-white border border-gray-200 rounded-xl shadow-xl p-4 z-50 w-48">
                <p className="text-xs font-semibold text-gray-600 mb-2">Votes per person</p>
                <div className="flex gap-1.5 flex-wrap mb-3">
                  {[3, 5, 8, 10].map(n => (
                    <button key={n} onClick={() => setMaxVotes(n)}
                      className={`px-2 py-1 rounded text-xs font-medium ${maxVotes === n ? 'bg-yellow-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{n}</button>
                  ))}
                </div>
                <button onClick={startVoting}
                  className="w-full py-1.5 bg-yellow-500 text-white text-xs font-semibold rounded-lg hover:bg-yellow-600 flex items-center justify-center gap-1">
                  <Vote size={11} /> Start Voting
                </button>
              </div>
            )}
          </div>
        ) : null}

        {/* Templates */}
        <div className="relative">
          <button onClick={() => setShowTemplates(v => !v)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg border border-gray-200 transition-colors">
            <LayoutTemplate size={13} /> Templates
          </button>
          {showTemplates && (
            <div className="absolute top-10 left-0 bg-white border border-gray-200 rounded-2xl shadow-2xl z-50 w-72" style={{ maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
              {/* Sub-tab header */}
              <div className="flex items-center px-3 pt-2.5 pb-0 shrink-0 gap-1">
                <button
                  onClick={() => setTemplateSubTab('browse')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-t-lg transition-colors border-b-2 ${templateSubTab === 'browse' ? 'text-purple-600 border-purple-600' : 'text-gray-400 border-transparent hover:text-gray-600'}`}
                >
                  Library
                </button>
                <button
                  onClick={() => setTemplateSubTab('style')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-t-lg transition-colors border-b-2 flex items-center justify-center gap-1 ${templateSubTab === 'style' ? 'text-teal-600 border-teal-600' : 'text-gray-400 border-transparent hover:text-gray-600'}`}
                >
                  <Settings2 size={11} /> Default Style
                </button>
              </div>

              {templateSubTab === 'browse' ? (
                <>
                  <div className="px-3 pt-2 pb-2 border-b border-gray-100 shrink-0">
                    <div className="flex gap-1 flex-wrap">
                      {[
                        { id: 'all', label: 'All', emoji: '📋' },
                        { id: 'brainstorm', label: 'Brainstorm', emoji: '💡' },
                        { id: 'retro', label: 'Retro', emoji: '🔄' },
                        { id: 'agile', label: 'Agile', emoji: '🚂' },
                        { id: 'strategy', label: 'Strategy', emoji: '🎯' },
                        { id: 'design', label: 'Design', emoji: '❤️' },
                      ].map(tab => (
                        <button key={tab.id} onClick={() => setTemplateTab(tab.id)}
                          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors ${templateTab === tab.id ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                          <span>{tab.emoji}</span>{tab.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="overflow-y-auto flex-1 p-1.5">
                    {TEMPLATES.filter(t => templateTab === 'all' || t.category === templateTab).map(t => (
                      <button key={t.id} onClick={() => loadTemplate(t)}
                        className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-purple-50 transition-colors">
                        <div className="flex items-center gap-2.5">
                          <span className="text-xl shrink-0">{t.icon}</span>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-gray-700 truncate">{t.name}</p>
                            <p className="text-xs text-gray-400 truncate">{t.description}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <div className="overflow-y-auto flex-1">
                  <div className="px-3 pt-2 pb-1">
                    <p className="text-[10px] text-gray-400 leading-relaxed">These settings apply to all newly inserted template shapes</p>
                  </div>
                  <DrawingStylePanel style={drawingStyle} onChange={setDrawingStyle} onReset={resetStyle} />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Anonymous Mode */}
        {isFacilitator && (
          <button onClick={toggleAnonymous}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors ${anonymousMode ? 'bg-gray-800 text-white border-gray-700' : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100 border-gray-200'}`}>
            <EyeOff size={13} /> {anonymousMode ? 'Anon On' : 'Anon'}
          </button>
        )}

        {/* AI Insights */}
        <button onClick={runAIInsights}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:text-teal-600 hover:bg-teal-50 rounded-lg border border-gray-200 transition-colors">
          <Brain size={13} /> AI Insights
        </button>

        {/* Facilitator controls */}
        {isFacilitator && (
          <>
            <button onClick={spotlightCurrent} title="Sync everyone's viewport"
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:text-orange-600 hover:bg-orange-50 rounded-lg border border-gray-200 transition-colors">
              <Crosshair size={13} /> Spotlight
            </button>
            <button onClick={toggleLockCursors}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors ${cursorsLocked ? 'bg-red-100 text-red-600 border-red-300' : 'text-gray-600 hover:text-red-600 hover:bg-red-50 border-gray-200'}`}>
              {cursorsLocked ? <Lock size={13} /> : <Unlock size={13} />}
              {cursorsLocked ? 'Unlock' : 'Lock Cursors'}
            </button>
          </>
        )}

        {!isFacilitator && <span className="text-xs text-gray-400 px-1">👁️ Observer</span>}
      </div>

      {/* AI Insights Modal */}
      {showAI && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b shrink-0">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2"><Brain size={16} className="text-teal-600" /> AI Board Analysis</h3>
              <button onClick={() => setShowAI(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X size={18} className="text-gray-500" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              {aiLoading ? (
                <div className="flex flex-col items-center justify-center h-40 gap-3">
                  <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-gray-500">Analysing canvas content...</p>
                </div>
              ) : (
                <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{aiResult}</div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
