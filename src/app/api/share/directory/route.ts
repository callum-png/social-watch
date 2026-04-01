import { NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_POST_TRACKER_API_URL || 'http://localhost:8000';
const API_PASSWORD = process.env.POST_TRACKER_API_PASSWORD || '';

export async function GET() {
  try {
    const res = await fetch(`${API_URL}/api/posts`, {
      cache: 'no-store',
      headers: API_PASSWORD ? { 'x-api-password': API_PASSWORD } : {},
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 502 });
    }

    const data = await res.json();
    return NextResponse.json({ posts: data.posts || [] });
  } catch {
    return NextResponse.json({ error: 'Backend unavailable' }, { status: 502 });
  }
}
