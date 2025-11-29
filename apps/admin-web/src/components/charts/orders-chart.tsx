'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { DailyStats } from '@/services/analytics.service';

interface OrdersChartProps {
  data: DailyStats[];
  isLoading?: boolean;
}

function formatDateLabel(dateStr: string): string {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
  }).format(date);
}

interface TooltipPayloadItem {
  name: string;
  value: number;
  color: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) {
    return null;
  }

  const date = label
    ? new Intl.DateTimeFormat('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(new Date(label))
    : '';

  return (
    <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-lg shadow-lg p-3">
      <p className="text-xs text-[var(--text-muted)] mb-1">{date}</p>
      <p className="text-sm font-semibold text-[var(--text-primary)]">
        {payload[0].value} pesanan
      </p>
    </div>
  );
}

export function OrdersChart({ data, isLoading }: OrdersChartProps) {
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
      <BarChart
        data={data}
        margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="var(--border)"
          vertical={false}
        />
        <XAxis
          dataKey="date"
          tickFormatter={formatDateLabel}
          tick={{ fontSize: 12, fill: 'var(--text-muted)' }}
          tickLine={false}
          axisLine={{ stroke: 'var(--border)' }}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fontSize: 12, fill: 'var(--text-muted)' }}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar
          dataKey="orders"
          fill="var(--primary)"
          radius={[4, 4, 0, 0]}
          maxBarSize={50}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

export default OrdersChart;
