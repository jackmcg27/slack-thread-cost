import Link from 'next/link';
import { formatCents } from '@/lib/format';
import type { ThreadRow } from '@/lib/queries/threadQueries';

export function ThreadsTable({ rows }: { rows: ThreadRow[] }) {
  return (
    <table className="data-table">
      <thead>
        <tr>
          <th>Channel</th>
          <th>Thread started</th>
          <th>Messages</th>
          <th>Participants</th>
          <th>Cost</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={`${row.channelId}::${row.threadTs}`}>
            <td>#{row.channelName}</td>
            <td>
              <Link href={`/threads/${row.channelId}/${encodeURIComponent(row.threadTs)}`}>
                {new Date(row.firstMessageAt).toLocaleString()}
              </Link>
            </td>
            <td>{row.messageCount}</td>
            <td>{row.participantCount}</td>
            <td>{formatCents(row.totalCostCents)}</td>
          </tr>
        ))}
        {rows.length === 0 && (
          <tr>
            <td colSpan={5} className="data-table__empty">
              No threads in this range.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
