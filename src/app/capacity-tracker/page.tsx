"use client";

import { useState, useCallback } from "react";
import { format } from "date-fns";
import { Plus } from "lucide-react";
import { MonthTabs } from "@/components/capacity/dashboard/MonthTabs";
import { CapacityChart } from "@/components/capacity/dashboard/CapacityChart";
import { DeadlinesCard } from "@/components/capacity/dashboard/DeadlinesCard";
import { ProjectTimeline } from "@/components/capacity/dashboard/ProjectTimeline";
import { SlotTracker } from "@/components/capacity/dashboard/SlotTracker";
import { AddProjectModal } from "@/components/capacity/modals/AddProjectModal";
import { EditProjectModal } from "@/components/capacity/modals/EditProjectModal";
import { Button } from "@/components/capacity/ui/button";
import Link from "next/link";

type Tab = "schedule" | "slots";

export default function CapacityTrackerPage() {
  const [activeTab, setActiveTab] = useState<Tab>("schedule");
  const [selectedMonth, setSelectedMonth] = useState(
    format(new Date(), "yyyy-MM")
  );
  const [addOpen, setAddOpen] = useState(false);
  const [editProjectId, setEditProjectId] = useState<number | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-[#1a1c20] bg-black/95 backdrop-blur supports-[backdrop-filter]:bg-black/60">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/admin"
              className="text-[#4a4d52] hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">
                Capacity Tracker
              </h1>
              <p className="text-sm text-[#6b7280]">
                Team scheduling & capacity planning
              </p>
            </div>

            {/* Tab switcher */}
            <div className="flex rounded-lg border border-[#2a2d32] p-0.5 ml-4">
              <button
                onClick={() => setActiveTab("schedule")}
                className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  activeTab === "schedule"
                    ? "bg-white text-black"
                    : "text-[#6b7280] hover:text-white"
                }`}
              >
                Schedule
              </button>
              <button
                onClick={() => setActiveTab("slots")}
                className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  activeTab === "slots"
                    ? "bg-white text-black"
                    : "text-[#6b7280] hover:text-white"
                }`}
              >
                Slot Tracker
              </button>
            </div>
          </div>

          {activeTab === "schedule" && (
            <Button onClick={() => setAddOpen(true)} size="sm">
              <Plus className="mr-1.5 h-4 w-4" />
              New Project
            </Button>
          )}
        </div>
      </header>

      {activeTab === "schedule" ? (
        <main className="px-6 py-6 space-y-6 relative z-10">
          {/* Month navigation */}
          <MonthTabs
            key={`month-${refreshKey}`}
            selectedMonth={selectedMonth}
            onMonthChange={setSelectedMonth}
          />

          {/* Capacity bar chart */}
          <CapacityChart key={`cap-${refreshKey}`} month={selectedMonth} />

          {/* Stats row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DeadlinesCard key={`dl-${refreshKey}`} month={selectedMonth} />
          </div>

          {/* Gantt timeline */}
          <ProjectTimeline
            key={`timeline-${refreshKey}`}
            month={selectedMonth}
            onProjectClick={(id) => setEditProjectId(id)}
          />
        </main>
      ) : (
        <main className="px-6 py-6 relative z-10">
          <SlotTracker key={`slots-${refreshKey}`} onRefresh={handleRefresh} />
        </main>
      )}

      {/* Modals */}
      <AddProjectModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSuccess={() => {
          setAddOpen(false);
          handleRefresh();
        }}
      />
      <EditProjectModal
        projectId={editProjectId}
        open={editProjectId !== null}
        onClose={() => setEditProjectId(null)}
        onSuccess={() => {
          setEditProjectId(null);
          handleRefresh();
        }}
      />
    </div>
  );
}
