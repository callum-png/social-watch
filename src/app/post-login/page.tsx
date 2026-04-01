"use client";

import Link from "next/link";
import { useState } from "react";

export default function DashboardHub() {
  const [hovering, setHovering] = useState<"social" | "admin" | null>(null);

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Subtle background glow */}
      <div
        className="absolute inset-0 transition-opacity duration-700"
        style={{
          background:
            hovering === "social"
              ? "radial-gradient(ellipse at 35% 50%, rgba(29,155,240,0.06) 0%, transparent 60%)"
              : hovering === "admin"
                ? "radial-gradient(ellipse at 65% 50%, rgba(139,92,246,0.06) 0%, transparent 60%)"
                : "none",
        }}
      />

      {/* Branding */}
      <div className="relative z-10 flex flex-col items-center mb-12">
        <img src="/favicon.svg" alt="" className="w-10 h-10 mb-4" />
        <h1
          className="text-2xl font-bold text-white tracking-tight"
          style={{ fontFamily: "var(--font-brand), sans-serif" }}
        >
          Shown Media
        </h1>
        <p className="text-sm text-[#4a4d52] mt-1">Where do you want to go?</p>
      </div>

      {/* Choice cards */}
      <div className="relative z-10 flex flex-col sm:flex-row gap-4 sm:gap-6 w-full max-w-2xl">
        {/* Social Watch */}
        <Link
          href="/dashboard"
          onMouseEnter={() => setHovering("social")}
          onMouseLeave={() => setHovering(null)}
          className="group flex-1 relative bg-[#111214] border border-[#1e2025] rounded-2xl p-8 hover:border-[#1d9bf0]/40 hover:bg-[#111214] hover:shadow-[0_8px_40px_rgba(29,155,240,0.1)] hover:translate-y-[-4px] transition-all duration-500 ease-out"
        >
          <div className="w-14 h-14 rounded-2xl bg-[#1d9bf0]/10 border border-[#1d9bf0]/20 flex items-center justify-center mb-5 group-hover:scale-110 group-hover:bg-[#1d9bf0]/15 transition-all duration-500">
            <svg className="w-7 h-7 text-[#1d9bf0]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2 group-hover:text-[#e8eaed] transition-colors duration-300">
            Social Watch
          </h2>
          <p className="text-sm text-[#6b7280] leading-relaxed group-hover:text-[#8b9199] transition-colors duration-300">
            Monitor launches, memes, and tracked accounts across X/Twitter
          </p>
          <div className="mt-5 flex items-center gap-1.5 text-xs font-medium text-[#1d9bf0] opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-500">
            Open dashboard
            <svg className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </Link>

        {/* Admin Tools */}
        <Link
          href="/dashboard/admin"
          onMouseEnter={() => setHovering("admin")}
          onMouseLeave={() => setHovering(null)}
          className="group flex-1 relative bg-[#111214] border border-[#1e2025] rounded-2xl p-8 hover:border-[#8b5cf6]/40 hover:bg-[#111214] hover:shadow-[0_8px_40px_rgba(139,92,246,0.1)] hover:translate-y-[-4px] transition-all duration-500 ease-out"
        >
          <div className="w-14 h-14 rounded-2xl bg-[#8b5cf6]/10 border border-[#8b5cf6]/20 flex items-center justify-center mb-5 group-hover:scale-110 group-hover:bg-[#8b5cf6]/15 transition-all duration-500">
            <svg className="w-7 h-7 text-[#8b5cf6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.42 15.17l-5.66-5.66a8 8 0 1111.32 0l-5.66 5.66zm0 0l5.66 5.66m-5.66-5.66L5.76 20.83M15 9h.01" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2 group-hover:text-[#e8eaed] transition-colors duration-300">
            Admin Tools
          </h2>
          <p className="text-sm text-[#6b7280] leading-relaxed group-hover:text-[#8b9199] transition-colors duration-300">
            Campaign reports, search queries, and system administration
          </p>
          <div className="mt-5 flex items-center gap-1.5 text-xs font-medium text-[#8b5cf6] opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-500">
            Open admin
            <svg className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </Link>
      </div>
    </div>
  );
}
