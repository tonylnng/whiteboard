export interface ShapeTemplate {
  id: string
  label: string
  preview: string
  create: (cx: number, cy: number) => ShapeSpec[]
}

export interface ShapeSpec {
  type: 'geo' | 'text'
  x: number
  y: number
  props: Record<string, any>
}

export interface ShapeCategory {
  id: string
  label: string
  icon: string
  shapes: ShapeTemplate[]
}

// All valid geo types in tldraw v3:
// rectangle, ellipse, triangle, diamond, pentagon, hexagon, octagon, star,
// rhombus, oval, trapezoid, cloud, cross, heart, x-box, check-box

function makeGeoProps(geo: string, w: number, h: number, color: string = 'black', fill: string = 'none'): Record<string, any> {
  return {
    geo, w, h, fill, color,
    dash: 'draw', size: 'm', font: 'draw',
    align: 'middle', verticalAlign: 'middle',
    growY: 0, url: '', scale: 1, labelColor: 'black',
  }
}

function g(geo: string, w: number, h: number, color = 'black', fill = 'none', dx = 0, dy = 0): ShapeSpec {
  return { type: 'geo', x: dx, y: dy, props: makeGeoProps(geo, w, h, color, fill) }
}

export const SHAPE_CATEGORIES: ShapeCategory[] = [
  {
    id: 'flowchart',
    label: 'Flowchart',
    icon: '🔄',
    shapes: [
      {
        id: 'fc-process',
        label: 'Process',
        preview: `<svg viewBox="0 0 60 36" fill="none"><rect x="2" y="2" width="56" height="32" rx="2" stroke="#333" stroke-width="2"/><text x="30" y="22" text-anchor="middle" font-size="9" fill="#333">Process</text></svg>`,
        create: (cx, cy) => [{ ...g('rectangle', 160, 80), x: cx - 80, y: cy - 40 }],
      },
      {
        id: 'fc-decision',
        label: 'Decision',
        preview: `<svg viewBox="0 0 60 48" fill="none"><polygon points="30,2 58,24 30,46 2,24" stroke="#333" stroke-width="2"/><text x="30" y="28" text-anchor="middle" font-size="8" fill="#333">Yes/No</text></svg>`,
        create: (cx, cy) => [{ ...g('diamond', 160, 100), x: cx - 80, y: cy - 50 }],
      },
      {
        id: 'fc-terminal',
        label: 'Start/End',
        preview: `<svg viewBox="0 0 60 32" fill="none"><rect x="2" y="2" width="56" height="28" rx="14" stroke="#2f9e44" stroke-width="2"/><text x="30" y="20" text-anchor="middle" font-size="9" fill="#2f9e44">Start</text></svg>`,
        create: (cx, cy) => [{ ...g('oval', 140, 60, 'green'), x: cx - 70, y: cy - 30 }],
      },
      {
        id: 'fc-data',
        label: 'Data (I/O)',
        preview: `<svg viewBox="0 0 60 36" fill="none"><polygon points="8,2 58,2 52,34 2,34" stroke="#1971c2" stroke-width="2"/><text x="30" y="22" text-anchor="middle" font-size="9" fill="#1971c2">Data</text></svg>`,
        create: (cx, cy) => [{ ...g('trapezoid', 160, 80, 'blue'), x: cx - 80, y: cy - 40 }],
      },
      {
        id: 'fc-database',
        label: 'Database',
        preview: `<svg viewBox="0 0 50 52" fill="none"><ellipse cx="25" cy="10" rx="22" ry="8" stroke="#0c8599" stroke-width="2"/><path d="M3 10 V42" stroke="#0c8599" stroke-width="2"/><path d="M47 10 V42" stroke="#0c8599" stroke-width="2"/><ellipse cx="25" cy="42" rx="22" ry="8" stroke="#0c8599" stroke-width="2"/><ellipse cx="25" cy="26" rx="22" ry="8" stroke="#0c8599" stroke-width="1" stroke-dasharray="3 3"/></svg>`,
        create: (cx, cy) => [{ ...g('ellipse', 100, 90, 'light-blue', 'semi'), x: cx - 50, y: cy - 45 }],
      },
      {
        id: 'fc-connector',
        label: 'Connector',
        preview: `<svg viewBox="0 0 40 40" fill="none"><circle cx="20" cy="20" r="17" stroke="#f08c00" stroke-width="2"/><text x="20" y="25" text-anchor="middle" font-size="12" fill="#f08c00">A</text></svg>`,
        create: (cx, cy) => [{ ...g('ellipse', 60, 60, 'orange'), x: cx - 30, y: cy - 30 }],
      },
      {
        id: 'fc-document',
        label: 'Document',
        preview: `<svg viewBox="0 0 60 44" fill="none"><path d="M2 2 H58 V34 Q45 44 30 36 Q15 28 2 38 Z" stroke="#333" stroke-width="2"/><text x="30" y="20" text-anchor="middle" font-size="9" fill="#333">Doc</text></svg>`,
        create: (cx, cy) => [{ ...g('rhombus', 160, 80), x: cx - 80, y: cy - 40 }],
      },
    ],
  },

  {
    id: 'bpmn',
    label: 'BPMN',
    icon: '📋',
    shapes: [
      {
        id: 'bpmn-start',
        label: 'Start Event',
        preview: `<svg viewBox="0 0 40 40" fill="none"><circle cx="20" cy="20" r="17" stroke="#2f9e44" stroke-width="2.5"/></svg>`,
        create: (cx, cy) => [{ ...g('ellipse', 50, 50, 'green'), x: cx - 25, y: cy - 25 }],
      },
      {
        id: 'bpmn-end',
        label: 'End Event',
        preview: `<svg viewBox="0 0 40 40" fill="none"><circle cx="20" cy="20" r="17" stroke="#e03131" stroke-width="4"/></svg>`,
        create: (cx, cy) => [{ ...g('ellipse', 50, 50, 'red', 'solid'), x: cx - 25, y: cy - 25 }],
      },
      {
        id: 'bpmn-task',
        label: 'Task',
        preview: `<svg viewBox="0 0 70 44" fill="none"><rect x="2" y="2" width="66" height="40" rx="8" stroke="#1971c2" stroke-width="2"/><text x="35" y="26" text-anchor="middle" font-size="10" fill="#1971c2">Task</text></svg>`,
        create: (cx, cy) => [{ ...g('rectangle', 160, 80, 'blue'), x: cx - 80, y: cy - 40 }],
      },
      {
        id: 'bpmn-gateway-xor',
        label: 'XOR Gateway',
        preview: `<svg viewBox="0 0 44 44" fill="none"><polygon points="22,2 42,22 22,42 2,22" stroke="#f08c00" stroke-width="2"/><text x="22" y="28" text-anchor="middle" font-size="18" fill="#f08c00">×</text></svg>`,
        create: (cx, cy) => [{ ...g('diamond', 80, 80, 'orange'), x: cx - 40, y: cy - 40 }],
      },
      {
        id: 'bpmn-gateway-and',
        label: 'AND Gateway',
        preview: `<svg viewBox="0 0 44 44" fill="none"><polygon points="22,2 42,22 22,42 2,22" stroke="#f08c00" stroke-width="2"/><text x="22" y="28" text-anchor="middle" font-size="18" fill="#f08c00">+</text></svg>`,
        create: (cx, cy) => [{ ...g('diamond', 80, 80, 'orange'), x: cx - 40, y: cy - 40 }],
      },
      {
        id: 'bpmn-gateway-or',
        label: 'OR Gateway',
        preview: `<svg viewBox="0 0 44 44" fill="none"><polygon points="22,2 42,22 22,42 2,22" stroke="#f08c00" stroke-width="2"/><circle cx="22" cy="22" r="8" stroke="#f08c00" stroke-width="2" fill="none"/></svg>`,
        create: (cx, cy) => [{ ...g('diamond', 80, 80, 'orange'), x: cx - 40, y: cy - 40 }],
      },
      {
        id: 'bpmn-pool',
        label: 'Pool / Lane',
        preview: `<svg viewBox="0 0 80 50" fill="none"><rect x="2" y="2" width="76" height="46" stroke="#333" stroke-width="2"/><line x1="18" y1="2" x2="18" y2="48" stroke="#333" stroke-width="2"/></svg>`,
        create: (cx, cy) => [{ ...g('rectangle', 500, 180, 'grey'), x: cx - 250, y: cy - 90 }],
      },
      {
        id: 'bpmn-subprocess',
        label: 'Sub-Process',
        preview: `<svg viewBox="0 0 70 50" fill="none"><rect x="2" y="2" width="66" height="46" rx="4" stroke="#333" stroke-width="2"/><rect x="28" y="36" width="14" height="10" rx="2" stroke="#333" stroke-width="1.5"/><text x="35" y="44" text-anchor="middle" font-size="9" fill="#333">+</text></svg>`,
        create: (cx, cy) => [{ ...g('rectangle', 200, 120, 'grey'), x: cx - 100, y: cy - 60 }],
      },
      {
        id: 'bpmn-message',
        label: 'Message Event',
        preview: `<svg viewBox="0 0 40 40" fill="none"><circle cx="20" cy="20" r="17" stroke="#1971c2" stroke-width="2"/><rect x="10" y="12" width="20" height="16" stroke="#1971c2" stroke-width="1.5"/><polyline points="10,12 20,20 30,12" stroke="#1971c2" stroke-width="1.5"/></svg>`,
        create: (cx, cy) => [{ ...g('ellipse', 50, 50, 'blue'), x: cx - 25, y: cy - 25 }],
      },
    ],
  },

  {
    id: 'sequence',
    label: 'Sequence',
    icon: '📐',
    shapes: [
      {
        id: 'seq-actor',
        label: 'Actor',
        preview: `<svg viewBox="0 0 40 56" fill="none"><circle cx="20" cy="11" r="9" stroke="#333" stroke-width="2"/><line x1="20" y1="20" x2="20" y2="38" stroke="#333" stroke-width="2"/><line x1="6" y1="28" x2="34" y2="28" stroke="#333" stroke-width="2"/><line x1="20" y1="38" x2="10" y2="54" stroke="#333" stroke-width="2"/><line x1="20" y1="38" x2="30" y2="54" stroke="#333" stroke-width="2"/></svg>`,
        create: (cx, cy) => [{ ...g('ellipse', 50, 50, 'black'), x: cx - 25, y: cy - 25 }],
      },
      {
        id: 'seq-lifeline-box',
        label: 'Lifeline Box',
        preview: `<svg viewBox="0 0 60 28" fill="none"><rect x="2" y="2" width="56" height="24" stroke="#1971c2" stroke-width="2"/><text x="30" y="18" text-anchor="middle" font-size="9" fill="#1971c2">:Object</text></svg>`,
        create: (cx, cy) => [{ ...g('rectangle', 120, 50, 'blue'), x: cx - 60, y: cy - 25 }],
      },
      {
        id: 'seq-activation',
        label: 'Activation',
        preview: `<svg viewBox="0 0 20 60" fill="none"><rect x="5" y="2" width="10" height="56" stroke="#1971c2" stroke-width="2" fill="#dbe4ff"/></svg>`,
        create: (cx, cy) => [{ ...g('rectangle', 20, 120, 'blue', 'semi'), x: cx - 10, y: cy - 60 }],
      },
      {
        id: 'seq-boundary',
        label: 'Boundary',
        preview: `<svg viewBox="0 0 50 50" fill="none"><circle cx="30" cy="25" r="18" stroke="#333" stroke-width="2"/><line x1="2" y1="10" x2="2" y2="40" stroke="#333" stroke-width="3"/><line x1="2" y1="25" x2="12" y2="25" stroke="#333" stroke-width="2"/></svg>`,
        create: (cx, cy) => [{ ...g('ellipse', 80, 80, 'black'), x: cx - 40, y: cy - 40 }],
      },
    ],
  },

  {
    id: 'erd',
    label: 'ERD',
    icon: '🗄️',
    shapes: [
      {
        id: 'erd-entity',
        label: 'Entity',
        preview: `<svg viewBox="0 0 70 44" fill="none"><rect x="2" y="2" width="66" height="40" stroke="#7048e8" stroke-width="2.5"/><text x="35" y="26" text-anchor="middle" font-size="10" font-weight="bold" fill="#7048e8">Entity</text></svg>`,
        create: (cx, cy) => [{ ...g('rectangle', 160, 80, 'violet'), x: cx - 80, y: cy - 40 }],
      },
      {
        id: 'erd-attribute',
        label: 'Attribute',
        preview: `<svg viewBox="0 0 60 36" fill="none"><ellipse cx="30" cy="18" rx="27" ry="15" stroke="#7048e8" stroke-width="2"/><text x="30" y="22" text-anchor="middle" font-size="9" fill="#7048e8">attribute</text></svg>`,
        create: (cx, cy) => [{ ...g('ellipse', 140, 60, 'violet'), x: cx - 70, y: cy - 30 }],
      },
      {
        id: 'erd-key-attr',
        label: 'Key Attribute',
        preview: `<svg viewBox="0 0 60 36" fill="none"><ellipse cx="30" cy="18" rx="27" ry="15" stroke="#7048e8" stroke-width="2"/><text x="30" y="22" text-anchor="middle" font-size="9" text-decoration="underline" fill="#7048e8">PK attr</text></svg>`,
        create: (cx, cy) => [{ ...g('ellipse', 140, 60, 'violet', 'semi'), x: cx - 70, y: cy - 30 }],
      },
      {
        id: 'erd-relationship',
        label: 'Relationship',
        preview: `<svg viewBox="0 0 60 44" fill="none"><polygon points="30,2 58,22 30,42 2,22" stroke="#7048e8" stroke-width="2"/><text x="30" y="26" text-anchor="middle" font-size="9" fill="#7048e8">has</text></svg>`,
        create: (cx, cy) => [{ ...g('diamond', 140, 80, 'violet'), x: cx - 70, y: cy - 40 }],
      },
      {
        id: 'erd-weak-entity',
        label: 'Weak Entity',
        preview: `<svg viewBox="0 0 70 44" fill="none"><rect x="2" y="2" width="66" height="40" stroke="#7048e8" stroke-width="2.5"/><rect x="7" y="7" width="56" height="30" stroke="#7048e8" stroke-width="1.5" fill="none"/><text x="35" y="26" text-anchor="middle" font-size="9" fill="#7048e8">Weak</text></svg>`,
        create: (cx, cy) => [{ ...g('rectangle', 160, 80, 'violet', 'semi'), x: cx - 80, y: cy - 40 }],
      },
    ],
  },

  {
    id: 'network',
    label: 'Network',
    icon: '🌐',
    shapes: [
      {
        id: 'net-server',
        label: 'Server',
        preview: `<svg viewBox="0 0 50 60" fill="none"><rect x="4" y="4" width="42" height="14" rx="3" stroke="#0c8599" stroke-width="2"/><circle cx="10" cy="11" r="3" fill="#0c8599"/><rect x="4" y="22" width="42" height="14" rx="3" stroke="#0c8599" stroke-width="2"/><circle cx="10" cy="29" r="3" fill="#0c8599"/><rect x="4" y="40" width="42" height="14" rx="3" stroke="#0c8599" stroke-width="2"/><circle cx="10" cy="47" r="3" fill="#0c8599"/></svg>`,
        create: (cx, cy) => [{ ...g('rectangle', 120, 80, 'light-blue'), x: cx - 60, y: cy - 40 }],
      },
      {
        id: 'net-database',
        label: 'Database',
        preview: `<svg viewBox="0 0 50 58" fill="none"><ellipse cx="25" cy="11" rx="22" ry="8" stroke="#0c8599" stroke-width="2"/><line x1="3" y1="11" x2="3" y2="47" stroke="#0c8599" stroke-width="2"/><line x1="47" y1="11" x2="47" y2="47" stroke="#0c8599" stroke-width="2"/><ellipse cx="25" cy="47" rx="22" ry="8" stroke="#0c8599" stroke-width="2" fill="#e3fafc"/><ellipse cx="25" cy="29" rx="22" ry="8" stroke="#0c8599" stroke-width="1" stroke-dasharray="4 3"/></svg>`,
        create: (cx, cy) => [{ ...g('trapezoid', 100, 80, 'light-blue', 'semi'), x: cx - 50, y: cy - 40 }],
      },
      {
        id: 'net-cloud',
        label: 'Cloud',
        preview: `<svg viewBox="0 0 60 44" fill="none"><path d="M10 34 Q4 34 4 26 Q4 18 14 18 Q14 10 24 10 Q32 10 34 18 Q42 16 44 24 Q48 24 48 30 Q48 34 42 34 Z" stroke="#0c8599" stroke-width="2"/></svg>`,
        create: (cx, cy) => [{ ...g('cloud', 180, 100, 'light-blue'), x: cx - 90, y: cy - 50 }],
      },
      {
        id: 'net-user',
        label: 'User / Client',
        preview: `<svg viewBox="0 0 40 50" fill="none"><circle cx="20" cy="13" r="11" stroke="#0c8599" stroke-width="2"/><path d="M4 46 Q4 32 20 32 Q36 32 36 46" stroke="#0c8599" stroke-width="2" fill="none"/></svg>`,
        create: (cx, cy) => [{ ...g('ellipse', 80, 80, 'light-blue'), x: cx - 40, y: cy - 40 }],
      },
      {
        id: 'net-firewall',
        label: 'Firewall',
        preview: `<svg viewBox="0 0 48 48" fill="none"><rect x="4" y="4" width="40" height="40" rx="4" stroke="#e03131" stroke-width="2"/><path d="M18 4 L18 44 M30 4 L30 44 M4 18 L44 18 M4 30 L44 30" stroke="#e03131" stroke-width="1.5"/></svg>`,
        create: (cx, cy) => [{ ...g('cross', 100, 100, 'red'), x: cx - 50, y: cy - 50 }],
      },
      {
        id: 'net-router',
        label: 'Router',
        preview: `<svg viewBox="0 0 50 50" fill="none"><circle cx="25" cy="25" r="22" stroke="#0c8599" stroke-width="2"/><path d="M25 3 L25 47 M3 25 L47 25" stroke="#0c8599" stroke-width="1.5"/><circle cx="25" cy="25" r="10" stroke="#0c8599" stroke-width="1.5"/></svg>`,
        create: (cx, cy) => [{ ...g('ellipse', 100, 100, 'light-blue'), x: cx - 50, y: cy - 50 }],
      },
      {
        id: 'net-load-balancer',
        label: 'Load Balancer',
        preview: `<svg viewBox="0 0 50 50" fill="none"><polygon points="25,4 46,25 25,46 4,25" stroke="#0c8599" stroke-width="2"/><text x="25" y="29" text-anchor="middle" font-size="8" fill="#0c8599">LB</text></svg>`,
        create: (cx, cy) => [{ ...g('diamond', 100, 100, 'light-blue'), x: cx - 50, y: cy - 50 }],
      },
    ],
  },

  {
    id: 'wireframe',
    label: 'Wireframe',
    icon: '🖼️',
    shapes: [
      {
        id: 'wf-button',
        label: 'Button',
        preview: `<svg viewBox="0 0 70 32" fill="none"><rect x="2" y="2" width="66" height="28" rx="5" stroke="#333" stroke-width="2" fill="#e9ecef"/><text x="35" y="20" text-anchor="middle" font-size="10" fill="#333">Button</text></svg>`,
        create: (cx, cy) => [{ ...g('rectangle', 120, 44, 'grey', 'semi'), x: cx - 60, y: cy - 22 }],
      },
      {
        id: 'wf-input',
        label: 'Input Field',
        preview: `<svg viewBox="0 0 80 28" fill="none"><rect x="2" y="2" width="76" height="24" rx="3" stroke="#aaa" stroke-width="1.5"/><text x="8" y="18" font-size="9" fill="#aaa">Placeholder...</text></svg>`,
        create: (cx, cy) => [{ ...g('rectangle', 240, 44, 'grey', 'none'), x: cx - 120, y: cy - 22 }],
      },
      {
        id: 'wf-card',
        label: 'Card',
        preview: `<svg viewBox="0 0 70 56" fill="none"><rect x="2" y="2" width="66" height="52" rx="6" stroke="#333" stroke-width="2"/><rect x="2" y="2" width="66" height="18" rx="6" fill="#e9ecef" stroke="none"/><line x1="2" y1="19" x2="68" y2="19" stroke="#ddd" stroke-width="1"/></svg>`,
        create: (cx, cy) => [{ ...g('rectangle', 240, 160, 'grey', 'none'), x: cx - 120, y: cy - 80 }],
      },
      {
        id: 'wf-modal',
        label: 'Modal',
        preview: `<svg viewBox="0 0 80 60" fill="none"><rect x="0" y="0" width="80" height="60" fill="rgba(0,0,0,0.15)"/><rect x="10" y="8" width="60" height="44" rx="4" stroke="#333" stroke-width="2" fill="white"/><rect x="10" y="8" width="60" height="14" rx="4" fill="#333"/><text x="40" y="19" text-anchor="middle" font-size="8" fill="white">Header</text></svg>`,
        create: (cx, cy) => [{ ...g('rectangle', 320, 220, 'black', 'semi'), x: cx - 160, y: cy - 110 }],
      },
      {
        id: 'wf-navbar',
        label: 'Navbar',
        preview: `<svg viewBox="0 0 80 18" fill="none"><rect x="0" y="0" width="80" height="18" fill="#343a40"/><text x="6" y="13" font-size="7" fill="white" font-weight="bold">LOGO</text><text x="42" y="12" font-size="6" fill="#adb5bd">Menu</text><text x="56" y="12" font-size="6" fill="#adb5bd">About</text></svg>`,
        create: (cx, cy) => [{ ...g('rectangle', 600, 50, 'black', 'solid'), x: cx - 300, y: cy - 25 }],
      },
      {
        id: 'wf-image',
        label: 'Image Box',
        preview: `<svg viewBox="0 0 60 44" fill="none"><rect x="2" y="2" width="56" height="40" stroke="#aaa" stroke-width="2"/><line x1="2" y1="2" x2="58" y2="42" stroke="#aaa" stroke-width="1.5"/><line x1="58" y1="2" x2="2" y2="42" stroke="#aaa" stroke-width="1.5"/></svg>`,
        create: (cx, cy) => [{ ...g('rectangle', 200, 140, 'grey', 'semi'), x: cx - 100, y: cy - 70 }],
      },
      {
        id: 'wf-checkbox',
        label: 'Checkbox',
        preview: `<svg viewBox="0 0 40 18" fill="none"><rect x="2" y="2" width="14" height="14" rx="2" stroke="#333" stroke-width="2"/><text x="20" y="13" font-size="9" fill="#333">Option</text></svg>`,
        create: (cx, cy) => [{ ...g('check-box', 100, 40, 'grey'), x: cx - 50, y: cy - 20 }],
      },
    ],
  },
]
