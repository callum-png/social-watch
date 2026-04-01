"use client";

import { useState, useEffect, useCallback } from "react";
import { Trash2, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/capacity/ui/dialog";
import { Button } from "@/components/capacity/ui/button";
import { Input } from "@/components/capacity/ui/input";
import { DatePicker } from "@/components/capacity/ui/date-picker";
import { Textarea } from "@/components/capacity/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/capacity/ui/select";

interface EditProjectModalProps {
  projectId: number | null;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ProjectPhase {
  name: string;
  start_date: string;
  end_date: string;
}

interface PodType {
  id: number;
  name: string;
  color: string;
}

const ALL_PHASE_DEFS = [
  { name: "Script",              color: "#eab308" },
  { name: "Shoot Day",           color: "#06b6d4" },
  { name: "Storyboard",          color: "#2569A8" },
  { name: "Motion Design",       color: "#E8630A" },
  { name: "Influencer Campaign", color: "#a855f7" },
  { name: "Social Assets",       color: "#22c55e" },
  { name: "Product Explainer",   color: "#f43f5e" },
] as const;

const STATUS_OPTIONS = [
  { value: "scheduled",   label: "Scheduled" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed",   label: "Completed" },
  { value: "on_hold",     label: "On Hold" },
];

export function EditProjectModal({
  projectId,
  open,
  onClose,
  onSuccess,
}: EditProjectModalProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [podTypes, setPodTypes] = useState<PodType[]>([]);
  const [projectTypeId, setProjectTypeId] = useState<string>("");
  const [name, setName] = useState("");
  const [client, setClient] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [phases, setPhases] = useState<ProjectPhase[]>([]);
  const [status, setStatus] = useState("scheduled");
  const [notes, setNotes] = useState("");
  const [clientImageUrl, setClientImageUrl] = useState("");

  // Load pod types once
  useEffect(() => {
    fetch("/api/capacity/project-types")
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((json) => setPodTypes(json.types ?? []))
      .catch(() => {});
  }, []);

  const fetchProject = useCallback(async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/capacity/projects/${id}`);
      if (!res.ok) throw new Error("Failed to fetch project");
      const json = await res.json();
      const data = json.project ?? json;
      setProjectTypeId(String(data.project_type_id ?? data.project_type?.id ?? ""));
      setName(data.project_name ?? "");
      setClient(data.client_name ?? "");
      setStartDate(data.start_date ?? "");
      setEndDate(data.end_date ?? "");
      setPhases(data.phases ?? []);
      setStatus(data.status ?? "scheduled");
      setNotes(data.notes ?? "");
      setClientImageUrl(data.client_image_url ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load project");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open && projectId !== null) {
      setShowDeleteConfirm(false);
      fetchProject(projectId);
    }
  }, [open, projectId, fetchProject]);

  const handleSave = async () => {
    if (saving || projectId === null) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/capacity/projects/${projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_type_id: projectTypeId ? Number(projectTypeId) : undefined,
          project_name: name,
          client_name: client,
          start_date: startDate,
          end_date: endDate,
          phases,
          status,
          notes,
          client_image_url: clientImageUrl,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to save project");
      }
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (deleting || projectId === null) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/capacity/projects/${projectId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete project");
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  const isBusy = saving || deleting;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Campaign</DialogTitle>
          <DialogDescription>Update details, phases, or status.</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
          </div>
        ) : error && !name ? (
          <div className="py-8 text-center">
            <p className="text-sm text-red-400">{error}</p>
            <Button variant="outline" size="sm" className="mt-3"
              onClick={() => projectId !== null && fetchProject(projectId)}>
              Retry
            </Button>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {error && (
                <div className="rounded-md border border-red-800 bg-red-950/50 px-3 py-2 text-sm text-red-400">
                  {error}
                </div>
              )}

              {/* Pod selector */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Pod</label>
                <Select value={projectTypeId} onValueChange={setProjectTypeId} disabled={isBusy}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select pod…" />
                  </SelectTrigger>
                  <SelectContent>
                    {podTypes.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                          {p.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Client Name</label>
                <Input value={client} onChange={(e) => setClient(e.target.value)} disabled={isBusy} />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Client Logo URL</label>
                <div className="flex items-center gap-2">
                  {clientImageUrl && (
                    <img
                      src={clientImageUrl}
                      alt="preview"
                      className="w-8 h-8 rounded object-contain bg-[#1a1c20] flex-shrink-0"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  )}
                  <Input
                    value={clientImageUrl}
                    onChange={(e) => setClientImageUrl(e.target.value)}
                    placeholder="https://logo.clearbit.com/nike.com"
                    disabled={isBusy}
                  />
                </div>
                <p className="text-[10px] text-gray-600">Paste any image URL — try logo.clearbit.com/yourdomain.com</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Campaign Name</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} disabled={isBusy} />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Start Date</label>
                  <DatePicker value={startDate} onChange={setStartDate} disabled={isBusy} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">End Date</label>
                  <DatePicker value={endDate} onChange={setEndDate} disabled={isBusy} />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Status</label>
                <Select value={status} onValueChange={setStatus} disabled={isBusy}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Phase management */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Campaign Phases</label>

                {/* Checkbox grid */}
                <div className="grid grid-cols-2 gap-2">
                  {ALL_PHASE_DEFS.map((def) => {
                    const isOn = phases.some((p) => p.name === def.name);
                    return (
                      <button
                        key={def.name}
                        type="button"
                        disabled={isBusy}
                        onClick={() => {
                          if (isOn) {
                            setPhases((prev) => prev.filter((p) => p.name !== def.name));
                          } else {
                            setPhases((prev) => [
                              ...prev,
                              { name: def.name, start_date: startDate, end_date: endDate },
                            ]);
                          }
                        }}
                        className="flex items-center gap-2 rounded-lg border px-3 py-2 text-left transition-colors"
                        style={{
                          borderColor: isOn ? def.color : "#2a2d32",
                          background:  isOn ? `${def.color}18` : "#0d0e10",
                          opacity: isBusy ? 0.5 : 1,
                        }}
                      >
                        <div
                          className="w-3.5 h-3.5 rounded-sm flex items-center justify-center flex-shrink-0 border"
                          style={{
                            borderColor: isOn ? def.color : "#4b5563",
                            background:  isOn ? def.color : "transparent",
                          }}
                        >
                          {isOn && (
                            <svg viewBox="0 0 10 10" className="w-2.5 h-2.5" fill="none">
                              <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </div>
                        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: def.color }} />
                        <span className="text-xs text-gray-300 truncate">{def.name}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Date pickers for active phases */}
                {phases.length > 0 && (
                  <div className="space-y-2 pt-1">
                    {phases.map((phase) => {
                      const def = ALL_PHASE_DEFS.find((d) => d.name === phase.name);
                      return (
                        <div key={phase.name} className="rounded-lg border border-[#2a2d32] bg-[#0d0e10] px-3 py-2">
                          <div className="flex items-center gap-2 mb-1.5">
                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: def?.color ?? "#6b7280" }} />
                            <span className="text-xs font-semibold text-gray-300">{phase.name}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <DatePicker
                              value={phase.start_date}
                              onChange={(val) => setPhases((prev) => prev.map((p) => p.name === phase.name ? { ...p, start_date: val } : p))}
                              disabled={isBusy}
                            />
                            <DatePicker
                              value={phase.end_date}
                              onChange={(val) => setPhases((prev) => prev.map((p) => p.name === phase.name ? { ...p, end_date: val } : p))}
                              disabled={isBusy}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Notes</label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} disabled={isBusy} />
              </div>
            </div>

            <DialogFooter className="flex-row items-center justify-between sm:justify-between">
              <div>
                {!showDeleteConfirm ? (
                  <Button variant="ghost" size="sm" onClick={() => setShowDeleteConfirm(true)}
                    disabled={isBusy} className="text-red-400 hover:text-red-300 hover:bg-red-950/50">
                    <Trash2 className="mr-1.5 h-4 w-4" />
                    Delete
                  </Button>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-red-400">Are you sure?</span>
                    <Button variant="destructive" size="sm" onClick={handleDelete} disabled={isBusy}>
                      {deleting ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
                      Confirm Delete
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setShowDeleteConfirm(false)} disabled={isBusy}>
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={onClose} disabled={isBusy}>Cancel</Button>
                <Button onClick={handleSave} disabled={isBusy}>
                  {saving ? <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" />Saving...</> : "Save Changes"}
                </Button>
              </div>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
