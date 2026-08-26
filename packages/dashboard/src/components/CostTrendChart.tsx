'use client';

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export interface TrendDatum {
  date: string;
  costCents: number;
}

const LINE_COLOR = '#2a78d6';

export function CostTrendChart({ data }: { data: TrendDatum[] }) {
  const chartData = data.map((d) => ({ ...d, costDollars: d.costCents / 100 }));

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={chartData} margin={{ top: 8, right: 24, bottom: 8, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis tickFormatter={(v: number) => `$${v}`} />
        <Tooltip formatter={(value: number) => [`$${value.toFixed(2)}`, 'Cost']} />
        <Line type="monotone" dataKey="costDollars" stroke={LINE_COLOR} strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
