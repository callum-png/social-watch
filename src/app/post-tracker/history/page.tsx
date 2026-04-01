'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { usePostTracker } from '../context';
import { extractMetrics, formatNumber, togglePTPostShown, PTPost } from '@/lib/post-tracker-api';

export default function HistoryPage() {
  const { posts, loading, error, loadPosts } = usePostTracker();
  const [filterCampaign, setFilterCampaign] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [pendingShown, setPendingShown] = useState<Record<string, boolean>>({});

  const campaigns = [...new Set(posts.map(p => p['Campaign']).filter(Boolean))];

  const filteredPosts = useMemo(() => {
    let result = posts;
    if (filterCampaign) result = result.filter(p => p['Campaign'] === filterCampaign);
    if (filterStatus) result = result.filter(p => p['Status'] === filterStatus);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p =>
        p['Account Handle'].toLowerCase().includes(q) ||
        (p['Campaign'] || '').toLowerCase().includes(q) ||
        p['Post ID'].includes(q) ||
        (p['Tweet Text'] || '').toLowerCase().includes(q)
      );
    }
    return [...result].sort((a, b) =>
      new Date(b['Date Added'] || b['Date Posted'] || 0).getTime() -
      new Date(a['Date Added'] || a['Date Posted'] || 0).getTime()
    );
  }, [posts, filterCampaign, filterStatus, searchQuery]);

  async function handleToggleShown(postId: string, shown: boolean) {
    setPendingShown(prev => ({ ...prev, [postId]: shown }));
    try {
      await togglePTPostShown(postId, shown);
      await loadPosts();
    } finally {
      setPendingShown(prev => {
        const next = { ...prev };
        delete next[postId];
        return next;
      });
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#1d9bf0] border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return <div className="bg-[#f4212e]/10 border border-[#f4212e]/20 rounded-2xl p-5 text-[#f4212e]">{error}</div>;
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search handle or campaign..."
          className="flex-1 min-w-[180px] px-3 py-2 bg-[#111214] border border-[#2a2d32] rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#1d9bf0] placeholder-[#3a3d42]"
        />
        <select
          value={filterCampaign}
          onChange={(e) => setFilterCampaign(e.target.value)}
          className="px-3 py-2 bg-[#111214] border border-[#2a2d32] rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#1d9bf0]"
        >
          <option value="">All Campaigns</option>
          {campaigns.map(c => <option key={c} value={c}>#{c}</option>)}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 bg-[#111214] border border-[#2a2d32] rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#1d9bf0]"
        >
          <option value="">All Statuses</option>
          <option value="tracking">Tracking</option>
          <option value="complete">Complete</option>
          <option value="error">Error</option>
        </select>
        <span className="self-center text-xs text-[#3a3d42] font-mono">{filteredPosts.length} posts</span>
      </div>

      {/* Image grid */}
      {filteredPosts.length === 0 ? (
        <div className="flex items-center justify-center h-48 bg-[#111214] rounded-xl border border-[#2a2d32]">
          <p className="text-[#3a3d42] text-sm">No posts match your filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {filteredPosts.map((post, idx) => (
            <PostImageCard
              key={post['Post ID']}
              post={post}
              index={idx}
              isShown={post['Post ID'] in pendingShown ? pendingShown[post['Post ID']] : post['Shown'] === 'true'}
              onToggleShown={(shown) => handleToggleShown(post['Post ID'], shown)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PostImageCard({
  post,
  index,
  isShown,
  onToggleShown,
}: {
  post: PTPost;
  index: number;
  isShown: boolean;
  onToggleShown: (shown: boolean) => void;
}) {
  const metrics = extractMetrics(post);
  const latest = metrics[metrics.length - 1];
  const tweetUrl = post['Post URL'] || `https://x.com/${post['Account Handle']}/status/${post['Post ID']}`;
  const isLive = post['Status'] === 'tracking';

  const mediaType = post['Media Type'] || '';
  const mediaUrl = post['Media URL'] || '';
  const mediaPreviewUrl = post['Media Preview URL'] || '';
  const mediaVideoUrl = post['Media Video URL'] || '';
  const mediaWidth = parseInt(post['Media Width'] || '0', 10);
  const mediaHeight = parseInt(post['Media Height'] || '0', 10);

  const hasMedia = mediaType && (mediaUrl || mediaVideoUrl || mediaPreviewUrl);
  const isVideo = mediaType === 'video' || mediaType === 'animated_gif';
  const isPhoto = mediaType === 'photo';
  const aspectRatio = mediaWidth && mediaHeight ? mediaWidth / mediaHeight : 0;
  const needsBlur = isPhoto && aspectRatio > 0 && aspectRatio < 16 / 9;
  const imageUrl = isPhoto ? mediaUrl : mediaPreviewUrl;

  return (
    <div className={`group relative bg-black rounded-xl overflow-hidden border transition-colors ${isLive ? 'border-[#00ba7c]/50' : 'border-[#2a2d32] hover:border-[#3a3d42]'}`}>
      {/* 16:9 thumbnail area */}
      <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
        {hasMedia ? (
          isVideo && mediaVideoUrl ? (
            <VideoThumb mediaVideoUrl={mediaVideoUrl} mediaPreviewUrl={mediaPreviewUrl} mediaType={mediaType} />
          ) : isPhoto && imageUrl ? (
            needsBlur ? (
              <div className="absolute inset-0">
                <img src={imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover blur-xl scale-110" loading="lazy" />
                <div className="absolute inset-0 bg-black/30" />
                <img src={imageUrl} alt="" className="absolute inset-0 w-full h-full object-contain" loading="lazy" />
              </div>
            ) : (
              <img src={imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
            )
          ) : mediaPreviewUrl ? (
            <img src={mediaPreviewUrl} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
          ) : (
            <TweetEmbed postId={post['Post ID']} handle={post['Account Handle']} tweetUrl={tweetUrl} index={index} />
          )
        ) : (
          <TweetEmbed postId={post['Post ID']} handle={post['Account Handle']} tweetUrl={tweetUrl} index={index} />
        )}

        {/* Bottom gradient + stats — sits on top of thumbnail */}
        <div className="absolute inset-x-0 bottom-0 pt-8 pb-1.5 px-2.5 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none">
          {latest && (
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-bold text-white font-mono tabular-nums leading-none">
                {formatNumber(latest.views)}
              </span>
              <span className="text-[10px] text-white/55 font-mono tabular-nums">
                ♥ {formatNumber(latest.likes)}
              </span>
            </div>
          )}
        </div>

        {/* Live badge — bottom right of image */}
        {isLive && (
          <div className="absolute bottom-1.5 right-2 flex items-center gap-1 px-1.5 py-0.5 bg-black/70 rounded-full pointer-events-none z-10">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00ba7c] animate-pulse" />
            <span className="text-[9px] text-[#00ba7c] font-bold uppercase tracking-wider">Live</span>
          </div>
        )}

        {/* Hover: click to open tweet */}
        <a
          href={tweetUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/25 z-20"
        >
          <span className="text-white text-[11px] font-semibold bg-black/60 px-2.5 py-1 rounded-full">View on X ↗</span>
        </a>
      </div>

      {/* Bottom strip: @handle + checkbox — outside the image area, z above everything */}
      <div className="relative z-30 flex items-center justify-between px-2.5 py-1.5 bg-[#0a0b0c] border-t border-[#1a1c20]">
        <span className="text-[10px] font-mono text-[#8b9199] truncate">@{post['Account Handle']}</span>
        <input
          type="checkbox"
          checked={isShown}
          onChange={(e) => onToggleShown(e.target.checked)}
          onClick={(e) => e.stopPropagation()}
          title="Toggle shown"
          className="w-3 h-3 shrink-0 rounded accent-[#1d9bf0] cursor-pointer"
        />
      </div>
    </div>
  );
}

function VideoThumb({ mediaVideoUrl, mediaPreviewUrl, mediaType }: { mediaVideoUrl: string; mediaPreviewUrl: string; mediaType: string }) {
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  return (
    <div className="absolute inset-0" onClick={(e) => {
      e.stopPropagation();
      if (videoRef.current) {
        if (playing) { videoRef.current.pause(); setPlaying(false); }
        else { videoRef.current.play(); setPlaying(true); }
      }
    }}>
      <video ref={videoRef} src={mediaVideoUrl} poster={mediaPreviewUrl || undefined} className="w-full h-full object-cover" loop={mediaType === 'animated_gif'} muted={mediaType === 'animated_gif'} playsInline preload="none" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} />
      {!playing && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
          <div className="w-8 h-8 rounded-full bg-black/60 flex items-center justify-center border border-white/20">
            <svg className="w-3 h-3 text-white ml-0.5" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
          </div>
        </div>
      )}
    </div>
  );
}

function TweetEmbed({ postId, handle, tweetUrl, index }: { postId: string; handle: string; tweetUrl: string; index: number }) {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [oEmbedDone, setOEmbedDone] = useState(false);
  const [iframeError, setIframeError] = useState(false);

  // Stagger oEmbed fetches so we don't hammer the API for a full grid
  useEffect(() => {
    const timer = setTimeout(() => {
      fetch(`https://publish.twitter.com/oembed?url=${encodeURIComponent(tweetUrl)}&maxwidth=800&partner=&hide_thread=false`)
        .then(r => r.json())
        .then((data: { thumbnail_url?: string }) => {
          if (data.thumbnail_url) setThumbnailUrl(data.thumbnail_url);
        })
        .catch(() => {})
        .finally(() => setOEmbedDone(true));
    }, index * 80); // 80ms stagger per card
    return () => clearTimeout(timer);
  }, [tweetUrl, index]);

  // Show thumbnail from oEmbed if available
  if (thumbnailUrl) {
    return <img src={thumbnailUrl} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />;
  }

  // While waiting for oEmbed, or if oEmbed returned no thumbnail → show iframe
  if (oEmbedDone || !thumbnailUrl) {
    if (iframeError) {
      return (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0d0e10]">
          <img src={`https://unavatar.io/twitter/${handle}`} alt={handle} className="w-10 h-10 rounded-full border border-[#2a2d32]" />
        </div>
      );
    }
    return (
      <iframe
        src={`https://platform.twitter.com/embed/Tweet.html?id=${postId}&theme=dark&hideCard=true&hideThread=true`}
        className="absolute pointer-events-none"
        style={{ transform: 'scale(0.75)', transformOrigin: 'top left', width: '134%', height: '300px', top: '-8px', left: '0' }}
        scrolling="no"
        onError={() => setIframeError(true)}
        loading="lazy"
        sandbox="allow-scripts allow-same-origin"
      />
    );
  }

  // Loading state
  return <div className="absolute inset-0 bg-[#0d0e10]" />;
}
