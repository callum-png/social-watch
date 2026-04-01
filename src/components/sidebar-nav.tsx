"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface WatchedUser {
  handle: string;
  queryId: number;
}

export function SidebarNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [watchedUsers, setWatchedUsers] = useState<WatchedUser[]>([]);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newHandle, setNewHandle] = useState("");
  const [adding, setAdding] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const fetchWatchedUsers = async () => {
    try {
      const res = await fetch("/api/searches?category=individual_user");
      const data = await res.json();
      const seen = new Set<string>();
      const users: WatchedUser[] = [];
      for (const s of data.searches ?? []) {
        const match = typeof s.rawQuery === "string" ? s.rawQuery.match(/from:(\w+)/i) : null;
        const raw = match?.[1] ?? (typeof s.label === "string" ? s.label.replace(/^@/, "").split(" ")[0] : null);
        const handle = typeof raw === "string" && raw.length > 0 ? raw : null;
        if (handle && !seen.has(handle.toLowerCase())) {
          seen.add(handle.toLowerCase());
          users.push({ handle, queryId: s.id });
        }
      }
      setWatchedUsers(users);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    fetchWatchedUsers();
  }, [pathname]);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHandle.trim()) return;
    setAdding(true);
    const handle = newHandle.trim().replace(/^@/, "");
    try {
      await fetch("/api/searches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: `@${handle} posts`,
          rawQuery: `from:${handle} since:{today}`,
          category: "individual_user",
        }),
      });
      setNewHandle("");
      setShowAddUser(false);
      await fetchWatchedUsers();
      router.push(`/dashboard/users/${handle}`);
    } catch (error) {
      console.error("Failed to add user:", error);
    } finally {
      setAdding(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  const navItems = [
    {
      label: "Home",
      href: "/dashboard",
      exact: true,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
        </svg>
      ),
    },
    {
      label: "Launches",
      href: "/dashboard/launch-videos",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
        </svg>
      ),
    },
    {
      label: "Memes",
      href: "/dashboard/memes",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ];

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-[60px] left-3 z-50 lg:hidden p-2 rounded-lg bg-[#111214] border border-[#2a2d32] text-[#8b9199] hover:text-white transition-colors"
        aria-label="Open sidebar"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-[#0c0d0f] min-h-screen p-4 flex flex-col border-r border-[#1a1c20] transform transition-transform duration-300 ease-in-out ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} lg:static lg:translate-x-0`}>
      {/* Section label */}
      <div className="mb-6 px-2">
        <span className="text-xs font-semibold text-[#5c6370] uppercase tracking-wider">Social Watch</span>
      </div>

      {/* Main nav */}
      <nav className="space-y-1">
        {navItems.map((item) => {
          const isActive = "exact" in item && item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isActive
                  ? "bg-[#1d9bf0]/15 text-[#1d9bf0]"
                  : "text-[#8b9199] hover:text-white hover:bg-[#1a1c20]"
              }`}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Users section */}
      <div className="mt-6 pt-6 border-t border-[#2a2d32]">
        <div className="flex items-center justify-between px-3 mb-2">
          <span className="text-xs font-semibold text-[#5c6370] uppercase tracking-wider">
            Users
          </span>
          <button
            onClick={() => setShowAddUser(!showAddUser)}
            className="text-[#5c6370] hover:text-[#1d9bf0] transition-colors"
            title={showAddUser ? "Cancel" : "Add user"}
          >
            {showAddUser ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            )}
          </button>
        </div>

        {showAddUser && (
          <form onSubmit={handleAddUser} className="px-3 mb-3">
            <div className="flex gap-1.5">
              <input
                type="text"
                value={newHandle}
                onChange={(e) => setNewHandle(e.target.value)}
                placeholder="@handle"
                className="flex-1 min-w-0 px-2.5 py-1.5 bg-black/50 border border-[#2a2d32] rounded-lg text-sm text-white placeholder-[#5c6370] outline-none focus:ring-1 focus:ring-[#1d9bf0]/50"
                autoFocus
              />
              <button
                type="submit"
                disabled={adding || !newHandle.trim()}
                className="px-2.5 py-1.5 bg-[#1d9bf0] hover:bg-[#1a8cd8] rounded-lg text-white text-sm font-medium disabled:opacity-50 transition-colors"
              >
                {adding ? "..." : "+"}
              </button>
            </div>
          </form>
        )}

        <nav className="space-y-0.5 max-h-48 overflow-y-auto">
          {watchedUsers.map((user) => {
            const isActive = pathname === `/dashboard/users/${user.handle}`;
            return (
              <Link
                key={user.handle}
                href={`/dashboard/users/${user.handle}`}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-colors ${
                  isActive
                    ? "bg-[#1d9bf0]/15 text-[#1d9bf0]"
                    : "text-[#8b9199] hover:text-white hover:bg-[#1a1c20]"
                }`}
              >
                <img
                  src={`https://unavatar.io/twitter/${user.handle}`}
                  alt={user.handle}
                  className="w-6 h-6 rounded-full border border-[#2a2d32]"
                  onError={(e) => {
                    const el = e.target as HTMLImageElement;
                    el.style.display = "none";
                  }}
                />
                <span className="truncate">@{user.handle}</span>
              </Link>
            );
          })}
          {watchedUsers.length === 0 && !showAddUser && (
            <button
              onClick={() => setShowAddUser(true)}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-[#5c6370] hover:text-[#8b9199] transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM3 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 019.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
              </svg>
              Add a user to watch
            </button>
          )}
        </nav>
      </div>

      {/* Bottom */}
      <div className="mt-auto pt-4 border-t border-[#2a2d32] space-y-0.5">
        <Link
          href="/admin"
          className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-[#5c6370] hover:text-white hover:bg-[#1a1c20] transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Admin
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-[#5c6370] hover:text-white hover:bg-[#1a1c20] transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
          </svg>
          Sign Out
        </button>
      </div>
    </aside>
    </>
  );
}
