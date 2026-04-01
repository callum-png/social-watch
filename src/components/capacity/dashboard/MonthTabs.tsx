"use client";

import { useState, useMemo } from "react";
import { format, addMonths } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/capacity-utils";

interface MonthTabsProps {
  selectedMonth: string;
  onMonthChange: (month: string) => void;
}

export function MonthTabs({ selectedMonth, onMonthChange }: MonthTabsProps) {
  const [windowStart, setWindowStart] = useState(0);

  const months = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 12 }, (_, i) => {
      const d = addMonths(now, i);
      return {
        value: format(d, "yyyy-MM"),
        label: format(d, "MMM yyyy"),
      };
    });
  }, []);

  const visibleMonths = months.slice(windowStart, windowStart + 4);

  const canGoBack = windowStart > 0;
  const canGoForward = windowStart + 4 < months.length;

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => setWindowStart((prev) => Math.max(0, prev - 1))}
        disabled={!canGoBack}
        className="flex h-9 w-9 items-center justify-center rounded-md text-gray-400 hover:bg-gray-800 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-400 transition-colors"
        aria-label="Previous months"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      <div className="flex gap-1">
        {visibleMonths.map((month) => (
          <button
            key={month.value}
            onClick={() => onMonthChange(month.value)}
            className={cn(
              "rounded-md px-4 py-2 text-sm font-medium transition-colors",
              selectedMonth === month.value
                ? "bg-blue-600 text-white"
                : "text-gray-400 hover:bg-gray-800 hover:text-gray-100"
            )}
          >
            {month.label}
          </button>
        ))}
      </div>

      <button
        onClick={() =>
          setWindowStart((prev) => Math.min(months.length - 4, prev + 1))
        }
        disabled={!canGoForward}
        className="flex h-9 w-9 items-center justify-center rounded-md text-gray-400 hover:bg-gray-800 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-400 transition-colors"
        aria-label="Next months"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
