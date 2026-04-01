"use client";

import { useEffect, useState } from "react";

interface SearchQuery {
  id: number;
  label: string;
  rawQuery: string;
  category: string;
  isActive: boolean;
  lastRunAt: string | null;
  lastResultCount: number | null;
}

export default function AdminQueriesPage() {
  const [searches, setSearches] = useState<SearchQuery[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"launch_videos" | "memes">(
    "launch_videos"
  );
  const [showAddForm, setShowAddForm] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newRawQuery, setNewRawQuery] = useState("");

  const fetchSearches = async () => {
    try {
      const res = await fetch(`/api/searches?category=${activeTab}`);
      const data = await res.json();
      setSearches(data.searches ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchSearches();
  }, [activeTab]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel || !newRawQuery) return;

    await fetch("/api/searches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: newLabel,
        rawQuery: newRawQuery,
        category: activeTab,
      }),
    });
    setNewLabel("");
    setNewRawQuery("");
    setShowAddForm(false);
    fetchSearches();
  };

  const handleDelete = async (id: number) => {
    await fetch(`/api/searches/${id}`, { method: "DELETE" });
    fetchSearches();
  };

  const handleToggle = async (id: number, isActive: boolean) => {
    await fetch(`/api/searches/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    fetchSearches();
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Global Search Queries
      </h1>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit mb-6">
        {[
          { key: "launch_videos" as const, label: "Launch Videos" },
          { key: "memes" as const, label: "Memes" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{searches.length} queries</p>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="text-sm px-3 py-1.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
        >
          {showAddForm ? "Cancel" : "+ Add query"}
        </button>
      </div>

      {/* Add form */}
      {showAddForm && (
        <form
          onSubmit={handleAdd}
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
              placeholder="e.g., Viral AI launches (1000+ likes)"
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
              placeholder='e.g., introducing (AI OR tool) min_faves:1000 since:{today}'
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            />
            <p className="text-xs text-gray-400 mt-1">
              Use {"{today}"} for dynamic date. min_faves:N is extracted for
              post-query filtering.
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

      {/* Query list */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-white rounded-lg animate-pulse" />
          ))}
        </div>
      ) : searches.length === 0 ? (
        <p className="text-gray-500 text-sm bg-white rounded-lg p-4 border border-gray-200">
          No queries for this category. Add one above.
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
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900">
                      {search.label}
                    </p>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        search.isActive
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {search.isActive ? "Active" : "Paused"}
                    </span>
                  </div>
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
                <div className="flex items-center gap-2 ml-3">
                  <button
                    onClick={() => handleToggle(search.id, search.isActive)}
                    className="text-xs text-gray-500 hover:text-gray-900"
                  >
                    {search.isActive ? "Pause" : "Resume"}
                  </button>
                  <button
                    onClick={() => handleDelete(search.id)}
                    className="text-gray-400 hover:text-red-500"
                    title="Delete"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
