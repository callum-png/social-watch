"use client";

import { useState, useEffect, useCallback } from "react";
import { format, parseISO } from "date-fns";
import {
  CalendarCheck,
  Loader2,
  AlertTriangle,
  Check,
  Circle,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/capacity/ui/card";
import { Badge } from "@/components/capacity/ui/badge";
import { Button } from "@/components/capacity/ui/button";
import { cn } from "@/lib/capacity-utils";
import { BookSlotModal } from "@/components/capacity/modals/BookSlotModal";

interface OverlappingProject {
  project_name: string;
  client_name: string;
  animation_start: string;
  animation_end: string;
  deadline: string;
}

interface AvailableSlot {
  start_date: string;
  end_date: string;
  day_label: string;
  peak_concurrent: number;
  overlapping: OverlappingProject[];
  status: "open" | "tight" | "full";
}

interface ActiveProject {
  id: number;
  project_name: string;
  client_name: string;
  project_type: string;
  animation_start: string;
  animation_end: string;
  deadline: string;
  phase: string;
  status: string;
}

interface SlotRules {
  max_concurrent: number;
  duration_business_days: number;
  preferred_start_days: string[];
}

interface ProjectType {
  id: number;
  name: string;
  default_duration_days: number;
}

interface SlotTrackerProps {
  onRefresh: () => void;
}

const PHASE_CONFIG: Record<
  string,
  { label: string; color: string; dotColor: string }
> = {
  in_animation: {
    label: "In Animation",
    color: "text-blue-400",
    dotColor: "bg-blue-400",
  },
  post_animation: {
    label: "Post-Animation",
    color: "text-gray-400",
    dotColor: "bg-gray-500",
  },
  queued: {
    label: "Queued",
    color: "text-yellow-400",
    dotColor: "bg-yellow-400",
  },
  unknown: { label: "—", color: "text-gray-600", dotColor: "bg-gray-600" },
};

export function SlotTracker({ onRefresh }: SlotTrackerProps) {
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [activeProjects, setActiveProjects] = useState<ActiveProject[]>([]);
  const [rules, setRules] = useState<SlotRules | null>(null);
  const [loading, setLoading] = useState(true);
  const [projectTypes, setProjectTypes] = useState<ProjectType[]>([]);
  const [bookingSlot, setBookingSlot] = useState<AvailableSlot | null>(null);
  const [selectedTypeId, setSelectedTypeId] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(false);

  const fetchSlots = useCallback(() => {
    setLoading(true);
    fetch("/api/capacity/slots")
      .then((r) =>
        r.ok
          ? r.json()
          : { slots: [], active_projects: [], rules: null }
      )
      .then((json) => {
        setSlots(json.slots ?? []);
        setActiveProjects(json.active_projects ?? []);
        setRules(json.rules ?? null);
        setLoading(false);
      })
      .catch(() => {
        setSlots([]);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  useEffect(() => {
    fetch("/api/capacity/project-types")
      .then((r) => (r.ok ? r.json() : { types: [] }))
      .then((json) => {
        const types = json.types ?? json ?? [];
        setProjectTypes(types);
        const lvType = types.find(
          (t: ProjectType) => t.name === "Launch Video"
        );
        if (lvType) setSelectedTypeId(lvType.id);
        else if (types.length > 0) setSelectedTypeId(types[0].id);
      })
      .catch(() => setProjectTypes([]));
  }, []);

  const inAnimation = activeProjects.filter(
    (p) => p.phase === "in_animation"
  );
  const inAnimationLV = inAnimation.filter(
    (p) => p.project_type === "Launch Video"
  );
  const inAnimationLF = inAnimation.filter(
    (p) => p.project_type === "Long-Form Video"
  );
  const inAnimationOther = inAnimation.filter(
    (p) => p.project_type !== "Launch Video" && p.project_type !== "Long-Form Video"
  );
  const queued = activeProjects.filter((p) => p.phase === "queued");
  const postAnim = activeProjects.filter(
    (p) => p.phase === "post_animation"
  );

  const displayedSlots = showAll ? slots : slots.slice(0, 10);

  const bookingSlotData = bookingSlot
    ? {
        start_date: bookingSlot.start_date,
        end_date: bookingSlot.end_date,
        utilization_percentage: Math.round(
          (bookingSlot.peak_concurrent / (rules?.max_concurrent ?? 2)) * 100
        ),
        available_team_members: [] as {
          id: number;
          name: string;
          role: string;
        }[],
        risk_level: (bookingSlot.status === "full"
          ? "red"
          : bookingSlot.status === "tight"
          ? "yellow"
          : "green") as "green" | "yellow" | "red",
      }
    : null;

  return (
    <>
      <div className="space-y-6">
        {/* Pipeline summary */}
        <div className="grid gap-4 sm:grid-cols-3">
          {/* In Animation */}
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
                <p className="text-xs font-semibold uppercase tracking-wider text-blue-400">
                  In Animation
                </p>
              </div>
              <div className="flex items-center gap-3 mb-3 text-[11px]">
                <span className={cn(
                  "font-semibold",
                  inAnimationLV.length > (rules?.max_concurrent ?? 2) ? "text-red-400" :
                  inAnimationLV.length === (rules?.max_concurrent ?? 2) ? "text-yellow-400" :
                  "text-blue-400"
                )}>
                  {inAnimationLV.length}/{rules?.max_concurrent ?? 2} LV
                </span>
                {inAnimationLF.length > 0 && (
                  <span className="text-purple-400">
                    +{inAnimationLF.length} LF
                  </span>
                )}
                {inAnimationOther.length > 0 && (
                  <span className="text-gray-500">
                    +{inAnimationOther.length} other
                  </span>
                )}
              </div>
              {inAnimation.length === 0 ? (
                <p className="text-xs text-gray-600">No active animations</p>
              ) : (
                <div className="space-y-2">
                  {inAnimation.map((p) => (
                    <div
                      key={p.id}
                      className={cn(
                        "rounded-lg border px-3 py-2",
                        p.project_type === "Long-Form Video"
                          ? "border-purple-900/40 bg-purple-950/20"
                          : "border-blue-900/40 bg-blue-950/20"
                      )}
                    >
                      <p className="text-sm font-medium text-gray-200 truncate">
                        {p.client_name}
                        {p.project_type === "Long-Form Video" && (
                          <span className="ml-1.5 text-[10px] text-purple-400 font-normal">LF</span>
                        )}
                      </p>
                      <p className="text-[11px] text-gray-500 truncate">
                        {p.project_name}
                      </p>
                      <p className={cn(
                        "text-[11px] mt-0.5",
                        p.project_type === "Long-Form Video" ? "text-purple-400/70" : "text-blue-400/70"
                      )}>
                        Anim ends{" "}
                        {format(parseISO(p.animation_end), "MMM d")}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Queued */}
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-2 w-2 rounded-full bg-yellow-400" />
                <p className="text-xs font-semibold uppercase tracking-wider text-yellow-400">
                  In Queue ({queued.length})
                </p>
              </div>
              {queued.length === 0 ? (
                <p className="text-xs text-gray-600">Queue empty</p>
              ) : (
                <div className="space-y-2">
                  {queued.map((p) => (
                    <div
                      key={p.id}
                      className="rounded-lg border border-yellow-900/30 bg-yellow-950/10 px-3 py-2"
                    >
                      <p className="text-sm font-medium text-gray-200 truncate">
                        {p.client_name}
                      </p>
                      <p className="text-[11px] text-gray-500 truncate">
                        {p.project_name}
                      </p>
                      <p className="text-[11px] text-yellow-400/70 mt-0.5">
                        Starts{" "}
                        {format(parseISO(p.animation_start), "MMM d")}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Post-Animation */}
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-2 w-2 rounded-full bg-gray-500" />
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Post-Animation ({postAnim.length})
                </p>
              </div>
              {postAnim.length === 0 ? (
                <p className="text-xs text-gray-600">None in delivery</p>
              ) : (
                <div className="space-y-2">
                  {postAnim.map((p) => (
                    <div
                      key={p.id}
                      className="rounded-lg border border-gray-800 bg-gray-950 px-3 py-2"
                    >
                      <p className="text-sm font-medium text-gray-300 truncate">
                        {p.client_name}
                      </p>
                      <p className="text-[11px] text-gray-500 truncate">
                        {p.project_name}
                      </p>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        Due{" "}
                        {format(parseISO(p.deadline), "MMM d")}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Available slots */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarCheck className="h-4 w-4 text-gray-500" />
              Next Available Animation Slots
            </CardTitle>
            {rules && (
              <p className="text-xs text-gray-500 mt-1">
                {rules.duration_business_days} biz days per video &middot; max{" "}
                {rules.max_concurrent} concurrent &middot; animation starts{" "}
                {rules.preferred_start_days.join("/")} only
              </p>
            )}
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
                <span className="ml-2 text-sm text-gray-500">
                  Computing slots...
                </span>
              </div>
            ) : (
              <div className="space-y-2">
                {displayedSlots.map((slot) => {
                  const isFull = slot.status === "full";
                  const isTight = slot.status === "tight";

                  return (
                    <div
                      key={slot.start_date}
                      className={cn(
                        "flex items-center gap-4 rounded-xl border p-3.5 transition-colors",
                        isFull
                          ? "border-red-900/40 bg-red-950/10 opacity-50"
                          : isTight
                          ? "border-yellow-900/40 bg-yellow-950/10 hover:border-yellow-800/50"
                          : "border-gray-800 bg-gray-950 hover:border-gray-700"
                      )}
                    >
                      <div
                        className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                          isFull
                            ? "bg-red-950 text-red-400"
                            : isTight
                            ? "bg-yellow-950 text-yellow-400"
                            : "bg-emerald-950 text-emerald-400"
                        )}
                      >
                        {isFull ? (
                          <AlertTriangle className="h-3.5 w-3.5" />
                        ) : isTight ? (
                          <Circle className="h-3.5 w-3.5" />
                        ) : (
                          <Check className="h-3.5 w-3.5" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-sm font-medium text-gray-200">
                            {slot.day_label},{" "}
                            {format(parseISO(slot.start_date), "MMM d")}
                          </p>
                          <span className="text-xs text-gray-600">
                            → {format(parseISO(slot.end_date), "MMM d")}
                          </span>
                          <Badge
                            variant={
                              isFull ? "red" : isTight ? "yellow" : "green"
                            }
                            className="text-[10px] shrink-0"
                          >
                            {isFull
                              ? "Full"
                              : isTight
                              ? "1 of 2 slots used"
                              : "Open"}
                          </Badge>
                        </div>
                        {slot.overlapping.length > 0 && (
                          <p className="text-[11px] text-gray-500 truncate">
                            Overlaps:{" "}
                            {slot.overlapping
                              .map((o) => o.client_name)
                              .join(", ")}
                          </p>
                        )}
                      </div>

                      {!isFull && (
                        <Button
                          size="sm"
                          variant={isTight ? "outline" : "default"}
                          onClick={() => setBookingSlot(slot)}
                          className="shrink-0"
                        >
                          Hold Slot
                        </Button>
                      )}
                    </div>
                  );
                })}

                {slots.length > 10 && !showAll && (
                  <button
                    onClick={() => setShowAll(true)}
                    className="w-full py-2 text-center text-xs text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    Show {slots.length - 10} more
                  </button>
                )}

                {slots.length === 0 && !loading && (
                  <p className="py-8 text-center text-sm text-gray-500">
                    No slots computed — check back shortly
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {bookingSlot && (
        <BookSlotModal
          open={bookingSlot !== null}
          onClose={() => setBookingSlot(null)}
          onSuccess={() => {
            setBookingSlot(null);
            fetchSlots();
            onRefresh();
          }}
          slot={bookingSlotData}
          projectTypeId={selectedTypeId}
          projectTypes={projectTypes}
        />
      )}
    </>
  );
}
