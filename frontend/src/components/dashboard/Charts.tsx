import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { priorityLabel, statusLabel, type Summary } from '@/lib/types'

export const STATUS_COLORS = { todo: '#8aa68f', in_progress: '#c4704f', done: '#2f5d46' } as const
export const PRIORITY_COLORS = { low: '#8aa68f', medium: '#c9a227', high: '#c4704f', urgent: '#8a3d22' } as const

const tooltipStyle = { borderRadius: 12, border: '1px solid #e6dfd0', background: '#fffdf8', fontSize: 12, boxShadow: '0 4px 14px -4px rgb(43 47 44 / 0.12)' }

function Legend({ items }: { items: { label: string; color: string; value: number }[] }) {
  return (
    <ul className="mt-3 flex flex-wrap justify-center gap-x-5 gap-y-1.5 text-xs text-ink-soft">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: i.color }} aria-hidden />
          {i.label} <span className="font-semibold text-charcoal">{i.value}</span>
        </li>
      ))}
    </ul>
  )
}

export function StatusChart({ data, total }: { data: Summary['byStatus']; total: number }) {
  const rows = data.map((d) => ({ name: statusLabel(d.status), value: d.count, color: STATUS_COLORS[d.status] }))
  return (
    <figure aria-label="Tasks by status">
      <div className="relative h-56">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={rows.filter((r) => r.value > 0)} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="92%" paddingAngle={2} stroke="none">
              {rows.filter((r) => r.value > 0).map((r) => <Cell key={r.name} fill={r.color} />)}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-serif text-3xl font-semibold">{total}</span>
          <span className="text-xs text-ink-muted">tasks</span>
        </div>
      </div>
      <Legend items={rows.map((r) => ({ label: r.name, color: r.color, value: r.value }))} />
      <table className="sr-only"><caption>Tasks by status</caption><tbody>{rows.map((r) => <tr key={r.name}><th>{r.name}</th><td>{r.value}</td></tr>)}</tbody></table>
    </figure>
  )
}

export function PriorityChart({ data }: { data: Summary['byPriority'] }) {
  const rows = data.map((d) => ({ name: priorityLabel(d.priority), value: d.count, color: PRIORITY_COLORS[d.priority] }))
  return (
    <figure aria-label="Tasks by priority">
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="#e6dfd0" />
            <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#f1f4ee' }} />
            <Bar dataKey="value" name="Tasks" radius={[6, 6, 0, 0]} maxBarSize={56}>
              {rows.map((r) => <Cell key={r.name} fill={r.color} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <table className="sr-only"><caption>Tasks by priority</caption><tbody>{rows.map((r) => <tr key={r.name}><th>{r.name}</th><td>{r.value}</td></tr>)}</tbody></table>
    </figure>
  )
}

export function ProjectProgressChart({ data }: { data: Summary['projectProgress'] }) {
  const rows = data.filter((p) => p.total > 0).map((p) => ({ name: p.name, Done: p.done, Remaining: p.total - p.done }))
  if (!rows.length) return null
  return (
    <figure aria-label="Progress by project">
      <div style={{ height: Math.max(180, rows.length * 44 + 40) }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 12, left: 8, bottom: 0 }}>
            <CartesianGrid horizontal={false} stroke="#e6dfd0" />
            <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} />
            <YAxis type="category" dataKey="name" width={110} tickLine={false} axisLine={false} fontSize={12} tickFormatter={(v: string) => (v.length > 16 ? `${v.slice(0, 15)}…` : v)} />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#f1f4ee' }} />
            <Bar dataKey="Done" stackId="a" fill="#2f5d46" radius={[0, 0, 0, 0]} maxBarSize={22} />
            <Bar dataKey="Remaining" stackId="a" fill="#cfdac8" radius={[0, 6, 6, 0]} maxBarSize={22} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <Legend items={[{ label: 'Done', color: '#2f5d46', value: rows.reduce((a, r) => a + r.Done, 0) }, { label: 'Remaining', color: '#cfdac8', value: rows.reduce((a, r) => a + r.Remaining, 0) }]} />
    </figure>
  )
}
