"use client";

import Link from "next/link";

export default function AdminToolsPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link
              href="/dashboard"
              className="text-[#4a4d52] hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
            </Link>
            <h1 className="text-2xl font-bold text-white tracking-tight">Admin Tools</h1>
          </div>
          <p className="text-sm text-[#6b7280] ml-8">System administration and management</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Campaign Reports */}
        <Link
          href="/campaign-report"
          className="group bg-[#111214] border border-[#1e2025] rounded-2xl p-6 hover:border-[#2e3138] hover:bg-[#131517] hover:translate-y-[-2px] hover:shadow-[0_8px_32px_rgba(0,0,0,0.4)] transition-all duration-500"
        >
          <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-500" style={{ background: "#1d9bf010", border: "1px solid #1d9bf020", color: "#1d9bf0" }}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
            </svg>
          </div>
          <h3 className="text-base font-bold text-white mb-1 group-hover:text-[#e8eaed] transition-colors">Campaign Reports</h3>
          <p className="text-sm text-[#6b7280] group-hover:text-[#8b9199] transition-colors">Create and manage shareable campaign reports</p>
        </Link>

        {/* Search Queries */}
        <Link
          href="/dashboard/settings"
          className="group bg-[#111214] border border-[#1e2025] rounded-2xl p-6 hover:border-[#2e3138] hover:bg-[#131517] hover:translate-y-[-2px] hover:shadow-[0_8px_32px_rgba(0,0,0,0.4)] transition-all duration-500"
        >
          <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-500" style={{ background: "#f59e0b10", border: "1px solid #f59e0b20", color: "#f59e0b" }}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </div>
          <h3 className="text-base font-bold text-white mb-1 group-hover:text-[#e8eaed] transition-colors">Search Queries</h3>
          <p className="text-sm text-[#6b7280] group-hover:text-[#8b9199] transition-colors">Manage Twitter search queries and tracked terms</p>
        </Link>

        {/* User Management */}
        <Link
          href="/admin"
          className="group bg-[#111214] border border-[#1e2025] rounded-2xl p-6 hover:border-[#2e3138] hover:bg-[#131517] hover:translate-y-[-2px] hover:shadow-[0_8px_32px_rgba(0,0,0,0.4)] transition-all duration-500"
        >
          <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-500" style={{ background: "#8b5cf610", border: "1px solid #8b5cf620", color: "#8b5cf6" }}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
          </div>
          <h3 className="text-base font-bold text-white mb-1 group-hover:text-[#e8eaed] transition-colors">User Management</h3>
          <p className="text-sm text-[#6b7280] group-hover:text-[#8b9199] transition-colors">Approve, manage, and monitor platform users</p>
        </Link>

        {/* Capacity Tracker */}
        <Link
          href="/capacity-tracker"
          className="group bg-[#111214] border border-[#1e2025] rounded-2xl p-6 hover:border-[#2e3138] hover:bg-[#131517] hover:translate-y-[-2px] hover:shadow-[0_8px_32px_rgba(0,0,0,0.4)] transition-all duration-500"
        >
          <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-500" style={{ background: "#10b98110", border: "1px solid #10b98120", color: "#10b981" }}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
          </div>
          <h3 className="text-base font-bold text-white mb-1 group-hover:text-[#e8eaed] transition-colors">Capacity Tracker</h3>
          <p className="text-sm text-[#6b7280] group-hover:text-[#8b9199] transition-colors">Team scheduling, utilization, and project planning</p>
        </Link>
      </div>

      {/* Placeholder for future tools */}
      <div className="mt-8 bg-[#0c0d0f] border border-dashed border-[#2a2d32] rounded-2xl p-8 text-center">
        <p className="text-sm text-[#4a4d52]">More tools coming soon</p>
      </div>
    </div>
  );
}
