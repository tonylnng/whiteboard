import { ShapeUtil, HTMLContainer, Rectangle2d } from 'tldraw'
import type { TLBaseShape, TLResizeInfo } from 'tldraw'
import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer, LabelList } from 'recharts'

export type VoteChartShapeProps = {
  w: number
  h: number
  chartData: Array<{ name: string; votes: number }>
  totalVotes: number
}

export type VoteChartShape = TLBaseShape<'vote-chart', VoteChartShapeProps>

const COLORS = ['#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444', '#f97316', '#06b6d4', '#84cc16']
const MEDALS = ['🥇', '🥈', '🥉']

export class VoteChartShapeUtil extends ShapeUtil<VoteChartShape> {
  static override type = 'vote-chart' as const

  override getDefaultProps(): VoteChartShapeProps {
    return { w: 480, h: 360, chartData: [], totalVotes: 0 }
  }

  override getGeometry(shape: VoteChartShape) {
    return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true })
  }

  override component(shape: VoteChartShape) {
    const { w, h, chartData, totalVotes } = shape.props
    const maxVotes = chartData[0]?.votes || 1

    return (
      <HTMLContainer
        id={shape.id}
        style={{ width: w, height: h, pointerEvents: 'all', overflow: 'hidden' }}
      >
        <div style={{
          width: '100%',
          height: '100%',
          background: '#ffffff',
          borderRadius: 12,
          border: '1.5px solid #e5e7eb',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          display: 'flex',
          flexDirection: 'column',
          padding: '16px',
          boxSizing: 'border-box',
          fontFamily: 'system-ui, sans-serif',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexShrink: 0 }}>
            <span style={{ fontSize: 22 }}>🏆</span>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#1f2937', lineHeight: 1.2 }}>Vote Results</div>
              <div style={{ fontSize: 11, color: '#6b7280' }}>{totalVotes} votes total</div>
            </div>
          </div>
          <div style={{ flex: 1, minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 4, right: 60, left: 8, bottom: 4 }}
              >
                <XAxis
                  type="number"
                  domain={[0, maxVotes]}
                  allowDecimals={false}
                  tick={{ fontSize: 10, fill: '#9ca3af' }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={140}
                  tick={({ x, y, payload, index }: any) => (
                    <text x={x} y={y} dy={4} textAnchor="end" fontSize={12} fill="#374151">
                      {index < 3 ? MEDALS[index] + ' ' : (index + 1) + '. '}{payload.value}
                    </text>
                  )}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  formatter={(v: number) => [`${v} votes`, 'Count']}
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 8,
                    border: '1px solid #e5e7eb',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  }}
                  cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                />
                <Bar dataKey="votes" radius={[0, 6, 6, 0] as any} barSize={24} background={{ radius: [0, 6, 6, 0] as any, fill: '#f3f4f6' }}>
                  <LabelList
                    dataKey="votes"
                    position="right"
                    style={{ fontSize: 11, fontWeight: 700, fill: '#374151' }}
                    formatter={(v: number) => `${v}`}
                  />
                  {chartData.map((_: any, i: number) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </HTMLContainer>
    )
  }

  override indicator(shape: VoteChartShape) {
    return <rect width={shape.props.w} height={shape.props.h} rx={12} ry={12} />
  }

  override onResize(shape: VoteChartShape, info: TLResizeInfo<VoteChartShape>) {
    const { initialBounds, scaleX, scaleY, newPoint } = info
    return {
      x: newPoint.x,
      y: newPoint.y,
      props: {
        w: Math.max(300, Math.abs(initialBounds.w * scaleX)),
        h: Math.max(200, Math.abs(initialBounds.h * scaleY)),
      },
    }
  }
}
