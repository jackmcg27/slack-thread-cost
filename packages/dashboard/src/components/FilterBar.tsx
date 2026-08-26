'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

const PRESETS: { label: string; days: number }[] = [
  { label: '7d', days: 7 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
];

export interface FilterBarChannel {
  id: string;
  name: string;
}

export function FilterBar({ channels }: { channels: FilterBarChannel[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updateParams(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === null) params.delete(key);
      else params.set(key, value);
    }
    router.push(params.toString() ? `${pathname}?${params.toString()}` : pathname);
  }

  function applyPreset(days: number) {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - days);
    updateParams({ from: from.toISOString(), to: to.toISOString() });
  }

  const activeChannel = searchParams.get('channelId') ?? '';

  return (
    <div className="filter-bar">
      <div className="filter-bar__presets">
        {PRESETS.map((preset) => (
          <button key={preset.label} type="button" onClick={() => applyPreset(preset.days)}>
            {preset.label}
          </button>
        ))}
        <button type="button" onClick={() => updateParams({ from: null, to: null })}>
          All time
        </button>
      </div>
      <select
        value={activeChannel}
        onChange={(e) => updateParams({ channelId: e.target.value || null })}
        aria-label="Filter by channel"
      >
        <option value="">All channels</option>
        {channels.map((c) => (
          <option key={c.id} value={c.id}>
            #{c.name}
          </option>
        ))}
      </select>
    </div>
  );
}
