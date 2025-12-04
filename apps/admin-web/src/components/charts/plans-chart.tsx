'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

import type { PlanDistribution } from '@/services/analytics.service';

interface PlansChartProps {
  data: PlanDistribution[];
  isLoading?: boolean;
}

// Color palette for pie chart segments
const COLORS = [
  'var(--primary)',
  'var(--success)',
  'var(--warning)',
  'var(--info)',
  'var(--text-muted)',
];

interface TooltipPayloadItem {
  name: string;
  value: number;
  payload: {
    planName: string;
    count: number;
    percentage: number;
  };
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) {
    return null;
  }

  const data = payload[0].payload;

  return (
    <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-lg shadow-lg p-3">
      <p className="text-sm font-semibold text-[var(--text-primary)] mb-1">
        {data.planName}
      </p>
      <p className="text-xs text-[var(--text-muted)]">
        {data.count} pesanan ({data.percentage}%)
      </p>
    </div>
  );
}

interface LegendPayloadItem {
  value: string;
  color: string;
}

interface CustomLegendProps {
  payload?: LegendPayloadItem[];
}

function CustomLegend({ payload }: CustomLegendProps) {
  if (!payload) return null;

  return (
    <div className="flex flex-wrap justify-center gap-3 mt-4">
      {payload.map((entry, index) => (
        <div key={`legend-${index}`} className="flex items-center gap-1.5">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-xs text-[var(--text-secondary)]">
            {entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

export function PlansChart({ data, isLoading }: PlansChartProps) {
  if (isLoading) {
    return (
      <div className="h-[300px] flex items-center justify-center">
        <div className="animate-pulse text-[var(--text-muted)]">
          Memuat data...
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center">
        <p className="text-[var(--text-muted)]">Tidak ada data</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="45%"
          innerRadius={60}
          outerRadius={90}
          paddingAngle={2}
          dataKey="count"
          nameKey="planName"
        >
          {data.map((_, index) => (
            <Cell
              key={`cell-${index}`}
              fill={COLORS[index % COLORS.length]}
              stroke="var(--card-bg)"
              strokeWidth={2}
            />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend content={<CustomLegend />} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export default PlansChart;
