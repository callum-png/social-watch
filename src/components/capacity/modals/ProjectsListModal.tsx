"use client";

import { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { Pencil, Loader2, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/capacity/ui/dialog";

interface Project {
  id: number;
  project_name: string;
  client_name: string;
  start_date: string;
  end_date: string;
  status: string;
  project_type?: { id: number; name: string; color: string };
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  scheduled:   { label: "Scheduled",   color: "#3585CC" },
  in_progress: { label: "In Progress", color: "#E8630A" },
  completed:   { label: "Completed",   color: "#22c55e" },
  on_hold:     { label: "On Hold",     color: "#6b7280" },
};

interface ProjectsListModalProps {
  open: boolean;
  month: string;
  onClose: () => void;
  onEdit: (id: number) => void;
  onRefresh?: () => void;
}

export function ProjectsListModal({ open, month, onClose, onEdit, onRefresh }: ProjectsListModalProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    if (!open) return;
    setConfirmClear(false);
    setLoading(true);
    fetch("/api/capacity/projects")
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((json) => { setProjects(json.projects ?? []); setLoading(false); })
      .catch(() => { setProjects([]); setLoading(false); });
  }, [open, month]);

  const handleClearAll = async () => {
    setClearing(true);
    await fetch("/api/capacity/projects/clear", { method: "DELETE" });
    setProjects([]);
    setClearing(false);
    setConfirmClear(false);
    onRefresh?.();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>All Projects</DialogTitle>
            {!confirmClear ? (
              <button
                onClick={() => setConfirmClear(true)}
                className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear All
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-red-400">Delete all projects?</span>
                <button
                  onClick={handleClearAll}
                  disabled={clearing}
                  className="text-xs font-semibold text-red-400 hover:text-red-300 border border-red-800 rounded px-2 py-0.5"
                >
                  {clearing ? "Clearing…" : "Yes, delete all"}
                </button>
                <button onClick={() => setConfirmClear(false)} className="text-xs text-gray-500 hover:text-gray-300">
                  Cancel
                </button>
              </div>
            )}
          </div>
          <DialogDescription>Click the pencil to edit. Drag phase bars on the timeline to reschedule.</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
          </div>
        ) : projects.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-500">No projects this month.</p>
        ) : (
          <div className="space-y-2">
            {projects.map((p) => {
              const status = STATUS_LABELS[p.status] ?? STATUS_LABELS.scheduled;
              return (
                <div
                  key={p.id}
                  className="flex items-center gap-3 rounded-lg border border-[#2a2d32] bg-[#111214] px-3 py-2.5"
                >
                  {/* Pod color dot */}
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: p.project_type?.color ?? "#6b7280" }}
                  />

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-gray-200 truncate">
                        {p.project_type?.name ?? "—"}
                      </span>
                      <span className="text-gray-600 text-xs">·</span>
                      <span className="text-xs text-gray-400 truncate">{p.client_name}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] text-gray-500 truncate">{p.project_name}</span>
                      <span className="text-gray-700 text-[10px]">
                        {format(parseISO(p.start_date), "MMM d")} – {format(parseISO(p.end_date), "MMM d")}
                      </span>
                    </div>
                  </div>

                  {/* Status badge */}
                  <span
                    className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0"
                    style={{ color: status.color, backgroundColor: `${status.color}22` }}
                  >
                    {status.label}
                  </span>

                  {/* Edit button */}
                  <button
                    onClick={() => { onEdit(p.id); onClose(); }}
                    className="flex-shrink-0 p-1 rounded text-gray-600 hover:text-gray-200 hover:bg-[#2a2d32] transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
