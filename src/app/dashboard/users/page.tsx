"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface WatchedAccount {
  id: number;
  twitterHandle: string;
}

export default function WatchedUsersPage() {
  const [accounts, setAccounts] = useState<WatchedAccount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const match = document.cookie.match(/user_id=(\d+)/);
    if (!match) {
      setLoading(false);
      return;
    }
    const userId = match[1];

    fetch(`/api/users/${userId}`)
      .then((res) => res.json())
      .then((data) => {
        setAccounts(data.watchedAccounts ?? []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-gray-900">Watched Users</h1>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Watched Users</h1>
        <p className="text-sm text-gray-500 mt-1">
          Individual accounts you&apos;re monitoring
        </p>
      </div>

      {accounts.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg">No watched accounts yet.</p>
          <p className="text-sm mt-1">
            <Link href="/onboarding" className="text-gray-900 underline">
              Set up your account
            </Link>{" "}
            to start watching.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {accounts.map((account) => (
            <Link
              key={account.id}
              href={`/dashboard/users/${account.twitterHandle}`}
              className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold text-sm">
                {account.twitterHandle[0].toUpperCase()}
              </div>
              <div>
                <p className="font-medium text-gray-900">
                  @{account.twitterHandle}
                </p>
              </div>
              <svg
                className="w-5 h-5 text-gray-400 ml-auto"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
