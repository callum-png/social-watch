'use client';

import { usePathname, useRouter } from 'next/navigation';
import { PlatformHeader } from "@/components/platform-header";
import { PostTrackerProvider, usePostTracker } from './context';
import AddPostForm from '@/components/post-tracker/AddPostForm';
import { clearPostTrackerPassword } from '@/lib/post-tracker-api';

function PostTrackerLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { activePosts, completedPosts, posts, loadPosts } = usePostTracker();

  const tabs = [
    { id: 'trajectory', label: 'Trajectory', path: '/post-tracker/trajectory' },
    { id: 'leaderboard', label: 'Leaderboard', path: '/post-tracker/leaderboard' },
    { id: 'history', label: 'History', path: '/post-tracker/history' },
    { id: 'benchmark', label: 'Benchmark', path: '/post-tracker/benchmark' },
    { id: 'war-room', label: 'War Room', path: '/post-tracker/war-room' },
    { id: 'active', label: 'Active Posts', path: '/post-tracker/active' },
  ];

  const currentTab = tabs.find(tab => pathname === tab.path)?.id || 'active';

  return (
    <div className="min-h-screen bg-black">
      <PlatformHeader />
      <main>
        <div className="max-w-7xl mx-auto px-3 md:px-6 py-4">
          {/* Compact Media Bar */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 md:gap-0 mb-4 bg-[#111214] rounded-xl border border-[#2a2d32] px-4 py-2.5">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <h1 className="text-sm font-bold text-white tracking-tight">Post Tracker</h1>
              </div>
              <div className="flex items-center flex-wrap gap-3 md:gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="text-[#5c6370]">Active</span>
                  <span className="font-bold text-[#1d9bf0]">{activePosts.length}</span>
                </div>
                <div className="w-px h-3 bg-[#2a2d32]"></div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[#5c6370]">Completed</span>
                  <span className="font-bold text-white">{completedPosts.length}</span>
                </div>
                <div className="w-px h-3 bg-[#2a2d32]"></div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[#5c6370]">Total</span>
                  <span className="font-bold text-white">{posts.length}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <AddPostForm onPostAdded={loadPosts} />
              <div className="w-px h-5 bg-[#2a2d32]"></div>
              <button
                onClick={async () => {
                  clearPostTrackerPassword();
                  await fetch('/api/auth/logout', { method: 'POST' });
                  window.location.href = '/login';
                }}
                className="text-xs text-[#5c6370] hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-[#1a1c20]"
              >
                Log out
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-[#2a2d32] mb-6">
            <nav className="flex overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => router.push(tab.path)}
                  className={`py-3 px-3 md:px-5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
                    currentTab === tab.id
                      ? 'border-[#1d9bf0] text-white'
                      : 'border-transparent text-[#5c6370] hover:text-[#8b9199]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          {children}
        </div>
      </main>
    </div>
  );
}

export default function PostTrackerLayout({ children }: { children: React.ReactNode }) {
  return (
    <PostTrackerProvider>
      <PostTrackerLayoutContent>{children}</PostTrackerLayoutContent>
    </PostTrackerProvider>
  );
}
