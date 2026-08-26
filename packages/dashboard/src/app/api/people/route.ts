import { NextRequest, NextResponse } from 'next/server';
import { getPeople } from '@/lib/queries/personQueries';
import { parseFilter } from '@/lib/parseFilter';

export async function GET(request: NextRequest) {
  const filter = parseFilter(request.nextUrl.searchParams);
  const rows = await getPeople(filter);
  return NextResponse.json(rows);
}
