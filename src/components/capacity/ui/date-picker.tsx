"use client";

import { useState, useRef, useEffect } from "react";
import {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  addMonths,
  subMonths,
  isToday,
} from "date-fns";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";

// Week order: Sat(col 0), Sun(col 1), Mon(col 2), Tue(col 3), Wed(col 4), Thu(col 5), Fri(col 6)
const DAY_LABELS = ["Sa", "Su", "Mo", "Tu", "We", "Th", "Fr"];

function dayToCol(d: number): number {
  // getDay: 0=Sun,1=Mon,...,5=Fri,6=Sat
  // Sat→0, Sun→1, Mon→2, ..., Fri→6
  return (d + 1) % 7;
}

interface DatePickerProps {
  value: string;           // "yyyy-MM-dd" or ""
  onChange: (val: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function DatePicker({ value, onChange, disabled, placeholder = "Pick a date", className = "" }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState<Date>(() => {
    if (value) {
      try { return startOfMonth(parseISO(value)); } catch { /* */ }
    }
    return startOfMonth(new Date());
  });
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // When value changes externally, sync view month
  useEffect(() => {
    if (value) {
      try { setViewMonth(startOfMonth(parseISO(value))); } catch { /* */ }
    }
  }, [value]);

  const displayValue = value ? format(parseISO(value), "MMM d, yyyy") : "";

  const monthStart = startOfMonth(viewMonth);
  const monthEnd   = endOfMonth(viewMonth);
  const days       = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Leading empty cells based on first day's column
  const leadingBlanks = dayToCol(getDay(monthStart));

  const selectDay = (d: Date) => {
    onChange(format(d, "yyyy-MM-dd"));
    setOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        className="w-full flex items-center gap-2 rounded-md border border-[#2a2d32] bg-[#0d0e10] px-3 py-2 text-sm text-left transition-colors hover:border-[#3a3d42] focus:outline-none focus:border-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <CalendarDays className="w-3.5 h-3.5 text-gray-600 flex-shrink-0" />
        <span className={displayValue ? "text-gray-200" : "text-gray-600"}>
          {displayValue || placeholder}
        </span>
      </button>

      {/* Calendar popover */}
      {open && (
        <div
          className="absolute z-[200] mt-1.5 rounded-xl border border-[#2a2d32] bg-[#111214] shadow-2xl"
          style={{ minWidth: 272 }}
        >
          {/* Month navigation */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a1c20]">
            <button
              type="button"
              onClick={() => setViewMonth((m) => subMonths(m, 1))}
              className="p-1 rounded text-gray-500 hover:text-gray-200 hover:bg-[#1a1c20] transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-semibold text-gray-200">
              {format(viewMonth, "MMMM yyyy")}
            </span>
            <button
              type="button"
              onClick={() => setViewMonth((m) => addMonths(m, 1))}
              className="p-1 rounded text-gray-500 hover:text-gray-200 hover:bg-[#1a1c20] transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 px-3 pt-3 pb-1">
            {DAY_LABELS.map((d) => (
              <div key={d} className="flex items-center justify-center">
                <span className="text-[10px] font-semibold text-gray-600 uppercase">{d}</span>
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 gap-y-0.5 px-3 pb-3">
            {/* Leading blanks */}
            {Array.from({ length: leadingBlanks }).map((_, i) => (
              <div key={`blank-${i}`} />
            ))}

            {days.map((day) => {
              const ds       = format(day, "yyyy-MM-dd");
              const selected = ds === value;
              const today    = isToday(day);

              return (
                <button
                  key={ds}
                  type="button"
                  onClick={() => selectDay(day)}
                  className="flex items-center justify-center rounded-lg h-8 w-full text-sm font-medium transition-colors"
                  style={{
                    backgroundColor: selected ? "#ffffff" : today ? "#1a1c20" : "transparent",
                    color: selected ? "#000000" : today ? "#f87171" : "#d1d5db",
                    outline: today && !selected ? "1px solid rgba(239,68,68,0.3)" : undefined,
                  }}
                  onMouseEnter={(e) => {
                    if (!selected) (e.currentTarget as HTMLElement).style.backgroundColor = "#1e2024";
                  }}
                  onMouseLeave={(e) => {
                    if (!selected) (e.currentTarget as HTMLElement).style.backgroundColor = today ? "#1a1c20" : "transparent";
                  }}
                >
                  {format(day, "d")}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
