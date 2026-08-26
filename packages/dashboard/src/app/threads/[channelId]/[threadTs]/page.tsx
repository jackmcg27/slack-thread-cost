import { notFound } from 'next/navigation';
import { getThreadDetail } from '@/lib/queries/threadQueries';
import { formatCents, formatMinutes } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function ThreadDetailPage({
  params,
}: {
  params: { channelId: string; threadTs: string };
}) {
  const detail = await getThreadDetail(params.channelId, decodeURIComponent(params.threadTs));
  if (!detail) notFound();

  return (
    <div>
      <div className="detail-header">
        <h1>#{detail.channelName} thread</h1>
        <div className="detail-header__meta">
          {detail.messages.length} messages · {formatMinutes(detail.totalMinutes)} estimated ·{' '}
          {formatCents(detail.totalCostCents)}
        </div>
      </div>

      <h2>Participants</h2>
      <ul className="participant-list">
        {detail.participants.map((p) => (
          <li key={p.userId}>
            <span>
              {p.displayName} ({p.messageCount} msg, {formatMinutes(p.minutes)})
            </span>
            <strong>{formatCents(p.costCents)}</strong>
          </li>
        ))}
      </ul>

      <h2>Messages</h2>
      <table className="data-table">
        <thead>
          <tr>
            <th>Time</th>
            <th>Author</th>
            <th>Words</th>
            <th>Cost</th>
          </tr>
        </thead>
        <tbody>
          {detail.messages.map((m) => (
            <tr key={m.id}>
              <td>{new Date(m.timestampMs).toLocaleString()}</td>
              <td>{m.displayName}</td>
              <td>{m.wordCount}</td>
              <td>{formatCents(m.costCents)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
