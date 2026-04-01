import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_POST_TRACKER_API_URL || 'http://localhost:8000';
const API_PASSWORD = process.env.POST_TRACKER_API_PASSWORD || '';

export async function GET(request: NextRequest) {
  const ids = request.nextUrl.searchParams.get('ids');
  if (!ids) {
    return NextResponse.json({ error: 'Missing ids parameter' }, { status: 400 });
  }

  const requestedIds = new Set(ids.split(',').map(id => id.trim()).filter(Boolean));
  if (requestedIds.size === 0) {
    return NextResponse.json({ error: 'No valid IDs provided' }, { status: 400 });
  }

  if (requestedIds.size > 50) {
    return NextResponse.json({ error: 'Too many IDs (max 50)' }, { status: 400 });
  }

  try {
    const res = await fetch(`${API_URL}/api/posts`, {
      cache: 'no-store',
      headers: API_PASSWORD ? { 'x-api-password': API_PASSWORD } : {},
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch posts from backend' }, { status: 502 });
    }

    const data = await res.json();
    const posts = (data.posts || []).filter((p: any) => requestedIds.has(p['Post ID']));

    return NextResponse.json({ posts });
  } catch {
    return NextResponse.json({ error: 'Backend unavailable' }, { status: 502 });
  }
}
