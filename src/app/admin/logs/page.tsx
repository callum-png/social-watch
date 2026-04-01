"use client";

import { useEffect, useState } from "react";

interface CronRun {
  id: number;
  startedAt: string;
  completedAt: string | null;
  queriesExecuted: number | null;
  tweetsFound: number | null;
  tweetsStored: number | null;
  errors: string[] | null;
  status: string;
}

export default function AdminLogsPage() {
  const [runs, setRuns] = useState<CronRun[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/logs")
      .then((r) => r.json())
      .then((data) => setRuns(data.runs ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const statusColors: Record<string, string> = {
    running: "bg-blue-100 text-blue-700",
    completed: "bg-green-100 text-green-700",
    completed_with_errors: "bg-amber-100 text-amber-700",
    failed: "bg-red-100 text-red-700",
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Cron Run Logs</h1>

      {runs.length === 0 ? (
        <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
          <p className="text-gray-500">No cron runs yet.</p>
          <p className="text-sm text-gray-400 mt-1">
            The cron job runs every 30 minutes and will appear here.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                  Time
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                  Queries
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                  Found
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                  Stored
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {runs.map((run) => (
                <tr key={run.id}>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {new Date(run.startedAt).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${statusColors[run.status] ?? ""}`}
                    >
                      {run.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {run.queriesExecuted ?? 0}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {run.tweetsFound ?? 0}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {run.tweetsStored ?? 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
