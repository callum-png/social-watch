"use client";

import { useState, useEffect, useMemo } from "react";
import {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isWeekend,
  addMonths,
  subMonths,
  isSameDay,
  isWithinInterval,
  getDay,
  isBefore,
  differenceInCalendarDays,
  addDays,
} from "date-fns";
import { Check, ChevronRight, ChevronLeft } from "lucide-react";
import { DatePicker } from "@/components/capacity/ui/date-picker";
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
import { cn } from "@/lib/capacity-utils";

interface AddProjectModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ProjectType {
  id: number;
  name: string;
  default_duration_days: number;
  color: string;
}

interface SuggestedSlot {
  start_date: string;
  end_date: string;
  utilization_percentage: number;
}

interface ProjectPhase {
  name: string;
  start_date: string;
  end_date: string;
}

const ALL_PHASE_DEFS = [
  { name: "Script",               color: "#eab308", defaultOn: false },
  { name: "Shoot Day",            color: "#06b6d4", defaultOn: false },
  { name: "Storyboard",           color: "#2569A8", defaultOn: true  },
  { name: "Motion Design",        color: "#E8630A", defaultOn: true  },
  { name: "Influencer Campaign",  color: "#a855f7", defaultOn: false },
  { name: "Social Assets",        color: "#22c55e", defaultOn: false },
  { name: "Product Explainer",    color: "#f43f5e", defaultOn: false },
] as const;

function buildDefaultPhases(startDate: string, endDate: string): ProjectPhase[] {
  const start = parseISO(startDate);
  const end   = parseISO(endDate);
  const dur   = Math.max(1, differenceInCalendarDays(end, start));
  const at = (pct: number) => format(addDays(start, Math.round(dur * pct)), "yyyy-MM-dd");
  return [
    { name: "Storyboard",    start_date: startDate, end_date: at(0.45) },
    { name: "Motion Design", start_date: at(0.40),  end_date: endDate  },
  ];
}

const STEPS = ["Project Type", "Dates", "Phases", "Details", "Confirm"] as const;

function CalendarPicker({
  startDate,
  endDate,
  onRangeChange,
}: {
  startDate: string;
  endDate: string;
  onRangeChange: (start: string, end: string) => void;
}) {
  const [viewMonth, setViewMonth] = useState(startOfMonth(new Date()));
  const [selecting, setSelecting] = useState<"start" | "end">("start");
  const [hoverDate, setHoverDate] = useState<Date | null>(null);

  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(viewMonth),
    end: endOfMonth(viewMonth),
  });

  const startPad = (getDay(startOfMonth(viewMonth)) + 6) % 7;
  const paddedDays: (Date | null)[] = [
    ...Array(startPad).fill(null),
    ...daysInMonth,
  ];

  const start = startDate ? parseISO(startDate) : null;
  const end = endDate ? parseISO(endDate) : null;

  const handleDayClick = (day: Date) => {
    const iso = format(day, "yyyy-MM-dd");
    if (selecting === "start") {
      onRangeChange(iso, "");
      setSelecting("end");
    } else {
      if (startDate && iso < startDate) {
        onRangeChange(iso, startDate);
      } else {
        onRangeChange(startDate, iso);
      }
      setSelecting("start");
    }
  };

  const isInRange = (day: Date) => {
    if (!start) return false;
    const compareEnd = end ?? (selecting === "end" && hoverDate ? hoverDate : null);
    if (!compareEnd) return false;
    const rangeStart = isBefore(start, compareEnd) ? start : compareEnd;
    const rangeEnd = isBefore(start, compareEnd) ? compareEnd : start;
    return isWithinInterval(day, { start: rangeStart, end: rangeEnd });
  };

  return (
    <div className="rounded-xl border border-[#2a2d32] bg-[#0c0d0f] p-4">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setViewMonth((m) => subMonths(m, 1))}
          className="p-1 rounded-md text-[#6b7280] hover:text-white hover:bg-[#1a1c20] transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-semibold text-white">
          {format(viewMonth, "MMMM yyyy")}
        </span>
        <button
          onClick={() => setViewMonth((m) => addMonths(m, 1))}
          className="p-1 rounded-md text-[#6b7280] hover:text-white hover:bg-[#1a1c20] transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 mb-1">
        {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => (
          <div key={d} className="text-center text-[10px] font-medium text-[#5c6370] py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-0.5">
        {paddedDays.map((day, i) => {
          if (!day) return <div key={`pad-${i}`} />;
          const weekend = isWeekend(day);
          const inRange = isInRange(day);
          const isS = start && isSameDay(day, start);
          const isE = end && isSameDay(day, end);
          const today = isSameDay(day, new Date());

          return (
            <button
              key={format(day, "yyyy-MM-dd")}
              onClick={() => handleDayClick(day)}
              onMouseEnter={() => selecting === "end" && setHoverDate(day)}
              onMouseLeave={() => setHoverDate(null)}
              className={cn(
                "relative h-8 w-full text-xs font-medium transition-colors",
                inRange && !isS && !isE && "bg-[#1d9bf0]/15 text-[#1d9bf0]",
                (isS || isE) && "bg-[#1d9bf0] text-white rounded-md",
                !isS && !isE && !inRange && weekend && "text-[#4a4d52]",
                !isS && !isE && !inRange && !weekend && "text-[#8b9199] hover:bg-[#1a1c20] hover:text-white rounded-md",
                today && !isS && !isE && "ring-1 ring-[#1d9bf0]/40 rounded-md",
              )}
            >
              {format(day, "d")}
            </button>
          );
        })}
      </div>

      <p className="mt-3 text-xs text-[#5c6370] text-center">
        {selecting === "start" ? "Click to set start date" : "Click to set end date"}
      </p>
    </div>
  );
}

