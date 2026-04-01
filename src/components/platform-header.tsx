"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { isAdminEmail } from "@/lib/auth";

const BASE_LAUNCH_CHILDREN = [
  { label: "Social Watch", href: "/dashboard", prefix: "/dashboard" },
  { label: "Post Tracker", href: "/post-tracker", prefix: "/post-tracker" },
  { label: "Claude Bot", href: "/tutorial", prefix: "/tutorial" },
  { label: "Campaign Report", href: "/campaign-report", prefix: "/campaign-report" },
];

const CAPACITY_TAB = { label: "Capacity Tracker", href: "/capacity-tracker", prefix: "/capacity-tracker" };

const UGC_CHILDREN = [
  { label: "References", href: "/ugc/references", prefix: "/ugc/references" },
];

export function PlatformHeader() {
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsAdmin(!!user?.email && isAdminEmail(user.email));
    });
  }, []);

  const launchChildren = isAdmin
    ? [...BASE_LAUNCH_CHILDREN, CAPACITY_TAB]
    : BASE_LAUNCH_CHILDREN;

  // Determine which top-level group is active
  const isUGCActive = pathname.startsWith("/ugc");
  const isLaunchActive =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/post-tracker") ||
    pathname.startsWith("/tutorial") ||
    pathname.startsWith("/campaign-report") ||
    pathname.startsWith("/capacity-tracker");

  return (
    <header className="flex items-center justify-between px-3 md:px-6 h-14 bg-[#0c0d0f] border-b border-[#1a1c20] overflow-x-auto">
      <div className="flex items-center gap-2 md:gap-4">
        <Link href="/post-login" className="flex items-center gap-2.5 shrink-0">
          <img src="/favicon.svg" alt="Shown Media" className="h-6 w-6" />
          <span
            className="text-sm font-bold text-white tracking-tight"
            style={{ fontFamily: "var(--font-brand), sans-serif" }}
          >
            Shown Media
          </span>
        </Link>

        <div className="w-px h-5 bg-[#2a2d32] hidden md:block" />

        {/* Top-level group tabs */}
        <nav className="flex items-center gap-0.5 bg-black/60 rounded-lg p-1 border border-[#1a1c20] shrink-0">
          <Link
            href="/ugc/references"
            className={`px-5 py-2 text-[12px] md:text-[13px] font-semibold rounded-md transition-all min-w-[70px] text-center shrink-0 ${
              isUGCActive
                ? "bg-white text-black"
                : "text-[#6b7280] hover:text-white"
            }`}
          >
            UGC
          </Link>
          <Link
            href="/dashboard"
            className={`px-5 py-2 text-[12px] md:text-[13px] font-semibold rounded-md transition-all min-w-[90px] text-center shrink-0 ${
              isLaunchActive
                ? "bg-white text-black"
                : "text-[#6b7280] hover:text-white"
            }`}
          >
            Launch
          </Link>
        </nav>

        {/* Sub-tabs when Launch is active */}
        {isLaunchActive && (
          <>
            <div className="w-px h-5 bg-[#2a2d32] hidden md:block" />
            <nav className="flex items-center gap-1 shrink-0">
              {launchChildren.map((tab) => {
                const isActive = pathname.startsWith(tab.prefix);
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    className={`px-2.5 md:px-4 py-1.5 text-[12px] md:text-[13px] font-medium rounded-md transition-all shrink-0 ${
                      isActive
                        ? "text-[#1d9bf0] bg-[#1d9bf0]/10"
                        : "text-[#6b7280] hover:text-white"
                    }`}
                  >
                    {tab.label}
                  </Link>
                );
              })}
            </nav>
          </>
        )}

        {/* Sub-tabs when UGC is active */}
        {isUGCActive && (
          <>
            <div className="w-px h-5 bg-[#2a2d32] hidden md:block" />
            <nav className="flex items-center gap-1 shrink-0">
              {UGC_CHILDREN.map((tab) => {
                const isActive = pathname.startsWith(tab.prefix);
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    className={`px-2.5 md:px-4 py-1.5 text-[12px] md:text-[13px] font-medium rounded-md transition-all shrink-0 ${
                      isActive
                        ? "text-[#1d9bf0] bg-[#1d9bf0]/10"
                        : "text-[#6b7280] hover:text-white"
                    }`}
                  >
                    {tab.label}
                  </Link>
                );
              })}
            </nav>
          </>
        )}
      </div>

      {/* Login Menu — far right */}
      <Link
        href="/post-login"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] md:text-[13px] font-medium text-[#6b7280] hover:text-white hover:bg-[#1a1c20] transition-all shrink-0 ml-auto"
        title="Back to main menu"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
        </svg>
        Menu
      </Link>
    </header>
  );
}
