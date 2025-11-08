import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

/**
 * Proxy route for /api/profile → /api/users/me
 * This provides backward compatibility for components using /api/profile
 */

export async function GET(req: NextRequest) {
  const url = new URL('/api/users/me', req.url);

  // Forward the request to /api/users/me with same headers
  const headers = new Headers(req.headers);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers,
  });

  const data = await response.json();

  return NextResponse.json(data, {
    status: response.status,
    headers: response.headers,
  });
}

export async function PATCH(req: NextRequest) {
  const url = new URL('/api/users/me', req.url);
  const body = await req.json();

  // Forward the request to /api/users/me with same headers
  const headers = new Headers(req.headers);
  headers.set('Content-Type', 'application/json');

  const response = await fetch(url.toString(), {
    method: 'PATCH',
    headers,
    body: JSON.stringify(body),
  });

  const data = await response.json();

  return NextResponse.json(data, {
    status: response.status,
    headers: response.headers,
  });
}
