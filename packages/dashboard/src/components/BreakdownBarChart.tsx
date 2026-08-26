'use client';

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export interface BreakdownDatum {
  name: string;
  costCents: number;
}

// Single-hue sequential — this is a magnitude comparison across one
// category axis, not a story about distinct identities, so every bar
// shares the same hue rather than getting a rainbow of colors.
const BAR_COLOR = '#2a78d6';

export function BreakdownBarChart({ data }: { data: BreakdownDatum[] }) {
  const chartData = data.map((d) => ({ ...d, costDollars: d.costCents / 100 }));

  return (
    <ResponsiveContainer width="100%" height={Math.max(200, chartData.length * 36)}>
      <BarChart data={chartData} layout="vertical" margin={{ top: 8, right: 32, bottom: 8, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" tickFormatter={(v: number) => `$${v}`} />
        <YAxis type="category" dataKey="name" width={140} />
        <Tooltip formatter={(value: number) => [`$${value.toFixed(2)}`, 'Cost']} />
        <Bar dataKey="costDollars" fill={BAR_COLOR} radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
