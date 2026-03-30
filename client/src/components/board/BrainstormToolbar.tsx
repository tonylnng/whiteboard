import { useState, useEffect, useCallback, useRef } from 'react'
import { Editor, createShapeId, toRichText } from 'tldraw'
import { Socket } from 'socket.io-client'
import { toast } from 'sonner'
import {
  Vote, Timer, LayoutTemplate, EyeOff, Brain,
  Play, Square, Lock, Unlock, Crosshair, X
} from 'lucide-react'

interface Props {
  editor: Editor | null
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

// Templates
const TEMPLATES = [
  {
    id: 'hmw',
    category: 'brainstorm',
    name: 'HMW (How Might We)',
    icon: '💡',
    description: '用「我們如何能...」開始頭腦風暴',
    create: (editor: Editor) => {
      const b = editor.getViewportPageBounds()
      const cx = b.x + b.w / 2, cy = b.y + b.h / 2
      editor.createShape({ id: createShapeId(), type: 'text', x: cx - 200, y: cy - 280,
        props: { richText: toRichText('💡 How Might We...'), size: 'xl' as any, color: 'black' as any, w: 400, autoSize: true, scale: 1, textAlign: 'middle' as any, font: 'draw' as any } })
      const zones = [
        { label: '問題定義\nHow Might We...', color: 'yellow', dx: -300 },
        { label: '解決方案創意\n（自由發想）', color: 'green', dx: 0 },
        { label: '最佳想法\n（投票後選出）', color: 'blue', dx: 300 },
      ]
      zones.forEach(z => {
        editor.createShape({ id: createShapeId(), type: 'geo', x: cx + z.dx - 130, y: cy - 200,
          props: { geo: 'rectangle', w: 260, h: 360, fill: 'semi', color: z.color as any, dash: 'draw', size: 'm', font: 'draw', align: 'middle', verticalAlign: 'start', growY: 0, url: '', scale: 1, labelColor: 'black', richText: toRichText(z.label) } })
      })
    },
  },
  {
    id: 'swot',
    category: 'strategy',
    name: 'SWOT Analysis',
    icon: '📊',
    description: '優勢、弱點、機會、威脅',
    create: (editor: Editor) => {
      const b = editor.getViewportPageBounds()
      const cx = b.x + b.w / 2, cy = b.y + b.h / 2
      editor.createShape({ id: createShapeId(), type: 'text', x: cx - 200, y: cy - 300,
        props: { richText: toRichText('📊 SWOT Analysis'), size: 'xl' as any, color: 'black' as any, w: 400, autoSize: true, scale: 1, textAlign: 'middle' as any, font: 'draw' as any } })
      const quadrants = [
        { label: '💪 Strengths\n（優勢）', color: 'green', dx: -200, dy: -150 },
        { label: '⚠️ Weaknesses\n（弱點）', color: 'red', dx: 50, dy: -150 },
        { label: '🌟 Opportunities\n（機會）', color: 'blue', dx: -200, dy: 50 },
        { label: '⚡ Threats\n（威脅）', color: 'orange', dx: 50, dy: 50 },
      ]
      quadrants.forEach(q => {
        editor.createShape({ id: createShapeId(), type: 'geo', x: cx + q.dx, y: cy + q.dy,
          props: { geo: 'rectangle', w: 240, h: 180, fill: 'semi', color: q.color as any, dash: 'draw', size: 'm', font: 'draw', align: 'middle', verticalAlign: 'start', growY: 0, url: '', scale: 1, labelColor: 'black', richText: toRichText(q.label) } })
      })
    },
  },
  {
    id: '4ls',
    category: 'retro',
    name: '4Ls Retrospective',
    icon: '🔄',
    description: 'Liked / Learned / Lacked / Longed For',
    create: (editor: Editor) => {
      const b = editor.getViewportPageBounds()
      const cx = b.x + b.w / 2, cy = b.y + b.h / 2
      editor.createShape({ id: createShapeId(), type: 'text', x: cx - 220, y: cy - 300,
        props: { richText: toRichText('🔄 4Ls Retrospective'), size: 'xl' as any, color: 'black' as any, w: 440, autoSize: true, scale: 1, textAlign: 'middle' as any, font: 'draw' as any } })
      const zones = [
        { label: '❤️ Liked\n喜歡的', color: 'green', dx: -420, dy: -150 },
        { label: '📚 Learned\n學到的', color: 'blue', dx: -140, dy: -150 },
        { label: '😕 Lacked\n缺乏的', color: 'orange', dx: 140, dy: -150 },
        { label: '✨ Longed For\n期望的', color: 'violet', dx: 420, dy: -150 },
      ]
      zones.forEach(z => {
        editor.createShape({ id: createShapeId(), type: 'geo', x: cx + z.dx - 130, y: cy + z.dy,
          props: { geo: 'rectangle', w: 260, h: 280, fill: 'semi', color: z.color as any, dash: 'draw', size: 'm', font: 'draw', align: 'middle', verticalAlign: 'start', growY: 0, url: '', scale: 1, labelColor: 'black', richText: toRichText(z.label) } })
      })
    },
  },
  {
    id: 'start-stop-continue',
    category: 'retro',
    name: 'Start / Stop / Continue',
    icon: '▶️',
    description: '行動反思框架',
    create: (editor: Editor) => {
      const b = editor.getViewportPageBounds()
      const cx = b.x + b.w / 2, cy = b.y + b.h / 2
      editor.createShape({ id: createShapeId(), type: 'text', x: cx - 200, y: cy - 280,
        props: { richText: toRichText('▶️ Start / Stop / Continue'), size: 'xl' as any, color: 'black' as any, w: 400, autoSize: true, scale: 1, textAlign: 'middle' as any, font: 'draw' as any } })
      const zones = [
        { label: '🟢 Start\n開始做', color: 'green', dx: -280 },
        { label: '🔴 Stop\n停止做', color: 'red', dx: 0 },
        { label: '🔵 Continue\n繼續做', color: 'blue', dx: 280 },
      ]
      zones.forEach(z => {
        editor.createShape({ id: createShapeId(), type: 'geo', x: cx + z.dx - 120, y: cy - 180,
          props: { geo: 'rectangle', w: 240, h: 340, fill: 'semi', color: z.color as any, dash: 'draw', size: 'm', font: 'draw', align: 'middle', verticalAlign: 'start', growY: 0, url: '', scale: 1, labelColor: 'black', richText: toRichText(z.label) } })
      })
    },
  },
  {
    id: 'rose-thorn-bud',
    category: 'retro',
    name: 'Rose / Thorn / Bud',
    icon: '🌹',
    description: '正面、挑戰、潛力',
    create: (editor: Editor) => {
      const b = editor.getViewportPageBounds()
      const cx = b.x + b.w / 2, cy = b.y + b.h / 2
      editor.createShape({ id: createShapeId(), type: 'text', x: cx - 160, y: cy - 280,
        props: { richText: toRichText('🌹 Rose / Thorn / Bud'), size: 'xl' as any, color: 'black' as any, w: 320, autoSize: true, scale: 1, textAlign: 'middle' as any, font: 'draw' as any } })
      const zones = [
        { label: '🌹 Rose\n正面、好的事', color: 'light-red', dx: -280 },
        { label: '🌵 Thorn\n挑戰、難題', color: 'orange', dx: 0 },
        { label: '🌱 Bud\n潛力、機會', color: 'green', dx: 280 },
      ]
      zones.forEach(z => {
        editor.createShape({ id: createShapeId(), type: 'geo', x: cx + z.dx - 120, y: cy - 180,
          props: { geo: 'rectangle', w: 240, h: 340, fill: 'semi', color: z.color as any, dash: 'draw', size: 'm', font: 'draw', align: 'middle', verticalAlign: 'start', growY: 0, url: '', scale: 1, labelColor: 'black', richText: toRichText(z.label) } })
      })
    },
  },
  // ===== SAFe / Scaled Agile =====
  {
    id: 'pi-planning',
    category: 'agile',
    name: 'PI Planning Board',
    icon: '🚂',
    description: 'SAFe Program Increment Planning',
    create: (editor: Editor) => {
      const b = editor.getViewportPageBounds()
      const cx = b.x + b.w / 2, cy = b.y + b.h / 2
      // Title
      editor.createShape({ id: createShapeId(), type: 'text', x: cx - 300, y: cy - 450,
        props: { richText: toRichText('🚂 PI Planning Board'), size: 'xl' as any, color: 'black' as any, w: 600, autoSize: true, scale: 1, textAlign: 'middle' as any, font: 'draw' as any } })
      // 4 Iterations + 1 IP Sprint columns
      const iters = ['Iteration 1', 'Iteration 2', 'Iteration 3', 'Iteration 4', 'IP Sprint']
      const iterColors = ['blue', 'green', 'violet', 'orange', 'grey']
      iters.forEach((iter, i) => {
        editor.createShape({ id: createShapeId(), type: 'geo', x: cx - 580 + i * 240, y: cy - 400,
          props: { geo: 'rectangle', w: 220, h: 40, fill: 'semi', color: iterColors[i] as any, dash: 'draw', size: 's', font: 'draw', align: 'middle', verticalAlign: 'middle', growY: 0, url: '', scale: 1, labelColor: 'black', richText: toRichText(iter) } })
      })
      // 4 Team rows
      const teams = ['Team Alpha', 'Team Beta', 'Team Gamma', 'Team Delta']
      teams.forEach((team, t) => {
        // Team label
        editor.createShape({ id: createShapeId(), type: 'geo', x: cx - 820, y: cy - 340 + t * 160,
          props: { geo: 'rectangle', w: 220, h: 140, fill: 'semi', color: 'black' as any, dash: 'draw', size: 's', font: 'draw', align: 'middle', verticalAlign: 'middle', growY: 0, url: '', scale: 1, labelColor: 'black', richText: toRichText(team) } })
        // Cells per iteration
        iters.forEach((_, i) => {
          editor.createShape({ id: createShapeId(), type: 'geo', x: cx - 580 + i * 240, y: cy - 340 + t * 160,
            props: { geo: 'rectangle', w: 220, h: 140, fill: 'none', color: 'grey' as any, dash: 'draw', size: 's', font: 'draw', align: 'middle', verticalAlign: 'start', growY: 0, url: '', scale: 1, labelColor: 'black', richText: toRichText('') } })
        })
      })
      // Objectives section
      editor.createShape({ id: createShapeId(), type: 'geo', x: cx - 580, y: cy + 310,
        props: { geo: 'rectangle', w: 600, h: 120, fill: 'semi', color: 'blue' as any, dash: 'draw', size: 'm', font: 'draw', align: 'middle', verticalAlign: 'start', growY: 0, url: '', scale: 1, labelColor: 'black', richText: toRichText('PI Objectives') } })
      // ROAM Risks section
      editor.createShape({ id: createShapeId(), type: 'geo', x: cx + 60, y: cy + 310,
        props: { geo: 'rectangle', w: 600, h: 120, fill: 'semi', color: 'red' as any, dash: 'draw', size: 'm', font: 'draw', align: 'middle', verticalAlign: 'start', growY: 0, url: '', scale: 1, labelColor: 'black', richText: toRichText('ROAM Risks') } })
    },
  },
  {
    id: 'roam-risk',
    category: 'agile',
    name: 'ROAM Risk Board',
    icon: '⚠️',
    description: 'Resolved / Owned / Accepted / Mitigated',
    create: (editor: Editor) => {
      const b = editor.getViewportPageBounds()
      const cx = b.x + b.w / 2, cy = b.y + b.h / 2
      editor.createShape({ id: createShapeId(), type: 'text', x: cx - 200, y: cy - 280,
        props: { richText: toRichText('⚠️ ROAM Risk Board'), size: 'xl' as any, color: 'black' as any, w: 400, autoSize: true, scale: 1, textAlign: 'middle' as any, font: 'draw' as any } })
      const q = [
        { label: '✅ Resolved\n已解決', color: 'green', dx: -260, dy: -220 },
        { label: '👤 Owned\n已指派負責人', color: 'blue', dx: 20, dy: -220 },
        { label: '🤝 Accepted\n接受此風險', color: 'orange', dx: -260, dy: 30 },
        { label: '🛡️ Mitigated\n已降低影響', color: 'yellow', dx: 20, dy: 30 },
      ]
      q.forEach(item => {
        editor.createShape({ id: createShapeId(), type: 'geo', x: cx + item.dx, y: cy + item.dy,
          props: { geo: 'rectangle', w: 260, h: 240, fill: 'semi', color: item.color as any, dash: 'draw', size: 'm', font: 'draw', align: 'middle', verticalAlign: 'start', growY: 0, url: '', scale: 1, labelColor: 'black', richText: toRichText(item.label) } })
      })
    },
  },
  {
    id: 'art-kanban',
    category: 'agile',
    name: 'ART Kanban',
    icon: '🔄',
    description: 'SAFe Agile Release Train Feature Flow',
    create: (editor: Editor) => {
      const b = editor.getViewportPageBounds()
      const cx = b.x + b.w / 2, cy = b.y + b.h / 2
      editor.createShape({ id: createShapeId(), type: 'text', x: cx - 300, y: cy - 320,
        props: { richText: toRichText('🔄 ART Kanban'), size: 'xl' as any, color: 'black' as any, w: 600, autoSize: true, scale: 1, textAlign: 'middle' as any, font: 'draw' as any } })
      const cols = [
        { label: 'Funnel\n漏斗', color: 'grey' },
        { label: 'Analysis\n分析', color: 'blue' },
        { label: 'Implementation\n開發', color: 'violet' },
        { label: 'Review\n審查', color: 'orange' },
        { label: 'Deploy\n部署', color: 'green' },
        { label: 'Done\n完成', color: 'light-green' },
      ]
      cols.forEach((col, i) => {
        editor.createShape({ id: createShapeId(), type: 'geo', x: cx - 720 + i * 250, y: cy - 260,
          props: { geo: 'rectangle', w: 230, h: 40, fill: 'semi', color: col.color as any, dash: 'draw', size: 's', font: 'draw', align: 'middle', verticalAlign: 'middle', growY: 0, url: '', scale: 1, labelColor: 'black', richText: toRichText(col.label) } })
        editor.createShape({ id: createShapeId(), type: 'geo', x: cx - 720 + i * 250, y: cy - 200,
          props: { geo: 'rectangle', w: 230, h: 400, fill: 'none', color: 'grey' as any, dash: 'draw', size: 's', font: 'draw', align: 'middle', verticalAlign: 'start', growY: 0, url: '', scale: 1, labelColor: 'black', richText: toRichText('') } })
      })
    },
  },
  // ===== Agile / Scrum =====
  {
    id: 'user-story-map',
    category: 'agile',
    name: 'User Story Map',
    icon: '🗺️',
    description: 'Activities → Tasks → User Stories',
    create: (editor: Editor) => {
      const b = editor.getViewportPageBounds()
      const cx = b.x + b.w / 2, cy = b.y + b.h / 2
      editor.createShape({ id: createShapeId(), type: 'text', x: cx - 280, y: cy - 380,
        props: { richText: toRichText('🗺️ User Story Map'), size: 'xl' as any, color: 'black' as any, w: 560, autoSize: true, scale: 1, textAlign: 'middle' as any, font: 'draw' as any } })
      // Backbone (Activities)
      editor.createShape({ id: createShapeId(), type: 'text', x: cx - 500, y: cy - 320,
        props: { richText: toRichText('BACKBONE（用戶活動）'), size: 'm' as any, color: 'blue' as any, w: 300, autoSize: true, scale: 1, textAlign: 'start' as any, font: 'draw' as any } })
      const activities = ['搜尋', '瀏覽', '下單', '付款', '追蹤']
      activities.forEach((act, i) => {
        editor.createShape({ id: createShapeId(), type: 'geo', x: cx - 500 + i * 220, y: cy - 280,
          props: { geo: 'rectangle', w: 200, h: 60, fill: 'solid', color: 'blue' as any, dash: 'draw', size: 'm', font: 'draw', align: 'middle', verticalAlign: 'middle', growY: 0, url: '', scale: 1, labelColor: 'white', richText: toRichText(act) } })
      })
      // Walking skeleton (Tasks)
      editor.createShape({ id: createShapeId(), type: 'text', x: cx - 500, y: cy - 190,
        props: { richText: toRichText('TASKS（用戶任務）'), size: 'm' as any, color: 'violet' as any, w: 300, autoSize: true, scale: 1, textAlign: 'start' as any, font: 'draw' as any } })
      activities.forEach((_, i) => {
        editor.createShape({ id: createShapeId(), type: 'geo', x: cx - 500 + i * 220, y: cy - 150,
          props: { geo: 'rectangle', w: 200, h: 60, fill: 'semi', color: 'violet' as any, dash: 'draw', size: 's', font: 'draw', align: 'middle', verticalAlign: 'middle', growY: 0, url: '', scale: 1, labelColor: 'black', richText: toRichText('Task') } })
      })
      // Release slices
      const releases = ['Release 1', 'Release 2', 'Release 3']
      releases.forEach((rel, r) => {
        editor.createShape({ id: createShapeId(), type: 'geo', x: cx - 520, y: cy - 50 + r * 130,
          props: { geo: 'rectangle', w: 1020, h: 120, fill: 'semi', color: r === 0 ? 'green' : r === 1 ? 'yellow' : 'grey' as any, dash: 'draw', size: 's', font: 'draw', align: 'middle', verticalAlign: 'start', growY: 0, url: '', scale: 1, labelColor: 'black', richText: toRichText(rel) } })
      })
    },
  },
  {
    id: 'sailboat-retro',
    category: 'retro',
    name: 'Sailboat Retrospective',
    icon: '⛵',
    description: '風帆、錨、礁石、島嶼',
    create: (editor: Editor) => {
      const b = editor.getViewportPageBounds()
      const cx = b.x + b.w / 2, cy = b.y + b.h / 2
      editor.createShape({ id: createShapeId(), type: 'text', x: cx - 280, y: cy - 360,
        props: { richText: toRichText('⛵ Sailboat Retrospective'), size: 'xl' as any, color: 'black' as any, w: 560, autoSize: true, scale: 1, textAlign: 'middle' as any, font: 'draw' as any } })
      const zones = [
        { label: '🌴 Island\n目標 / 願景', color: 'green', dx: 200, dy: -280 },
        { label: '💨 Wind\n推動我們的力量', color: 'blue', dx: -400, dy: -180 },
        { label: '⚓ Anchor\n拖慢我們的原因', color: 'red', dx: 200, dy: -80 },
        { label: '🪨 Reef\n前方的風險', color: 'orange', dx: -400, dy: 80 },
      ]
      zones.forEach(z => {
        editor.createShape({ id: createShapeId(), type: 'geo', x: cx + z.dx, y: cy + z.dy,
          props: { geo: 'rectangle', w: 300, h: 200, fill: 'semi', color: z.color as any, dash: 'draw', size: 'm', font: 'draw', align: 'middle', verticalAlign: 'start', growY: 0, url: '', scale: 1, labelColor: 'black', richText: toRichText(z.label) } })
      })
    },
  },
  // ===== Strategy =====
  {
    id: 'business-model-canvas',
    category: 'strategy',
    name: 'Business Model Canvas',
    icon: '🏢',
    description: '9格商業模式畫布',
    create: (editor: Editor) => {
      const b = editor.getViewportPageBounds()
      const cx = b.x + b.w / 2, cy = b.y + b.h / 2
      editor.createShape({ id: createShapeId(), type: 'text', x: cx - 320, y: cy - 440,
        props: { richText: toRichText('🏢 Business Model Canvas'), size: 'xl' as any, color: 'black' as any, w: 640, autoSize: true, scale: 1, textAlign: 'middle' as any, font: 'draw' as any } })
      const cells = [
        { label: '🤝 Key Partners\n關鍵合作夥伴', color: 'orange', x: cx - 640, y: cy - 380, w: 230, h: 280 },
        { label: '⚙️ Key Activities\n關鍵活動', color: 'orange', x: cx - 390, y: cy - 380, w: 230, h: 130 },
        { label: '🔑 Key Resources\n關鍵資源', color: 'orange', x: cx - 390, y: cy - 230, w: 230, h: 130 },
        { label: '💎 Value Propositions\n價值主張', color: 'blue', x: cx - 140, y: cy - 380, w: 260, h: 280 },
        { label: '💬 Customer Relationships\n客戶關係', color: 'green', x: cx + 140, y: cy - 380, w: 230, h: 130 },
        { label: '📦 Channels\n通路', color: 'green', x: cx + 140, y: cy - 230, w: 230, h: 130 },
        { label: '👥 Customer Segments\n目標客群', color: 'green', x: cx + 390, y: cy - 380, w: 230, h: 280 },
        { label: '💸 Cost Structure\n成本結構', color: 'red', x: cx - 640, y: cy - 80, w: 500, h: 130 },
        { label: '💰 Revenue Streams\n收入來源', color: 'green', x: cx - 120, y: cy - 80, w: 740, h: 130 },
      ]
      cells.forEach(cell => {
        editor.createShape({ id: createShapeId(), type: 'geo', x: cell.x, y: cell.y,
          props: { geo: 'rectangle', w: cell.w, h: cell.h, fill: 'semi', color: cell.color as any, dash: 'draw', size: 's', font: 'draw', align: 'middle', verticalAlign: 'start', growY: 0, url: '', scale: 1, labelColor: 'black', richText: toRichText(cell.label) } })
      })
    },
  },
  {
    id: 'lean-canvas',
    category: 'strategy',
    name: 'Lean Canvas',
    icon: '🚀',
    description: '精實創業商業模式',
    create: (editor: Editor) => {
      const b = editor.getViewportPageBounds()
      const cx = b.x + b.w / 2, cy = b.y + b.h / 2
      editor.createShape({ id: createShapeId(), type: 'text', x: cx - 260, y: cy - 440,
        props: { richText: toRichText('🚀 Lean Canvas'), size: 'xl' as any, color: 'black' as any, w: 520, autoSize: true, scale: 1, textAlign: 'middle' as any, font: 'draw' as any } })
      const cells = [
        { label: '❗ Problem\n問題', color: 'red', x: cx - 640, y: cy - 380, w: 230, h: 130 },
        { label: '💡 Solution\n解決方案', color: 'green', x: cx - 390, y: cy - 380, w: 230, h: 130 },
        { label: '🌟 Unique Value Proposition\n獨特價值主張', color: 'blue', x: cx - 140, y: cy - 380, w: 260, h: 280 },
        { label: '🏆 Unfair Advantage\n不可複製的優勢', color: 'violet', x: cx + 140, y: cy - 380, w: 230, h: 130 },
        { label: '👥 Customer Segments\n目標客群', color: 'green', x: cx + 390, y: cy - 380, w: 230, h: 280 },
        { label: '📌 Existing Alternatives\n現有替代方案', color: 'red', x: cx - 640, y: cy - 230, w: 230, h: 130 },
        { label: '📊 Key Metrics\n關鍵指標', color: 'orange', x: cx - 390, y: cy - 230, w: 230, h: 130 },
        { label: '📣 Channels\n獲客通路', color: 'green', x: cx + 140, y: cy - 230, w: 230, h: 130 },
        { label: '💸 Cost Structure\n成本結構', color: 'red', x: cx - 640, y: cy - 80, w: 500, h: 120 },
        { label: '💰 Revenue Streams\n收入模式', color: 'green', x: cx - 120, y: cy - 80, w: 740, h: 120 },
      ]
      cells.forEach(cell => {
        editor.createShape({ id: createShapeId(), type: 'geo', x: cell.x, y: cell.y,
          props: { geo: 'rectangle', w: cell.w, h: cell.h, fill: 'semi', color: cell.color as any, dash: 'draw', size: 's', font: 'draw', align: 'middle', verticalAlign: 'start', growY: 0, url: '', scale: 1, labelColor: 'black', richText: toRichText(cell.label) } })
      })
    },
  },
  {
    id: 'okr-board',
    category: 'strategy',
    name: 'OKR Board',
    icon: '🎯',
    description: 'Objectives & Key Results',
    create: (editor: Editor) => {
      const b = editor.getViewportPageBounds()
      const cx = b.x + b.w / 2, cy = b.y + b.h / 2
      editor.createShape({ id: createShapeId(), type: 'text', x: cx - 180, y: cy - 360,
        props: { richText: toRichText('🎯 OKR Board'), size: 'xl' as any, color: 'black' as any, w: 360, autoSize: true, scale: 1, textAlign: 'middle' as any, font: 'draw' as any } })
      // 3 Objectives columns
      for (let o = 0; o < 3; o++) {
        editor.createShape({ id: createShapeId(), type: 'geo', x: cx - 480 + o * 340, y: cy - 300,
          props: { geo: 'rectangle', w: 310, h: 60, fill: 'solid', color: 'blue' as any, dash: 'draw', size: 'm', font: 'draw', align: 'middle', verticalAlign: 'middle', growY: 0, url: '', scale: 1, labelColor: 'white', richText: toRichText(`Objective ${o + 1}`) } })
        // 3 KRs per objective
        for (let k = 0; k < 3; k++) {
          editor.createShape({ id: createShapeId(), type: 'geo', x: cx - 480 + o * 340, y: cy - 220 + k * 130,
            props: { geo: 'rectangle', w: 310, h: 110, fill: 'semi', color: k === 0 ? 'green' : k === 1 ? 'yellow' : 'orange' as any, dash: 'draw', size: 's', font: 'draw', align: 'middle', verticalAlign: 'start', growY: 0, url: '', scale: 1, labelColor: 'black', richText: toRichText(`KR${k + 1}: `) } })
        }
      }
    },
  },
  {
    id: 'impact-effort',
    category: 'strategy',
    name: 'Impact vs Effort Matrix',
    icon: '📐',
    description: '優先級決策 2x2 矩陣',
    create: (editor: Editor) => {
      const b = editor.getViewportPageBounds()
      const cx = b.x + b.w / 2, cy = b.y + b.h / 2
      editor.createShape({ id: createShapeId(), type: 'text', x: cx - 240, y: cy - 380,
        props: { richText: toRichText('📐 Impact vs Effort Matrix'), size: 'xl' as any, color: 'black' as any, w: 480, autoSize: true, scale: 1, textAlign: 'middle' as any, font: 'draw' as any } })
      const q = [
        { label: '⭐ Quick Wins\n高影響 × 低成本\n立即做！', color: 'green', dx: -310, dy: -300 },
        { label: '🎯 Big Bets\n高影響 × 高成本\n計劃中做', color: 'blue', dx: 10, dy: -300 },
        { label: '🌱 Fill-ins\n低影響 × 低成本\n有空再做', color: 'yellow', dx: -310, dy: -10 },
        { label: '🚫 Time Sinks\n低影響 × 高成本\n避免！', color: 'red', dx: 10, dy: -10 },
      ]
      q.forEach(item => {
        editor.createShape({ id: createShapeId(), type: 'geo', x: cx + item.dx, y: cy + item.dy,
          props: { geo: 'rectangle', w: 290, h: 270, fill: 'semi', color: item.color as any, dash: 'draw', size: 'm', font: 'draw', align: 'middle', verticalAlign: 'start', growY: 0, url: '', scale: 1, labelColor: 'black', richText: toRichText(item.label) } })
      })
      // Axis labels
      editor.createShape({ id: createShapeId(), type: 'text', x: cx - 120, y: cy + 270,
        props: { richText: toRichText('← 低成本 ────── 高成本 →'), size: 'm' as any, color: 'grey' as any, w: 480, autoSize: true, scale: 1, textAlign: 'middle' as any, font: 'draw' as any } })
    },
  },
  // ===== Design Thinking =====
  {
    id: 'empathy-map',
    category: 'design',
    name: 'Empathy Map',
    icon: '❤️',
    description: 'Says / Thinks / Does / Feels',
    create: (editor: Editor) => {
      const b = editor.getViewportPageBounds()
      const cx = b.x + b.w / 2, cy = b.y + b.h / 2
      editor.createShape({ id: createShapeId(), type: 'text', x: cx - 200, y: cy - 380,
        props: { richText: toRichText('❤️ Empathy Map'), size: 'xl' as any, color: 'black' as any, w: 400, autoSize: true, scale: 1, textAlign: 'middle' as any, font: 'draw' as any } })
      // Central user circle
      editor.createShape({ id: createShapeId(), type: 'geo', x: cx - 80, y: cy - 80,
        props: { geo: 'ellipse', w: 160, h: 160, fill: 'semi', color: 'grey' as any, dash: 'draw', size: 'm', font: 'draw', align: 'middle', verticalAlign: 'middle', growY: 0, url: '', scale: 1, labelColor: 'black', richText: toRichText('👤 USER') } })
      const quadrants = [
        { label: '💬 SAYS\n用戶說了什麼（引述）', color: 'blue', dx: -340, dy: -300 },
        { label: '🧠 THINKS\n用戶內心想法', color: 'violet', dx: 60, dy: -300 },
        { label: '🖐️ DOES\n用戶的行為動作', color: 'green', dx: -340, dy: 60 },
        { label: '😊 FEELS\n用戶的情緒感受', color: 'orange', dx: 60, dy: 60 },
      ]
      quadrants.forEach(q => {
        editor.createShape({ id: createShapeId(), type: 'geo', x: cx + q.dx, y: cy + q.dy,
          props: { geo: 'rectangle', w: 270, h: 230, fill: 'semi', color: q.color as any, dash: 'draw', size: 'm', font: 'draw', align: 'middle', verticalAlign: 'start', growY: 0, url: '', scale: 1, labelColor: 'black', richText: toRichText(q.label) } })
      })
      // Pain & Gain
      editor.createShape({ id: createShapeId(), type: 'geo', x: cx - 640, y: cy - 80,
        props: { geo: 'rectangle', w: 280, h: 160, fill: 'semi', color: 'red' as any, dash: 'draw', size: 'm', font: 'draw', align: 'middle', verticalAlign: 'start', growY: 0, url: '', scale: 1, labelColor: 'black', richText: toRichText('😫 PAINS\n痛點、恐懼、挫折') } })
      editor.createShape({ id: createShapeId(), type: 'geo', x: cx + 360, y: cy - 80,
        props: { geo: 'rectangle', w: 280, h: 160, fill: 'semi', color: 'green' as any, dash: 'draw', size: 'm', font: 'draw', align: 'middle', verticalAlign: 'start', growY: 0, url: '', scale: 1, labelColor: 'black', richText: toRichText('🌟 GAINS\n收穫、快樂、目標') } })
    },
  },
  {
    id: 'user-journey',
    category: 'design',
    name: 'User Journey Map',
    icon: '🗺️',
    description: '用戶旅程：階段/行動/情緒/痛點',
    create: (editor: Editor) => {
      const b = editor.getViewportPageBounds()
      const cx = b.x + b.w / 2, cy = b.y + b.h / 2
      editor.createShape({ id: createShapeId(), type: 'text', x: cx - 320, y: cy - 440,
        props: { richText: toRichText('🗺️ User Journey Map'), size: 'xl' as any, color: 'black' as any, w: 640, autoSize: true, scale: 1, textAlign: 'middle' as any, font: 'draw' as any } })
      const stages = ['Awareness\n發現', 'Consideration\n考慮', 'Decision\n決定', 'Retention\n留存', 'Advocacy\n推薦']
      const rows = [
        { label: '🎬 Actions\n用戶行為', color: 'blue' },
        { label: '💭 Thoughts\n想法', color: 'violet' },
        { label: '😊 Emotions\n情緒', color: 'orange' },
        { label: '😫 Pain Points\n痛點', color: 'red' },
        { label: '💡 Opportunities\n機會點', color: 'green' },
      ]
      // Stage headers
      stages.forEach((stage, i) => {
        editor.createShape({ id: createShapeId(), type: 'geo', x: cx - 580 + i * 240, y: cy - 380,
          props: { geo: 'rectangle', w: 220, h: 50, fill: 'solid', color: 'black' as any, dash: 'draw', size: 's', font: 'draw', align: 'middle', verticalAlign: 'middle', growY: 0, url: '', scale: 1, labelColor: 'white', richText: toRichText(stage) } })
      })
      // Row labels + cells
      rows.forEach((row, r) => {
        editor.createShape({ id: createShapeId(), type: 'geo', x: cx - 810, y: cy - 310 + r * 110,
          props: { geo: 'rectangle', w: 210, h: 100, fill: 'semi', color: row.color as any, dash: 'draw', size: 's', font: 'draw', align: 'middle', verticalAlign: 'middle', growY: 0, url: '', scale: 1, labelColor: 'black', richText: toRichText(row.label) } })
        stages.forEach((_, i) => {
          editor.createShape({ id: createShapeId(), type: 'geo', x: cx - 580 + i * 240, y: cy - 310 + r * 110,
            props: { geo: 'rectangle', w: 220, h: 100, fill: 'none', color: 'grey' as any, dash: 'draw', size: 's', font: 'draw', align: 'middle', verticalAlign: 'start', growY: 0, url: '', scale: 1, labelColor: 'black', richText: toRichText('') } })
        })
      })
    },
  },
  {
    id: 'crazy-8s',
    category: 'brainstorm',
    name: 'Crazy 8s',
    icon: '🎲',
    description: '8分鐘 × 8個 idea 快速發散',
    create: (editor: Editor) => {
      const b = editor.getViewportPageBounds()
      const cx = b.x + b.w / 2, cy = b.y + b.h / 2
      editor.createShape({ id: createShapeId(), type: 'text', x: cx - 200, y: cy - 440,
        props: { richText: toRichText('🎲 Crazy 8s — 8 Ideas in 8 Minutes'), size: 'xl' as any, color: 'black' as any, w: 680, autoSize: true, scale: 1, textAlign: 'middle' as any, font: 'draw' as any } })
      const labels = ['Idea 1', 'Idea 2', 'Idea 3', 'Idea 4', 'Idea 5', 'Idea 6', 'Idea 7', 'Idea 8']
      labels.forEach((label, i) => {
        const col = i % 4
        const row = Math.floor(i / 4)
        editor.createShape({ id: createShapeId(), type: 'geo', x: cx - 620 + col * 320, y: cy - 360 + row * 330,
          props: { geo: 'rectangle', w: 300, h: 310, fill: 'semi', color: 'grey' as any, dash: 'draw', size: 'm', font: 'draw', align: 'middle', verticalAlign: 'start', growY: 0, url: '', scale: 1, labelColor: 'black', richText: toRichText(label) } })
      })
    },
  },

]

// Timer display component
function TimerDisplay({ endTime, onStop, isFacilitator }: { endTime: number; onStop: () => void; isFacilitator: boolean }) {
  const [remaining, setRemaining] = useState(Math.max(0, Math.ceil((endTime - Date.now()) / 1000)))
  const [bigNum, setBigNum] = useState<number | null>(null)
  const [showDone, setShowDone] = useState(false)
  const toastedRef = useRef(false)

  useEffect(() => {
    const interval = setInterval(() => {
      const r = Math.max(0, Math.ceil((endTime - Date.now()) / 1000))
      setRemaining(r)
      if (r <= 3 && r > 0) {
        setBigNum(r)
        setShowDone(false)
      } else if (r === 0) {
        setBigNum(null)
        if (!toastedRef.current) {
          toastedRef.current = true
          setShowDone(true)
          toast('⏰ 時間到！', { duration: 4000 })
          setTimeout(() => setShowDone(false), 2000)
        }
        clearInterval(interval)
      } else {
        setBigNum(null)
        setShowDone(false)
      }
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
          <button onClick={onStop} className="ml-1 p-0.5 hover:bg-red-200 rounded">
            <Square size={10} />
          </button>
        )}
      </div>

      {bigNum !== null && (
        <div key={`big-${bigNum}`} style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.55)', pointerEvents: 'none',
          animation: 'countdown-pop 0.9s ease-out forwards',
        }}>
          <div style={{
            fontSize: 'min(40vw, 40vh)',
            fontWeight: 900,
            lineHeight: 1,
            color: bigNum === 1 ? '#ef4444' : bigNum === 2 ? '#f97316' : '#22c55e',
            textShadow: '0 4px 30px rgba(255,255,255,0.4)',
            fontFamily: 'system-ui, sans-serif',
          }}>
            {bigNum}
          </div>
        </div>
      )}

