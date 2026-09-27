import { useState } from 'react';
import { BarChart3, Table2 } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { cn } from '@/shared/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';

export function ChartContainer({ className, children, ...props }) {
  return (
    <div className={cn('w-full', className)} {...props}>
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
}

// Tooltip body: value leads (strong), series name follows, keyed by a short line in the series color.
const sortBy = (items, order) =>
  order ? [...items].sort((a, b) => order.indexOf(a.dataKey) - order.indexOf(b.dataKey)) : items;

function TooltipContent({ active, payload, label, formatter, labelFormatter, order }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="min-w-32 rounded-md border border-border bg-background px-3 py-2 text-xs">
      {label !== undefined && (
        <p className="mb-1.5 font-medium text-foreground">{labelFormatter ? labelFormatter(label) : label}</p>
      )}
      <div className="space-y-1">
        {sortBy(payload, order).map((entry) => (
          <div key={entry.dataKey} className="flex items-center gap-2">
            <span className="h-0.5 w-3 rounded-full" style={{ background: entry.color || entry.payload?.fill }} />
            <span className="font-semibold tabular-nums text-foreground">
              {formatter ? formatter(entry.value) : entry.value}
            </span>
            <span className="text-muted-foreground">{entry.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ChartTooltip({ formatter, labelFormatter, order, ...props }) {
  return (
    <Tooltip
      cursor={{ fill: 'rgba(137,135,129,0.10)' }}
      content={<TooltipContent formatter={formatter} labelFormatter={labelFormatter} order={order} />}
      {...props}
    />
  );
}

function LegendContent({ payload, order }) {
  if (!payload?.length) return null;
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 pt-2 text-xs text-muted-foreground">
      {sortBy(payload, order).map((entry) => (
        <span key={entry.value} className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: entry.color }} />
          {entry.value}
        </span>
      ))}
    </div>
  );
}

export function ChartLegend({ order, ...props }) {
  return <Legend content={<LegendContent order={order} />} {...props} />;
}

// Card with a Chart/Table toggle; the table is the accessible twin of every chart.
export function ChartCard({ title, description, action, chart, table, empty, className }) {
  const [view, setView] = useState('chart');
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
        <div className="min-w-0">
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {action}
          {!empty && table && (
            <div className="flex rounded-md border border-border p-0.5" role="group" aria-label="Chart view">
              {[
                { key: 'chart', icon: BarChart3, label: 'Chart view' },
                { key: 'table', icon: Table2, label: 'Table view' },
              ].map(({ key, icon: Icon, label }) => (
                <button
                  key={key}
                  type="button"
                  aria-label={label}
                  aria-pressed={view === key}
                  onClick={() => setView(key)}
                  className={cn(
                    'flex h-8 w-9 items-center justify-center rounded-sm text-muted-foreground sm:h-6 sm:w-7',
                    view === key && 'bg-muted text-foreground'
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                </button>
              ))}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className={cn(view === 'table' && !empty && 'p-0')}>
        {empty || (view === 'table' && table ? table : chart)}
      </CardContent>
    </Card>
  );
}

export { Bar, BarChart, CartesianGrid, XAxis, YAxis };
