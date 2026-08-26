import { prisma } from '@slack-thread-cost/core';
import { getChannels } from '@/lib/queries/channelQueries';
import { parseFilter, toURLSearchParams } from '@/lib/parseFilter';
import { formatCents } from '@/lib/format';
import { FilterBar } from '@/components/FilterBar';
import { BreakdownBarChart } from '@/components/BreakdownBarChart';

export const dynamic = 'force-dynamic';

export default async function ChannelsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const filter = parseFilter(toURLSearchParams(searchParams));

  const [rows, channels] = await Promise.all([
    getChannels(filter),
    prisma.channel.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
  ]);

  return (
    <div>
      <h1>Channels</h1>
      <FilterBar channels={channels} />
      <div className="section">
        <BreakdownBarChart data={rows.map((r) => ({ name: `#${r.name}`, costCents: r.totalCostCents }))} />
      </div>
      <table className="data-table">
        <thead>
          <tr>
            <th>Channel</th>
            <th>Messages</th>
            <th>Threads</th>
            <th>Cost</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.channelId}>
              <td>#{r.name}</td>
              <td>{r.messageCount}</td>
              <td>{r.threadCount}</td>
              <td>{formatCents(r.totalCostCents)}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={4} className="data-table__empty">
                No channel activity in this range.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
