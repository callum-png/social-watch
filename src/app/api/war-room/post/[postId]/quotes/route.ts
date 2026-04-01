import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_POST_TRACKER_API_URL || 'http://localhost:8000';
const API_PASSWORD = process.env.POST_TRACKER_API_PASSWORD || '';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  const { postId } = await params;
  try {
    const res = await fetch(`${API_URL}/api/posts/${postId}/quote-tweets`, {
      cache: 'no-store',
      headers: API_PASSWORD ? { 'x-api-password': API_PASSWORD } : {},
    });
    if (!res.ok) return NextResponse.json({ quotes: [], total: 0 }, { status: res.status });
    return NextResponse.json(await res.json());
  } catch {
    return NextResponse.json({ quotes: [], total: 0 }, { status: 502 });
  }
}
