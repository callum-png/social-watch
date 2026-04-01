'use client';

import { useState, useEffect, useRef } from 'react';
import { addPTPost, formatNumber } from '@/lib/post-tracker-api';

interface AddPostFormProps {
  onPostAdded: () => void;
}

export default function AddPostForm({ onPostAdded }: AddPostFormProps) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [campaign, setCampaign] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isValidUrl = /(?:twitter\.com|x\.com)\/\w+\/status\/\d+/.test(url);

  useEffect(() => {
    if (result) { const timer = setTimeout(() => setResult(null), 4000); return () => clearTimeout(timer); }
  }, [result]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        if (!loading) setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [loading]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidUrl || loading) return;

    setLoading(true);
    setResult(null);
    try {
      const res = await addPTPost(url.trim(), campaign.trim() || undefined);
      if (res.ok) {
        const handle = res.data.account_handle;
        const views = res.data.initial_metrics?.views;
        const msg = views ? `@${handle} tracked — ${formatNumber(views)} views` : `@${handle} is now being tracked`;
        setResult({ type: 'success', message: msg });
        setUrl(''); setCampaign('');
        onPostAdded();
        setTimeout(() => setOpen(false), 1500);
      } else if (res.status === 409) {
        setResult({ type: 'error', message: 'Already being tracked.' });
      } else {
        setResult({ type: 'error', message: res.data.error || 'Failed to add post.' });
      }
    } catch {
      setResult({ type: 'error', message: 'Failed to connect.' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button onClick={() => setOpen(!open)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#1d9bf0] bg-[#1d9bf0]/10 rounded-lg hover:bg-[#1d9bf0]/20 transition-colors">
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
        Track Post
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-[#111214] border border-[#2a2d32] rounded-xl shadow-2xl shadow-black/60 z-50 p-3">
          <form onSubmit={handleSubmit}>
            <input type="text" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Paste tweet URL..." className="w-full px-3 py-2.5 bg-black/50 border border-[#2a2d32] rounded-lg text-xs text-white placeholder-[#5c6370] focus:outline-none focus:ring-1 focus:ring-[#1d9bf0]/50 focus:border-[#1d9bf0]/50 mb-2" autoFocus />
            <input type="text" value={campaign} onChange={(e) => setCampaign(e.target.value)} placeholder="Campaign (optional)" className="w-full px-3 py-2 bg-black/50 border border-[#2a2d32] rounded-lg text-xs text-white placeholder-[#5c6370] focus:outline-none focus:ring-1 focus:ring-[#1d9bf0]/50 focus:border-[#1d9bf0]/50 mb-2" />
            <button type="submit" disabled={!isValidUrl || loading} className={`w-full py-2 rounded-lg text-xs font-bold transition-all ${isValidUrl && !loading ? 'bg-[#1d9bf0] text-white hover:bg-[#1a8cd8]' : 'bg-[#2a2d32] text-[#5c6370] cursor-not-allowed'}`}>
              {loading ? <span className="flex items-center justify-center gap-2"><span className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent" />Tracking...</span> : 'Track'}
            </button>
          </form>
          {result && (
            <div className={`mt-2 px-3 py-2 rounded-lg text-xs font-medium ${result.type === 'success' ? 'bg-[#00ba7c]/10 text-[#00ba7c]' : 'bg-[#f4212e]/10 text-[#f4212e]'}`}>
              {result.message}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