      {showDone && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.4)', pointerEvents: 'none',
          animation: 'countdown-pop 1s ease-out forwards',
        }}>
          <div style={{ fontSize: 'min(25vw, 25vh)', lineHeight: 1 }}>⏰</div>
        </div>
      )}
    </>
  )
}
export default function BrainstormToolbar({ editor, socket, isFacilitator, sessionState, onSessionUpdate, voteMap, myVotesRemaining }: Props) {
  const [showTemplates, setShowTemplates] = useState(false)
  const [showTimer, setShowTimer] = useState(false)
  const [timerMinutes, setTimerMinutes] = useState(5)
  const [showVoting, setShowVoting] = useState(false)
  const [templateTab, setTemplateTab] = useState<string>('all')
  const [maxVotes, setMaxVotes] = useState(5)
  const [showAI, setShowAI] = useState(false)
  const [aiLoading, setAILoading] = useState(false)
  const [aiResult, setAIResult] = useState('')

  const voting = sessionState?.voting
  const timer = sessionState?.timer
  const anonymousMode = sessionState?.anonymousMode || false
  const cursorsLocked = sessionState?.cursorsLocked || false

  const startVoting = () => {
    socket?.emit('vote:start', { maxVotes })
    setShowVoting(false)
    toast.success(`投票開始！每人 ${maxVotes} 票`)
  }

  const endVoting = () => {
    socket?.emit('vote:end')
    toast.success('投票結束')
  }

  const startTimer = () => {
    socket?.emit('timer:start', { duration: timerMinutes * 60 })
    setShowTimer(false)
    toast.success(`計時器啟動：${timerMinutes} 分鐘`)
  }

  const stopTimer = () => {
    socket?.emit('timer:stop')
  }

  const toggleAnonymous = () => {
    socket?.emit('anonymous:toggle')
  }

  const toggleLockCursors = () => {
    socket?.emit('facilitator:lock-cursors', { locked: !cursorsLocked })
  }

  const spotlightCurrent = () => {
    if (!editor) return
    const b = editor.getViewportPageBounds()
    socket?.emit('facilitator:spotlight', { bounds: { x: b.x, y: b.y, w: b.w, h: b.h } })
    toast.success('Spotlight 已發送給所有人')
  }

  const loadTemplate = (template: typeof TEMPLATES[0]) => {
    if (!editor) return
    const beforeIds = new Set([...editor.getCurrentPageShapeIds()])
    template.create(editor)
    setTimeout(() => {
      try {
        const afterIds = [...editor.getCurrentPageShapeIds()]
        const newIds = afterIds.filter(id => !beforeIds.has(id))
        if (newIds.length > 0) editor.setSelectedShapes(newIds)
        ;(editor as any).zoomToFit?.()
      } catch {}
    }, 100)
    setShowTemplates(false)
    toast.success(`已載入模板：${template.name}`)
  }

  const runAIInsights = async () => {
    if (!editor) return
    setAILoading(true)
    setShowAI(true)
    try {
      const shapes = [...editor.getCurrentPageShapeIds()].map(id => {
        const s = editor.getShape(id) as any
        return { type: s?.type || 'shape', text: s?.props?.text || '' }
      }).filter(s => s.text && s.text.length > 1)

      if (!shapes.length) {
        setAIResult('畫布上沒有文字內容，請先加入一些便利貼或文字。')
        setAILoading(false)
        return
      }

      const response = await fetch('/api/ai/board-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken') || sessionStorage.getItem('guestToken') || ''}`,
        },
        body: JSON.stringify({
          elements: shapes,
          format: 'brainstorm-insights',
        }),
      })
      const data = await response.json()
      setAIResult(data.content || data.message || JSON.stringify(data))
    } catch (e) {
      setAIResult('分析失敗，請重試。')
    } finally {
      setAILoading(false)
    }
  }

  return (
    <>
      {/* Main toolbar */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {/* Timer display or start button */}
        {timer?.active && timer.endTime ? (
          <TimerDisplay endTime={timer.endTime} onStop={stopTimer} isFacilitator={isFacilitator} />
        ) : isFacilitator ? (
          <div className="relative">
            <button onClick={() => setShowTimer(v => !v)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:text-teal-600 hover:bg-teal-50 rounded-lg border border-gray-200 transition-colors">
              <Timer size={13} /> 計時器
            </button>
            {showTimer && (
              <div className="absolute top-10 left-0 bg-white border border-gray-200 rounded-xl shadow-xl p-4 z-50 w-52">
                <p className="text-xs font-semibold text-gray-600 mb-2">設定時間（分鐘）</p>
                <div className="flex gap-1.5 flex-wrap mb-3">
                  {[1, 2, 3, 5, 10, 15].map(m => (
                    <button key={m} onClick={() => setTimerMinutes(m)}
                      className={`px-2 py-1 rounded text-xs font-medium ${timerMinutes === m ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                      {m}m
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input type="number" value={timerMinutes} onChange={e => setTimerMinutes(Number(e.target.value))} min={1} max={60}
                    className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500" />
                  <button onClick={startTimer}
                    className="px-3 py-1 bg-teal-600 text-white text-xs font-medium rounded-lg hover:bg-teal-700 flex items-center gap-1">
                    <Play size={11} /> 開始
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
            <button
              onClick={() => {
                if (!editor) return
                const id = createShapeId()
                const b = editor.getViewportPageBounds()
                editor.createShape({ id, type: "vote-item", x: b.x + b.w/2 - 100, y: b.y + b.h/2 - 60, props: { w: 200, h: 120, label: "Vote Item", color: "yellow" } } as any)
                editor.setEditingShape(id)
              }}
              className="px-1.5 py-0.5 bg-yellow-300 hover:bg-yellow-400 rounded text-xs text-yellow-900"
            >+ Add</button>
            {isFacilitator && (
              <button onClick={endVoting} className="ml-1 px-1.5 py-0.5 bg-red-200 hover:bg-red-300 rounded text-xs text-red-700">End</button>
            )}
          </div>
        ) : isFacilitator ? (
          <div className="relative">
            <button onClick={() => setShowVoting(v => !v)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg border border-gray-200 transition-colors">
              <Vote size={13} /> 點投票
            </button>
            {showVoting && (
              <div className="absolute top-10 left-0 bg-white border border-gray-200 rounded-xl shadow-xl p-4 z-50 w-48">
                <p className="text-xs font-semibold text-gray-600 mb-2">每人票數</p>
                <div className="flex gap-1.5 flex-wrap mb-3">
                  {[3, 5, 8, 10].map(n => (
                    <button key={n} onClick={() => setMaxVotes(n)}
                      className={`px-2 py-1 rounded text-xs font-medium ${maxVotes === n ? 'bg-yellow-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                      {n}票
                    </button>
                  ))}
                </div>
                <button onClick={startVoting}
                  className="w-full py-1.5 bg-yellow-500 text-white text-xs font-semibold rounded-lg hover:bg-yellow-600 flex items-center justify-center gap-1">
                  <Vote size={11} /> 開始投票
                </button>
              </div>
            )}
          </div>
        ) : null}

        {/* Templates */}
        <div className="relative">
          <button onClick={() => setShowTemplates(v => !v)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg border border-gray-200 transition-colors">
            <LayoutTemplate size={13} /> 模板
          </button>
          {showTemplates && (
            <div className="absolute top-10 left-0 bg-white border border-gray-200 rounded-2xl shadow-2xl z-50 w-72" style={{ maxHeight: '70vh', display: 'flex', flexDirection: 'column' }}>
              <div className="px-3 pt-3 pb-2 border-b border-gray-100 shrink-0">
                <p className="text-xs font-semibold text-gray-500 mb-2">選擇模板</p>
                <div className="flex gap-1 flex-wrap">
                  {[
                    { id: 'all', label: '全部', emoji: '📋' },
                    { id: 'brainstorm', label: '腦暴', emoji: '💡' },
                    { id: 'retro', label: '回顧', emoji: '🔄' },
                    { id: 'agile', label: 'Agile', emoji: '🚂' },
                    { id: 'strategy', label: '策略', emoji: '🎯' },
                    { id: 'design', label: '設計', emoji: '❤️' },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setTemplateTab(tab.id)}
                      className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
                        templateTab === tab.id
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      <span>{tab.emoji}</span>
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="overflow-y-auto flex-1 p-1.5">
                {TEMPLATES.filter(t => templateTab === 'all' || (t as any).category === templateTab).map(t => (
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
            </div>
          )}
        </div>

        {/* Anonymous Mode */}
        {isFacilitator && (
          <button onClick={toggleAnonymous}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors ${anonymousMode ? 'bg-gray-800 text-white border-gray-700' : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100 border-gray-200'}`}>
            <EyeOff size={13} /> {anonymousMode ? '匿名中' : '匿名'}
          </button>
        )}

        {/* AI Insights */}
        <button onClick={runAIInsights}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:text-teal-600 hover:bg-teal-50 rounded-lg border border-gray-200 transition-colors">
          <Brain size={13} /> AI 分析
        </button>

        {/* Facilitator controls */}
        {isFacilitator && (
          <>
            <button onClick={spotlightCurrent} title="同步所有人視角到我的當前位置"
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:text-orange-600 hover:bg-orange-50 rounded-lg border border-gray-200 transition-colors">
              <Crosshair size={13} /> Spotlight
            </button>
            <button onClick={toggleLockCursors} title="鎖定/解鎖其他人的游標移動"
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors ${cursorsLocked ? 'bg-red-100 text-red-600 border-red-300' : 'text-gray-600 hover:text-red-600 hover:bg-red-50 border-gray-200'}`}>
              {cursorsLocked ? <Lock size={13} /> : <Unlock size={13} />}
              {cursorsLocked ? '解鎖' : '鎖游標'}
            </button>
          </>
        )}

        {!isFacilitator && (
          <span className="text-xs text-gray-400 px-1">👁️ 觀察者</span>
        )}
      </div>

      {/* AI Insights Modal */}
      {showAI && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b shrink-0">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2"><Brain size={16} className="text-teal-600" /> AI Brainstorm 分析</h3>
              <button onClick={() => setShowAI(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X size={18} className="text-gray-500" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              {aiLoading ? (
                <div className="flex flex-col items-center justify-center h-40 gap-3">
                  <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-gray-500">AI 正在分析畫布內容...</p>
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
