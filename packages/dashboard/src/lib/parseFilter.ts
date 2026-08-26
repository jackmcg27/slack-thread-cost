/** Next.js App Router passes searchParams as a plain object, not URLSearchParams — normalize it for parseFilter. */
export function toURLSearchParams(
  searchParams: Record<string, string | string[] | undefined>
): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === 'string') params.set(key, value);
  }
  return params;
}

export interface ParsedFilter {
  from?: Date;
  to?: Date;
  channelId?: string;
}

/** Reads from/to/channelId off a URLSearchParams-like object, used by both API routes and server-component pages. */
export function parseFilter(params: URLSearchParams): ParsedFilter {
  const from = params.get('from');
  const to = params.get('to');
  const channelId = params.get('channelId');

  const fromDate = from ? new Date(from) : undefined;
  const toDate = to ? new Date(to) : undefined;

  return {
    from: fromDate && !Number.isNaN(fromDate.getTime()) ? fromDate : undefined,
    to: toDate && !Number.isNaN(toDate.getTime()) ? toDate : undefined,
    channelId: channelId ?? undefined,
  };
}
