"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string | null;
  referenceId: number | null;
  isRead: boolean;
  createdAt: string;
}

interface User {
  id: number;
  twitterHandle: string;
  status: string;
  createdAt: string;
}

export default function AdminDashboardPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [pendingUsers, setPendingUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/notifications").then((r) => r.json()),
      fetch("/api/users?status=pending").then((r) => r.json()),
    ])
      .then(([notifData, userData]) => {
        setNotifications(notifData.notifications ?? []);
        setPendingUsers(userData.users ?? []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const markAsRead = async (ids: number[]) => {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    setNotifications((prev) =>
      prev.map((n) => (ids.includes(n.id) ? { ...n, isRead: true } : n))
    );
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-20 bg-white rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      {/* Pending Requests */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          Pending User Requests
          {pendingUsers.length > 0 && (
            <span className="ml-2 text-sm bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
              {pendingUsers.length}
            </span>
          )}
        </h2>

        {pendingUsers.length === 0 ? (
          <p className="text-gray-500 text-sm bg-white rounded-lg p-4 border border-gray-200">
            No pending requests.
          </p>
        ) : (
          <div className="space-y-2">
            {pendingUsers.map((user) => (
              <Link
                key={user.id}
                href={`/admin/users/${user.id}`}
                className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div>
                  <p className="font-medium text-gray-900">
                    @{user.twitterHandle}
                  </p>
                  <p className="text-xs text-gray-500">
                    Requested{" "}
                    {new Date(user.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full">
                  Pending
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Recent Notifications */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">
            Recent Notifications
          </h2>
          {notifications.some((n) => !n.isRead) && (
            <button
              onClick={() =>
                markAsRead(notifications.filter((n) => !n.isRead).map((n) => n.id))
              }
              className="text-sm text-gray-500 hover:text-gray-900"
            >
              Mark all as read
            </button>
          )}
        </div>

        {notifications.length === 0 ? (
          <p className="text-gray-500 text-sm bg-white rounded-lg p-4 border border-gray-200">
            No notifications.
          </p>
        ) : (
          <div className="space-y-2">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                className={`p-4 bg-white border rounded-lg ${
                  notif.isRead
                    ? "border-gray-200"
                    : "border-blue-200 bg-blue-50"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {notif.title}
                    </p>
                    {notif.message && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        {notif.message}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(notif.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  {!notif.isRead && (
                    <button
                      onClick={() => markAsRead([notif.id])}
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      Mark read
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
