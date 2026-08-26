import { NextRequest, NextResponse } from 'next/server';
import { getChannels } from '@/lib/queries/channelQueries';
import { parseFilter } from '@/lib/parseFilter';

export async function GET(request: NextRequest) {
  const filter = parseFilter(request.nextUrl.searchParams);
  const rows = await getChannels(filter);
  return NextResponse.json(rows);
}
