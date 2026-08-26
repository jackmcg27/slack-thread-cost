import { NextRequest, NextResponse } from 'next/server';
import { getThreads } from '@/lib/queries/threadQueries';
import { parseFilter } from '@/lib/parseFilter';

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const filter = parseFilter(params);
  const sortBy = params.get('sortBy') === 'recency' ? 'recency' : 'cost';
  const order = params.get('order') === 'asc' ? 'asc' : 'desc';
  const limit = Number(params.get('limit') ?? 50);
  const offset = Number(params.get('offset') ?? 0);

  const result = await getThreads({ ...filter, sortBy, order, limit, offset });
  return NextResponse.json(result);
}
