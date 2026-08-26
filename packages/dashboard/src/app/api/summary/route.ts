import { NextRequest, NextResponse } from 'next/server';
import { getSummary } from '@/lib/queries/summaryQueries';
import { parseFilter } from '@/lib/parseFilter';

export async function GET(request: NextRequest) {
  const filter = parseFilter(request.nextUrl.searchParams);
  const summary = await getSummary(filter);
  return NextResponse.json(summary);
}
