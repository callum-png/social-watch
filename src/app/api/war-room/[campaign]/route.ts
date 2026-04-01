import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_POST_TRACKER_API_URL || 'http://localhost:8000';
const API_PASSWORD = process.env.POST_TRACKER_API_PASSWORD || '';

function slugify(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ campaign: string }> }
) {
  const { campaign } = await params;

  try {
    const res = await fetch(`${API_URL}/api/posts`, {
      cache: 'no-store',
      headers: API_PASSWORD ? { 'x-api-password': API_PASSWORD } : {},
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch posts from backend' }, { status: 502 });
    }

    const data = await res.json();
    const allPosts = data.posts || [];

    const posts = allPosts.filter((p: any) => {
      const postCampaign = p['Campaign'];
      if (!postCampaign) return false;
      return slugify(postCampaign) === campaign;
    });

    if (posts.length === 0) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Get the original campaign name from the first matching post
    const campaignName = posts[0]['Campaign'];

    return NextResponse.json({ posts, campaign: campaignName });
  } catch {
    return NextResponse.json({ error: 'Backend unavailable' }, { status: 502 });
  }
}
