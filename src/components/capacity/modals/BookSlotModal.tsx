"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/capacity/ui/dialog";
import { Button } from "@/components/capacity/ui/button";
import { Input } from "@/components/capacity/ui/input";
import { Textarea } from "@/components/capacity/ui/textarea";
import { Badge } from "@/components/capacity/ui/badge";
import { cn } from "@/lib/capacity-utils";

interface SlotData {
  start_date: string;
  end_date: string;
  utilization_percentage: number;
  available_team_members: { id: number; name: string; role: string }[];
  risk_level: "green" | "yellow" | "red";
}

interface ProjectType {
  id: number;
  name: string;
  default_duration_days: number;
}

interface BookSlotModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  slot: SlotData | null;
  projectTypeId: number | null;
  projectTypes?: ProjectType[];
}

export function BookSlotModal({
  open,
  onClose,
  onSuccess,
  slot,
  projectTypeId: initialTypeId,
  projectTypes = [],
}: BookSlotModalProps) {
  const [selectedTypeId, setSelectedTypeId] = useState<number | null>(
    initialTypeId
  );
  const [clientName, setClientName] = useState("");
  const [projectName, setProjectName] = useState("");
  const [notes, setNotes] = useState("");
  const [createdBy, setCreatedBy] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setClientName("");
    setProjectName("");
    setNotes("");
    setCreatedBy("");
    setError(null);
    setSelectedTypeId(initialTypeId);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    if (!slot || !selectedTypeId || submitting) return;
    if (!clientName.trim() || !projectName.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/capacity/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_type_id: selectedTypeId,
          client_name: clientName.trim(),
          project_name: projectName.trim(),
          start_date: slot.start_date,
          assigned_members: [],
          notes,
          created_by: createdBy.trim() || "sales",
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to book slot");
      }

      resetForm();
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to book slot");
    } finally {
      setSubmitting(false);
    }
  };

  if (!slot) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Hold This Slot</DialogTitle>
          <DialogDescription>
            Book production capacity for{" "}
            {format(parseISO(slot.start_date), "MMM d")} &mdash;{" "}
            {format(parseISO(slot.end_date), "MMM d, yyyy")}
          </DialogDescription>
        </DialogHeader>

        {/* Slot summary */}
        <div className="flex items-center gap-3 rounded-lg border border-gray-800 bg-gray-950 p-3">
          <Badge variant={slot.risk_level} className="text-[10px]">
            {slot.utilization_percentage}% utilized
          </Badge>
        </div>

        {error && (
          <div className="rounded-md border border-red-800 bg-red-950/50 px-3 py-2 text-sm text-red-400">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {/* Project type selection */}
          {projectTypes.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">
                Project Type <span className="text-red-400">*</span>
              </label>
              <div className="grid gap-2 sm:grid-cols-2">
                {projectTypes.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setSelectedTypeId(type.id)}
                    className={cn(
                      "rounded-lg border p-3 text-left transition-colors",
                      selectedTypeId === type.id
                        ? "border-blue-500 bg-blue-600/10"
                        : "border-gray-800 bg-gray-950 hover:border-gray-700"
                    )}
                  >
                    <p className="text-sm font-medium text-gray-200">
                      {type.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {type.default_duration_days} days
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">
              Client Name <span className="text-red-400">*</span>
            </label>
            <Input
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Acme Corp"
              disabled={submitting}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">
              Project Name <span className="text-red-400">*</span>
            </label>
            <Input
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Website Launch Video"
              disabled={submitting}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Notes</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Deal details, special requirements..."
              rows={2}
              disabled={submitting}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">
              Your Name
            </label>
            <Input
              value={createdBy}
              onChange={(e) => setCreatedBy(e.target.value)}
              placeholder="Your name"
              disabled={submitting}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              submitting ||
              !clientName.trim() ||
              !projectName.trim() ||
              !selectedTypeId
            }
          >
            {submitting ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                Booking...
              </>
            ) : (
              "Hold Slot"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
