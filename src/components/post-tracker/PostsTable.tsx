'use client';

import { useState, useCallback } from 'react';
import { PTPost, extractMetrics, formatNumber, togglePTPostShown } from '@/lib/post-tracker-api';
import { format } from 'date-fns';

interface PostsTableProps {
  posts: PTPost[];
  onPostClick?: (post: PTPost) => void;
  onRefresh?: () => void;
}

type SortField = 'handle' | 'date' | 'views' | 'likes' | 'replies' | 'status';
type SortOrder = 'asc' | 'desc';

export default function PostsTable({ posts, onPostClick, onRefresh }: PostsTableProps) {
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [filterCampaign, setFilterCampaign] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [pendingShown, setPendingShown] = useState<Record<string, boolean>>({});

  const handleToggleShown = useCallback(async (postId: string, shown: boolean) => {
    setPendingShown(prev => ({ ...prev, [postId]: shown }));
    try {
      await togglePTPostShown(postId, shown);
      await onRefresh?.();
      setPendingShown(prev => {
        const next = { ...prev };
        delete next[postId];
        return next;
      });
    } catch {
      // Revert optimistic update on failure
      setPendingShown(prev => {
        const next = { ...prev };
        delete next[postId];
        return next;
      });
    }
  }, [onRefresh]);

  const campaigns = [...new Set(posts.map(p => p['Campaign']).filter(Boolean))];

  let filteredPosts = posts;
  if (filterCampaign) filteredPosts = filteredPosts.filter(p => p['Campaign'] === filterCampaign);
  if (filterStatus) filteredPosts = filteredPosts.filter(p => p['Status'] === filterStatus);

  const sortedPosts = [...filteredPosts].sort((a, b) => {
    let aVal: number | string = '';
    let bVal: number | string = '';
    const aMetrics = extractMetrics(a);
    const bMetrics = extractMetrics(b);
    const aLatest = aMetrics[aMetrics.length - 1];
    const bLatest = bMetrics[bMetrics.length - 1];

    switch (sortField) {
      case 'handle': aVal = a['Account Handle']; bVal = b['Account Handle']; break;
      case 'date': aVal = new Date(a['Date Added'] || 0).getTime(); bVal = new Date(b['Date Added'] || 0).getTime(); break;
      case 'views': aVal = aLatest?.views || 0; bVal = bLatest?.views || 0; break;
      case 'likes': aVal = aLatest?.likes || 0; bVal = bLatest?.likes || 0; break;
      case 'replies': aVal = aLatest?.replies || 0; bVal = bLatest?.replies || 0; break;
      case 'status': aVal = a['Status']; bVal = b['Status']; break;
    }
    if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortOrder('desc'); }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <span className="text-[#3a3d42] ml-1">&#x2195;</span>;
    return <span className="text-[#1d9bf0] ml-1">{sortOrder === 'asc' ? '\u2191' : '\u2193'}</span>;
  };

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-5">
        <select value={filterCampaign} onChange={(e) => setFilterCampaign(e.target.value)} className="px-3 py-2.5 bg-black/50 border border-[#2a2d32] rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#1d9bf0]/50">
          <option value="">All Campaigns</option>
          {campaigns.map(c => <option key={c} value={c}>#{c}</option>)}
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-3 py-2.5 bg-black/50 border border-[#2a2d32] rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#1d9bf0]/50">
          <option value="">All Statuses</option>
          <option value="tracking">Tracking</option>
          <option value="complete">Complete</option>
          <option value="error">Error</option>
        </select>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#2a2d32]">
              <th className="text-left py-3 px-3 cursor-pointer hover:bg-[#1a1c20] text-[#8b9199] font-semibold text-xs uppercase tracking-wider" onClick={() => handleSort('handle')}>Account <SortIcon field="handle" /></th>
              <th className="text-left py-3 px-3 cursor-pointer hover:bg-[#1a1c20] text-[#8b9199] font-semibold text-xs uppercase tracking-wider" onClick={() => handleSort('date')}>Date Added <SortIcon field="date" /></th>
              <th className="text-left py-3 px-3 text-[#8b9199] font-semibold text-xs uppercase tracking-wider">Campaign</th>
              <th className="text-right py-3 px-3 cursor-pointer hover:bg-[#1a1c20] text-[#8b9199] font-semibold text-xs uppercase tracking-wider" onClick={() => handleSort('views')}>Views <SortIcon field="views" /></th>
              <th className="text-right py-3 px-3 cursor-pointer hover:bg-[#1a1c20] text-[#8b9199] font-semibold text-xs uppercase tracking-wider" onClick={() => handleSort('likes')}>Likes <SortIcon field="likes" /></th>
              <th className="text-right py-3 px-3 cursor-pointer hover:bg-[#1a1c20] text-[#8b9199] font-semibold text-xs uppercase tracking-wider" onClick={() => handleSort('replies')}>Replies <SortIcon field="replies" /></th>
              <th className="text-center py-3 px-3 cursor-pointer hover:bg-[#1a1c20] text-[#8b9199] font-semibold text-xs uppercase tracking-wider" onClick={() => handleSort('status')}>Status <SortIcon field="status" /></th>
              <th className="text-center py-3 px-3 text-[#8b9199] font-semibold text-xs uppercase tracking-wider w-16">Shown</th>
              <th className="text-center py-3 px-3 text-[#8b9199] font-semibold text-xs uppercase tracking-wider w-10"></th>
            </tr>
          </thead>
          <tbody>
            {sortedPosts.map((post) => {
              const metrics = extractMetrics(post);
              const latest = metrics[metrics.length - 1];
              return (
                <tr key={post['Post ID']} className="border-b border-[#1a1c20] hover:bg-[#1a1c20] cursor-pointer transition-colors" onClick={() => onPostClick?.(post)}>
                  <td className="py-3.5 px-3 font-semibold text-white">@{post['Account Handle']}</td>
                  <td className="py-3.5 px-3 text-[#8b9199]">{post['Date Added'] && format(new Date(post['Date Added']), 'MMM d, h:mm a')}</td>
                  <td className="py-3.5 px-3">{post['Campaign'] && <span className="text-[#7856ff] font-medium">#{post['Campaign']}</span>}</td>
                  <td className="py-3.5 px-3 text-right text-white font-medium">{latest ? formatNumber(latest.views) : '-'}</td>
                  <td className="py-3.5 px-3 text-right text-white font-medium">{latest ? formatNumber(latest.likes) : '-'}</td>
                  <td className="py-3.5 px-3 text-right text-white font-medium">{latest ? formatNumber(latest.replies) : '-'}</td>
                  <td className="py-3.5 px-3 text-center">
                    <span className={`px-2.5 py-1 text-xs rounded-full font-semibold ${post['Status'] === 'tracking' ? 'bg-[#1d9bf0]/10 text-[#1d9bf0]' : post['Status'] === 'complete' ? 'bg-[#00ba7c]/10 text-[#00ba7c]' : 'bg-[#f4212e]/10 text-[#f4212e]'}`}>{post['Status']}</span>
                  </td>
                  <td className="py-3.5 px-3 text-center">
                    <input
                      type="checkbox"
                      checked={post['Post ID'] in pendingShown ? pendingShown[post['Post ID']] : post['Shown'] === 'true'}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleToggleShown(post['Post ID'], e.target.checked);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="w-3.5 h-3.5 rounded border-[#2a2d32] bg-black/50 text-[#1d9bf0] focus:ring-[#1d9bf0] focus:ring-offset-0 cursor-pointer accent-[#1d9bf0]"
                    />
                  </td>
                  <td className="py-3.5 px-3 text-center">
                    <a
                      href={post['Post URL'] || `https://x.com/${post['Account Handle']}/status/${post['Post ID']}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-[#5c6370] hover:text-white transition-colors"
                      title="Open on X"
                    >
                      &#8599;
                    </a>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {sortedPosts.length === 0 && <p className="text-center text-[#5c6370] py-8">No posts match your filters</p>}
    </div>
  );
}