export function AddProjectModal({ open, onClose, onSuccess }: AddProjectModalProps) {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const [projectTypes, setProjectTypes] = useState<ProjectType[]>([]);
  const [selectedType, setSelectedType] = useState<ProjectType | null>(null);
  const [typesLoading, setTypesLoading] = useState(false);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [suggestedSlots, setSuggestedSlots] = useState<SuggestedSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);

  const [phases, setPhases] = useState<ProjectPhase[]>([]);
  const [clientName, setClientName] = useState("");
  const [projectName, setProjectName] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open) {
      setStep(1);
      setSelectedType(null);
      setStartDate("");
      setEndDate("");
      setSuggestedSlots([]);
      setPhases([]);
      setClientName("");
      setProjectName("");
      setNotes("");
    }
  }, [open]);

  useEffect(() => {
    if (open && projectTypes.length === 0) {
      setTypesLoading(true);
      fetch("/api/capacity/project-types")
        .then((r) => r.ok ? r.json() : Promise.reject())
        .then((json) => { setProjectTypes(json.types ?? []); setTypesLoading(false); })
        .catch(() => { setProjectTypes([]); setTypesLoading(false); });
    }
  }, [open, projectTypes.length]);

  useEffect(() => {
    if (selectedType) {
      setSlotsLoading(true);
      fetch(`/api/capacity/schedule/suggest?project_type_id=${selectedType.id}`)
        .then((r) => r.ok ? r.json() : Promise.reject())
        .then((json) => { setSuggestedSlots(json.slots ?? []); setSlotsLoading(false); })
        .catch(() => { setSuggestedSlots([]); setSlotsLoading(false); });
    }
  }, [selectedType]);

  const canProceed = useMemo(() => {
    if (step === 1) return selectedType !== null;
    if (step === 2) return startDate !== "" && endDate !== "";
    if (step === 3) return true; // phases optional
    if (step === 4) return clientName.trim() !== "" && projectName.trim() !== "";
    return true;
  }, [step, selectedType, startDate, endDate, clientName, projectName]);

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/capacity/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_type_id: selectedType?.id,
          client_name: clientName,
          project_name: projectName,
          start_date: startDate,
          end_date: endDate,
          phases: phases.filter(p => p.start_date && p.end_date),
          assigned_members: [],
          notes,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      onSuccess();
      onClose();
    } catch {
      // keep open
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Project</DialogTitle>
          <DialogDescription>
            Step {step} of {STEPS.length}: {STEPS[step - 1]}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 py-2">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium transition-colors",
                step > i + 1 ? "bg-emerald-600 text-white"
                  : step === i + 1 ? "bg-[#1d9bf0] text-white"
                  : "bg-[#1a1c20] text-[#5c6370]"
              )}>
                {step > i + 1 ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div className={cn("h-px w-8", step > i + 1 ? "bg-emerald-600" : "bg-[#2a2d32]")} />
              )}
            </div>
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-3">
            {typesLoading ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-16 animate-pulse rounded-lg bg-[#1a1c20]" />
                ))}
              </div>
            ) : projectTypes.length === 0 ? (
              <p className="text-sm text-[#6b7280]">No project types configured yet.</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {projectTypes.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => { setSelectedType(type); setStep(2); }}
                    className={cn(
                      "rounded-xl border p-4 text-left transition-colors",
                      selectedType?.id === type.id
                        ? "border-[#1d9bf0] bg-[#1d9bf0]/10"
                        : "border-[#2a2d32] bg-[#111214] hover:border-[#3a3d42]"
                    )}
                  >
                    <p className="font-semibold text-white text-sm">{type.name}</p>
                    <p className="mt-0.5 text-xs text-[#6b7280]">
                      {type.default_duration_days} day default
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="flex-1 rounded-lg border border-[#2a2d32] bg-[#111214] px-3 py-2">
                <p className="text-[10px] text-[#5c6370] uppercase tracking-wider mb-0.5">Start</p>
                <p className="text-sm font-medium text-white">
                  {startDate ? format(parseISO(startDate), "MMM d, yyyy") : "—"}
                </p>
              </div>
              <div className="flex-1 rounded-lg border border-[#2a2d32] bg-[#111214] px-3 py-2">
                <p className="text-[10px] text-[#5c6370] uppercase tracking-wider mb-0.5">End</p>
                <p className="text-sm font-medium text-white">
                  {endDate ? format(parseISO(endDate), "MMM d, yyyy") : "—"}
                </p>
              </div>
            </div>

            <CalendarPicker
              startDate={startDate}
              endDate={endDate}
              onRangeChange={(s, e) => { setStartDate(s); setEndDate(e); }}
            />

            {(slotsLoading || suggestedSlots.length > 0) && (
              <div>
                <p className="text-xs font-medium text-[#5c6370] uppercase tracking-wider mb-2">
                  Suggested open slots
                </p>
                <div className="space-y-1.5">
                  {slotsLoading
                    ? Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="h-10 animate-pulse rounded-lg bg-[#1a1c20]" />
                      ))
                    : suggestedSlots.slice(0, 4).map((slot, i) => {
                        const util = slot.utilization_percentage ?? 0;
                        const isSelected = slot.start_date === startDate && slot.end_date === endDate;
                        return (
                          <button
                            key={i}
                            onClick={() => { setStartDate(slot.start_date); setEndDate(slot.end_date); }}
                            className={cn(
                              "w-full flex items-center justify-between rounded-lg border px-3 py-2 text-left transition-colors",
                              isSelected
                                ? "border-[#1d9bf0] bg-[#1d9bf0]/10"
                                : "border-[#2a2d32] bg-[#111214] hover:border-[#3a3d42]"
                            )}
                          >
                            <span className="text-sm text-white">
                              {format(parseISO(slot.start_date), "MMM d")} — {format(parseISO(slot.end_date), "MMM d, yyyy")}
                            </span>
                            <span className={cn(
                              "text-xs font-semibold",
                              util > 85 ? "text-red-400" : util >= 70 ? "text-yellow-400" : "text-emerald-400"
                            )}>
                              {util}% full
                            </span>
                          </button>
                        );
                      })
                  }
                </div>
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <p className="text-xs text-[#5c6370]">
              Select the phases for this campaign. Dates are auto-filled from your campaign range — adjust as needed.
            </p>

            {/* Phase toggle grid */}
            <div className="grid grid-cols-2 gap-2">
              {ALL_PHASE_DEFS.map((def) => {
                const isOn = phases.some((p) => p.name === def.name);
                return (
                  <button
                    key={def.name}
                    type="button"
                    onClick={() => {
                      if (isOn) {
                        setPhases((prev) => prev.filter((p) => p.name !== def.name));
                      } else {
                        setPhases((prev) => [...prev, { name: def.name, start_date: startDate, end_date: endDate }]);
                      }
                    }}
                    className="flex items-center gap-2 rounded-lg border px-3 py-2.5 text-left transition-colors"
                    style={{
                      borderColor: isOn ? def.color : "#2a2d32",
                      background:  isOn ? `${def.color}18` : "#111214",
                    }}
                  >
                    {/* Checkbox indicator */}
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
                <p className="text-[10px] font-semibold text-[#5c6370] uppercase tracking-wider">Adjust dates</p>
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
                        />
                        <DatePicker
                          value={phase.end_date}
                          onChange={(val) => setPhases((prev) => prev.map((p) => p.name === phase.name ? { ...p, end_date: val } : p))}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#8b9199]">
                Client Name <span className="text-red-400">*</span>
              </label>
              <Input
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="e.g. Acme Corp"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#8b9199]">
                Campaign Name <span className="text-red-400">*</span>
              </label>
              <Input
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="e.g. Spring Launch"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#8b9199]">Notes</label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional notes..."
                rows={3}
              />
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="rounded-xl border border-[#2a2d32] bg-[#111214] p-4 space-y-3">
            <h3 className="font-semibold text-white">Campaign Summary</h3>
            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <p className="text-[#5c6370] text-xs uppercase tracking-wider">Type</p>
                <p className="text-white font-medium mt-0.5">{selectedType?.name}</p>
              </div>
              <div>
                <p className="text-[#5c6370] text-xs uppercase tracking-wider">Client</p>
                <p className="text-white font-medium mt-0.5">{clientName}</p>
              </div>
              <div>
                <p className="text-[#5c6370] text-xs uppercase tracking-wider">Campaign</p>
                <p className="text-white font-medium mt-0.5">{projectName}</p>
              </div>
              <div>
                <p className="text-[#5c6370] text-xs uppercase tracking-wider">Dates</p>
                <p className="text-white font-medium mt-0.5">
                  {startDate && format(parseISO(startDate), "MMM d")} — {endDate && format(parseISO(endDate), "MMM d, yyyy")}
                </p>
              </div>
            </div>
            {phases.length > 0 && (
              <div className="border-t border-[#2a2d32] pt-3 space-y-1">
                <p className="text-[#5c6370] text-xs uppercase tracking-wider mb-2">Phases</p>
                {phases.map((p, i) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span className="text-gray-300">{p.name}</span>
                    <span className="text-[#5c6370]">
                      {p.start_date && format(parseISO(p.start_date), "MMM d")} — {p.end_date && format(parseISO(p.end_date), "MMM d")}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {notes && (
              <div className="text-sm border-t border-[#2a2d32] pt-3">
                <p className="text-[#5c6370] text-xs uppercase tracking-wider">Notes</p>
                <p className="text-[#8b9199] mt-0.5">{notes}</p>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <div>
            {step > 1 && (
              <Button variant="ghost" onClick={() => setStep((s) => s - 1)} disabled={submitting}>
                <ChevronLeft className="mr-1 h-4 w-4" />
                Back
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
            {step < 5 ? (
              <Button
                onClick={() => {
                  if (step === 2 && startDate && endDate) {
                    if (phases.length === 0) setPhases(buildDefaultPhases(startDate, endDate));
                  }
                  setStep((s) => s + 1);
                }}
                disabled={!canProceed}
              >
                Next <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? "Scheduling..." : "Confirm & Schedule"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
