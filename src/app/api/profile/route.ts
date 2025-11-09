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

  // Get raw text to avoid double JSON parsing
  const text = await response.text();

  // Filter out compression headers to avoid ERR_CONTENT_DECODING_FAILED
  const cleanHeaders = new Headers();
  for (const [key, value] of response.headers.entries()) {
    if (!['content-encoding', 'transfer-encoding', 'content-length'].includes(key.toLowerCase())) {
      cleanHeaders.set(key, value);
    }
  }
  cleanHeaders.set('Content-Type', 'application/json');

  return new NextResponse(text, {
    status: response.status,
    headers: cleanHeaders,
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

  // Get raw text to avoid double JSON parsing
  const text = await response.text();

  // Filter out compression headers to avoid ERR_CONTENT_DECODING_FAILED
  const cleanHeaders = new Headers();
  for (const [key, value] of response.headers.entries()) {
    if (!['content-encoding', 'transfer-encoding', 'content-length'].includes(key.toLowerCase())) {
      cleanHeaders.set(key, value);
    }
  }
  cleanHeaders.set('Content-Type', 'application/json');

  return new NextResponse(text, {
    status: response.status,
    headers: cleanHeaders,
  });
}
