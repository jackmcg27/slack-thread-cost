import { NextResponse } from 'next/server';
import { getThreadDetail } from '@/lib/queries/threadQueries';

export async function GET(
  _request: Request,
  { params }: { params: { channelId: string; threadTs: string } }
) {
  const detail = await getThreadDetail(params.channelId, decodeURIComponent(params.threadTs));
  if (!detail) {
    return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
  }
  return NextResponse.json(detail);
}
