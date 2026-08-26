import { prisma } from '@slack-thread-cost/core';
import { getSummary } from '@/lib/queries/summaryQueries';
import { getThreads } from '@/lib/queries/threadQueries';
import { parseFilter, toURLSearchParams } from '@/lib/parseFilter';
import { formatCents } from '@/lib/format';
import { KpiRow } from '@/components/KpiRow';
import { ThreadsTable } from '@/components/ThreadsTable';
import { FilterBar } from '@/components/FilterBar';

export const dynamic = 'force-dynamic';

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const filter = parseFilter(toURLSearchParams(searchParams));

  const [summary, { rows: topThreads }, channels] = await Promise.all([
    getSummary(filter),
    getThreads({ ...filter, sortBy: 'cost', order: 'desc', limit: 5 }),
    prisma.channel.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
  ]);

  return (
    <div>
      <h1>Overview</h1>
      <FilterBar channels={channels} />
      <KpiRow
        items={[
          { label: 'Total estimated cost', value: formatCents(summary.totalCostCents) },
          { label: 'Threads', value: summary.totalThreads.toLocaleString() },
          { label: 'Messages', value: summary.totalMessages.toLocaleString() },
          { label: 'Top channel', value: summary.topChannel ? `#${summary.topChannel.name}` : '—' },
          { label: 'Top person', value: summary.topPerson ? summary.topPerson.name : '—' },
        ]}
      />
      <h2>Most expensive threads</h2>
      <ThreadsTable rows={topThreads} />
    </div>
  );
}
