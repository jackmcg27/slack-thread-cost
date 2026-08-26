import { prisma } from '@slack-thread-cost/core';
import { getPeople } from '@/lib/queries/personQueries';
import { parseFilter, toURLSearchParams } from '@/lib/parseFilter';
import { formatCents } from '@/lib/format';
import { FilterBar } from '@/components/FilterBar';
import { BreakdownBarChart } from '@/components/BreakdownBarChart';

export const dynamic = 'force-dynamic';

export default async function PeoplePage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const filter = parseFilter(toURLSearchParams(searchParams));

  const [rows, channels] = await Promise.all([
    getPeople(filter),
    prisma.channel.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
  ]);

  return (
    <div>
      <h1>People</h1>
      <FilterBar channels={channels} />
      <div className="section">
        <BreakdownBarChart data={rows.slice(0, 15).map((r) => ({ name: r.displayName, costCents: r.totalCostCents }))} />
      </div>
      <table className="data-table">
        <thead>
          <tr>
            <th>Person</th>
            <th>Classification</th>
            <th>Messages</th>
            <th>Threads</th>
            <th>Cost</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.userId}>
              <td>{r.displayName}</td>
              <td>{r.classificationLabel}</td>
              <td>{r.messageCount}</td>
              <td>{r.threadCount}</td>
              <td>{formatCents(r.totalCostCents)}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={5} className="data-table__empty">
                No activity in this range.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
