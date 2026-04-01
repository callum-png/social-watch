'use client';

import { useState, useRef } from 'react';
import { PTPost, extractMetrics, formatNumber } from '@/lib/post-tracker-api';
import { format } from 'date-fns';

interface PostCardProps {
  post: PTPost;
  onClick?: () => void;
}

export default function PostCard({ post, onClick }: PostCardProps) {
  const metrics = extractMetrics(post);
  const latestMetrics = metrics[metrics.length - 1];
  const isTracking = post['Status'] === 'tracking';
  const isShown = post['Shown'] === 'true';
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const profileImgUrl = `https://unavatar.io/twitter/${post['Account Handle']}`;
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
  const needsBlurTreatment = isPhoto && aspectRatio > 0 && aspectRatio < 16 / 9;
  const imageUrl = isPhoto ? mediaUrl : mediaPreviewUrl;

  function handleVideoClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (videoRef.current) {
      if (playing) { videoRef.current.pause(); setPlaying(false); }
      else { videoRef.current.play(); setPlaying(true); }
    }
  }

  return (
    <div onClick={onClick} className={`bg-[#111214] rounded-xl border overflow-hidden cursor-pointer hover:bg-[#161819] hover:border-[#3a3d42] transition-all group ${isShown ? 'border-l-[3px] border-l-[#1d9bf0] border-[#1d9bf0]/25' : isTracking ? 'border-[#1d9bf0]/25' : 'border-[#2a2d32]'}`}>
      <div className="relative bg-black border-b border-[#2a2d32] overflow-hidden" style={{ paddingBottom: '56.25%' }}>
        {hasMedia ? (
          isVideo && mediaVideoUrl ? (
            <div className="absolute inset-0" onClick={handleVideoClick}>
              <video ref={videoRef} src={mediaVideoUrl} poster={mediaPreviewUrl || undefined} className="w-full h-full object-cover" loop={mediaType === 'animated_gif'} muted={mediaType === 'animated_gif'} playsInline preload="none" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} />
              {!playing && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                  <div className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center border border-white/20">
                    <svg className="w-4 h-4 text-white ml-0.5" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                  </div>
                </div>
              )}
            </div>
          ) : isPhoto && imageUrl ? (
            needsBlurTreatment ? (
              <div className="absolute inset-0">
                <img src={imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover blur-xl scale-110" loading="lazy" />
                <div className="absolute inset-0 bg-black/30" />
                <img src={imageUrl} alt={post['Account Handle']} className="absolute inset-0 w-full h-full object-contain" loading="lazy" />
              </div>
            ) : (
              <img src={imageUrl} alt={post['Account Handle']} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
            )
          ) : mediaPreviewUrl ? (
            <img src={mediaPreviewUrl} alt={post['Account Handle']} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
          ) : (
            <FallbackPreview profileImgUrl={profileImgUrl} handle={post['Account Handle']} postId={post['Post ID']} />
          )
        ) : (
          <FallbackPreview profileImgUrl={profileImgUrl} handle={post['Account Handle']} postId={post['Post ID']} />
        )}

        <span className={`absolute top-2.5 right-2.5 px-2.5 py-0.5 text-[10px] rounded-full font-semibold z-10 flex items-center shadow-lg ${isTracking ? 'bg-[#1d9bf0] text-white shadow-[#1d9bf0]/30' : post['Status'] === 'complete' ? 'bg-[#00ba7c] text-white shadow-[#00ba7c]/30' : 'bg-[#f4212e] text-white shadow-[#f4212e]/30'}`}>
          {isTracking && <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#f4212e] mr-1.5 animate-pulse"></span>}
          {post['Status']}
        </span>
      </div>

      <div className="px-3 py-2.5">
        <div className="flex items-center gap-2 mb-1.5">
          <img src={profileImgUrl} alt={post['Account Handle']} className="w-6 h-6 rounded-full border border-[#2a2d32]" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                {isShown && <span className="inline-flex items-center justify-center w-[14px] h-[14px] text-[7px] font-bold bg-[#1d9bf0] text-white rounded leading-none shrink-0">S</span>}
                <a href={post['Post URL']} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="font-semibold text-white text-xs hover:text-[#1d9bf0] transition-colors">@{post['Account Handle']}</a>
              </div>
              <p className="text-[10px] text-[#5c6370]">{post['Date Added'] && format(new Date(post['Date Added']), 'MMM d, h:mm a')}</p>
            </div>
          </div>
        </div>

        {post['Campaign'] && <p className="text-[10px] text-[#7856ff] mb-1.5 font-semibold">#{post['Campaign']}</p>}

        {latestMetrics ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 pt-2 border-t border-[#2a2d32]">
            {(['views', 'likes', 'retweets', 'replies'] as const).map((m) => (
              <div key={m} className="text-center">
                <p className="text-xs font-bold text-white">{formatNumber(latestMetrics[m])}</p>
                <p className="text-[8px] text-[#5c6370] uppercase font-medium tracking-wide">{m === 'retweets' ? 'RTs' : m}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-[#5c6370] italic pt-2">Collecting metrics...</p>
        )}
      </div>
    </div>
  );
}

function FallbackPreview({ profileImgUrl, handle, postId }: { profileImgUrl: string; handle: string; postId: string }) {
  const [embedError, setEmbedError] = useState(false);

  if (embedError) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-[#111214]">
        <img src={profileImgUrl} alt={handle} className="w-10 h-10 rounded-full border border-[#2a2d32]" />
      </div>
    );
  }

  return (
    <iframe
      src={`https://platform.twitter.com/embed/Tweet.html?id=${postId}&theme=dark&hideCard=true&hideThread=true`}
      className="absolute w-full pointer-events-none"
      style={{ transform: 'scale(0.75)', transformOrigin: 'top left', width: '134%', height: '300px', top: '-8px', left: '0', overflow: 'hidden' }}
      scrolling="no"
      onError={() => setEmbedError(true)}
      loading="lazy"
      sandbox="allow-scripts allow-same-origin"
    />
  );
}
