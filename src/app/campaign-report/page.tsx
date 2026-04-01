"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatRelativeTime } from "@/lib/utils";

interface Report {
  id: number;
  slug: string;
  title: string;
  brandName: string;
  founderHandle: string | null;
  startDate: string;
  endDate: string | null;
  isPublished: boolean;
  lastFetchedAt: string | null;
  createdAt: string;
}

export default function CampaignReportList() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/campaign-reports")
      .then((res) => res.json())
      .then((data) => {
        setReports(data.reports ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleDelete = async (slug: string) => {
    if (!confirm("Delete this campaign report?")) return;
    const res = await fetch(`/api/campaign-reports/${slug}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setReports((prev) => prev.filter((r) => r.slug !== slug));
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Campaign Reports
          </h1>
          <p className="text-sm text-[#6b7280] mt-1">
            Shareable launch campaign reports with social listening data
          </p>
        </div>
        <Link
          href="/campaign-report/create"
          className="px-4 py-2 bg-[#1d9bf0] text-white text-sm font-semibold rounded-lg hover:bg-[#1a8cd8] transition-colors"
        >
          New Report
        </Link>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="bg-[#111214] border border-[#1e2025] rounded-xl p-5 animate-pulse"
            >
              <div className="h-5 bg-[#1a1c20] rounded w-1/3 mb-3" />
              <div className="h-3 bg-[#1a1c20] rounded w-1/4" />
            </div>
          ))}
        </div>
      ) : reports.length === 0 ? (
        <div className="bg-[#111214] border border-[#1e2025] rounded-2xl p-12 text-center">
          <p className="text-[#6b7280] text-sm">No campaign reports yet</p>
          <p className="text-[#3a3d42] text-xs mt-1">
            Create your first report to get started
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <div
              key={report.id}
              className="bg-[#111214] border border-[#1e2025] rounded-xl p-5 hover:border-[#2e3138] transition-all group"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/campaign-report/${report.slug}`}
                    className="text-white font-semibold text-lg hover:text-[#1d9bf0] transition-colors"
                  >
                    {report.title}
                  </Link>
                  <div className="flex items-center flex-wrap gap-3 mt-1.5 text-xs md:text-sm text-[#6b7280]">
                    <span>{report.brandName}</span>
                    {report.founderHandle && (
                      <>
                        <span className="text-[#3a3d42]">&middot;</span>
                        <span>@{report.founderHandle.replace(/^@/, "")}</span>
                      </>
                    )}
                    <span className="text-[#3a3d42]">&middot;</span>
                    <span>
                      {new Date(report.startDate).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                      {report.endDate &&
                        ` – ${new Date(report.endDate).toLocaleDateString(
                          "en-US",
                          { month: "short", day: "numeric", year: "numeric" }
                        )}`}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-2 text-xs text-[#4a4d52]">
                    <span>
                      Created {formatRelativeTime(new Date(report.createdAt))}
                    </span>
                    {report.lastFetchedAt && (
                      <>
                        <span className="text-[#3a3d42]">&middot;</span>
                        <span>
                          Last fetched{" "}
                          {formatRelativeTime(new Date(report.lastFetchedAt))}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <Link
                    href={`/campaign-report/${report.slug}`}
                    className="px-3 py-1.5 text-xs font-medium text-[#6b7280] hover:text-white bg-[#1a1c20] hover:bg-[#222428] rounded-lg transition-colors"
                  >
                    View
                  </Link>
                  <button
                    onClick={() => handleDelete(report.slug)}
                    className="px-3 py-1.5 text-xs font-medium text-[#6b7280] hover:text-[#f4212e] bg-[#1a1c20] hover:bg-[#2a1215] rounded-lg transition-colors opacity-100 md:opacity-0 md:group-hover:opacity-100"
                  >
                    Delete
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
