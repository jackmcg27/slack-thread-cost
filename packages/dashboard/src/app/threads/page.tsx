import { prisma } from '@slack-thread-cost/core';
import { getThreads } from '@/lib/queries/threadQueries';
import { parseFilter, toURLSearchParams } from '@/lib/parseFilter';
import { ThreadsTable } from '@/components/ThreadsTable';
import { FilterBar } from '@/components/FilterBar';

export const dynamic = 'force-dynamic';

export default async function ThreadsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const filter = parseFilter(toURLSearchParams(searchParams));
  const sortBy = searchParams.sortBy === 'recency' ? 'recency' : 'cost';

  const [{ rows, total }, channels] = await Promise.all([
    getThreads({ ...filter, sortBy, order: 'desc', limit: 100 }),
    prisma.channel.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
  ]);

  return (
    <div>
      <h1>Threads</h1>
      <FilterBar channels={channels} />
      <p className="detail-header__meta">
        {total} thread(s) in range, showing top {rows.length} by cost.
      </p>
      <ThreadsTable rows={rows} />
    </div>
  );
}
