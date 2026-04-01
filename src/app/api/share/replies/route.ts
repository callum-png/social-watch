import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_POST_TRACKER_API_URL || 'http://localhost:8000';
const API_PASSWORD = process.env.POST_TRACKER_API_PASSWORD || '';

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 });
  }

  // Validate post ID format (numeric)
  if (!/^\d+$/.test(id)) {
    return NextResponse.json({ error: 'Invalid post ID' }, { status: 400 });
  }

  try {
    const res = await fetch(`${API_URL}/api/posts/${id}/replies`, {
      cache: 'no-store',
      headers: API_PASSWORD ? { 'x-api-password': API_PASSWORD } : {},
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch replies from backend' }, { status: 502 });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Backend unavailable' }, { status: 502 });
  }
}
