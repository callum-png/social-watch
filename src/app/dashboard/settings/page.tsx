"use client";

import { useEffect, useState } from "react";

interface SearchQuery {
  id: number;
  category: string;
  label: string;
  rawQuery: string;
  isActive: boolean;
  lastRunAt: string | null;
  lastResultCount: number | null;
}

export default function SettingsPage() {
  const [searches, setSearches] = useState<SearchQuery[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(
    "launch_videos"
  );

  useEffect(() => {
    Promise.all([
      fetch("/api/searches?category=launch_videos").then((r) => r.json()),
      fetch("/api/searches?category=memes").then((r) => r.json()),
    ])
      .then(([launchData, memeData]) => {
        setSearches([
          ...(launchData.searches ?? []),
          ...(memeData.searches ?? []),
        ]);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const categories = [
    { key: "launch_videos", label: "Launch Videos" },
    { key: "memes", label: "Memes" },
  ];

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          Search Configuration
        </h1>
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Search Configuration</h1>
        <p className="text-sm text-gray-500 mt-1">
          View all active search queries configured for your monitoring
        </p>
      </div>

      <div className="space-y-3">
        {categories.map((cat) => {
          const catSearches = searches.filter((s) => s.category === cat.key);
          const isExpanded = expandedCategory === cat.key;

          return (
            <div
              key={cat.key}
              className="border border-gray-200 rounded-lg overflow-hidden"
            >
              <button
                onClick={() => setExpandedCategory(isExpanded ? null : cat.key)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="font-medium text-gray-900">{cat.label}</span>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                    {catSearches.length} queries
                  </span>
                </div>
                <svg
                  className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {isExpanded && (
                <div className="border-t border-gray-200 divide-y divide-gray-100">
                  {catSearches.length === 0 ? (
                    <p className="p-4 text-sm text-gray-500">
                      No queries configured yet.
                    </p>
                  ) : (
                    catSearches.map((search) => (
                      <div key={search.id} className="p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {search.label}
                            </p>
                            <p className="text-xs text-gray-500 mt-1 font-mono">
                              {search.rawQuery}
                            </p>
                          </div>
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
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
