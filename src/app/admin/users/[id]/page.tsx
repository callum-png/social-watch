"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";

interface User {
  id: number;
  twitterHandle: string;
  status: string;
  displayName: string | null;
  adminNotes: string | null;
  createdAt: string;
  approvedAt: string | null;
}

interface WatchedAccount {
  id: number;
  twitterHandle: string;
}

interface SearchQuery {
  id: number;
  label: string;
  rawQuery: string;
  category: string;
  isActive: boolean;
  lastRunAt: string | null;
  lastResultCount: number | null;
}

export default function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [accounts, setAccounts] = useState<WatchedAccount[]>([]);
  const [searches, setSearches] = useState<SearchQuery[]>([]);
  const [loading, setLoading] = useState(true);

  // New search form
  const [newLabel, setNewLabel] = useState("");
  const [newRawQuery, setNewRawQuery] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  const fetchData = async () => {
    try {
      const [userData, searchData] = await Promise.all([
        fetch(`/api/users/${id}`).then((r) => r.json()),
        fetch(`/api/users/${id}/searches`).then((r) => r.json()),
      ]);
      setUser(userData.user);
      setAccounts(userData.watchedAccounts ?? []);
      setSearches(searchData.searches ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleApprove = async () => {
    await fetch(`/api/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "approved" }),
    });
    fetchData();
  };

  const handleReject = async () => {
    await fetch(`/api/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "rejected" }),
    });
    fetchData();
  };

  const handleAddSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel || !newRawQuery) return;

    await fetch(`/api/users/${id}/searches`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: newLabel,
        rawQuery: newRawQuery,
        category: "individual_user",
      }),
    });
    setNewLabel("");
    setNewRawQuery("");
    setShowAddForm(false);
    fetchData();
  };

  const handleDeleteSearch = async (searchId: number) => {
    await fetch(`/api/users/${id}/searches`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ searchQueryId: searchId }),
    });
    fetchData();
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-200 rounded w-48 animate-pulse" />
        <div className="h-32 bg-white rounded-lg animate-pulse" />
      </div>
    );
  }

  if (!user) {
    return <p className="text-gray-500">User not found.</p>;
  }

  const statusColors: Record<string, string> = {
    pending: "bg-amber-100 text-amber-700",
    approved: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-700",
    suspended: "bg-gray-100 text-gray-500",
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <button
          onClick={() => router.push("/admin/users")}
          className="text-gray-400 hover:text-gray-600"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-2xl font-bold text-gray-900">
          @{user.twitterHandle}
        </h1>
        <span
          className={`text-xs px-2 py-0.5 rounded-full ${statusColors[user.status] ?? ""}`}
        >
          {user.status}
        </span>
      </div>

      {/* User Info */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Created</span>
            <p className="text-gray-900">
              {new Date(user.createdAt).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>
          {user.approvedAt && (
            <div>
              <span className="text-gray-500">Approved</span>
              <p className="text-gray-900">
                {new Date(user.approvedAt).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>
          )}
        </div>

        {/* Watched accounts */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            Watching
          </span>
          <div className="flex flex-wrap gap-2 mt-2">
            {accounts.map((a) => (
              <span
                key={a.id}
                className="px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-700"
              >
                @{a.twitterHandle}
              </span>
            ))}
            {accounts.length === 0 && (
              <span className="text-sm text-gray-400">No accounts</span>
            )}
          </div>
        </div>

        {/* Approve / Reject */}
        {user.status === "pending" && (
          <div className="mt-4 pt-4 border-t border-gray-100 flex gap-2">
            <button
              onClick={handleApprove}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
            >
              Approve
            </button>
            <button
              onClick={handleReject}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
            >
              Reject
            </button>
          </div>
        )}
      </div>

      {/* Search Queries */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">
            Search Queries
            <span className="ml-2 text-sm font-normal text-gray-500">
              ({searches.length})
            </span>
          </h2>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="text-sm px-3 py-1.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
          >
            {showAddForm ? "Cancel" : "+ Add search"}
          </button>
        </div>

        {/* Add form */}
        {showAddForm && (
          <form
            onSubmit={handleAddSearch}
            className="bg-white border border-gray-200 rounded-lg p-4 mb-4 space-y-3"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Label
              </label>
              <input
                type="text"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="e.g., User's AI tweets (500+ likes)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Raw Query
              </label>
              <input
                type="text"
                value={newRawQuery}
                onChange={(e) => setNewRawQuery(e.target.value)}
                placeholder='e.g., from:username (AI OR launch) min_faves:500 since:{today}'
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
              <p className="text-xs text-gray-400 mt-1">
                Use {"{today}"} for dynamic date. min_faves:N will be extracted
                and used as a post-query filter.
              </p>
            </div>
            <button
              type="submit"
              disabled={!newLabel || !newRawQuery}
              className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 text-sm font-medium"
            >
              Add query
            </button>
          </form>
        )}

        {/* Search list */}
        {searches.length === 0 ? (
          <p className="text-gray-500 text-sm bg-white rounded-lg p-4 border border-gray-200">
            No search queries configured. Add one above.
          </p>
        ) : (
          <div className="space-y-2">
            {searches.map((search) => (
              <div
                key={search.id}
                className="bg-white border border-gray-200 rounded-lg p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {search.label}
                    </p>
                    <p className="text-xs text-gray-500 mt-1 font-mono truncate">
                      {search.rawQuery}
                    </p>
                    {search.lastRunAt && (
                      <p className="text-xs text-gray-400 mt-1">
                        Last run:{" "}
                        {new Date(search.lastRunAt).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}{" "}
                        ({search.lastResultCount ?? 0} results)
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteSearch(search.id)}
                    className="text-gray-400 hover:text-red-500 ml-3"
                    title="Delete query"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
