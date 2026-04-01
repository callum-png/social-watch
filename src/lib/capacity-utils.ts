import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  format,
  differenceInCalendarDays,
  parseISO,
  startOfMonth,
  endOfMonth,
} from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "MMM d, yyyy");
}

export function formatDateRange(start: string | Date, end: string | Date): string {
  const s = typeof start === "string" ? parseISO(start) : start;
  const e = typeof end === "string" ? parseISO(end) : end;
  return `${format(s, "MMM d")} – ${format(e, "MMM d, yyyy")}`;
}

export function daysRemaining(endDate: string | Date): number {
  const d = typeof endDate === "string" ? parseISO(endDate) : endDate;
  return differenceInCalendarDays(d, new Date());
}

export function getMonthRange(yearMonth: string): { start: string; end: string } {
  const [year, month] = yearMonth.split("-").map(Number);
  const date = new Date(year, month - 1, 1);
  return {
    start: format(startOfMonth(date), "yyyy-MM-dd"),
    end: format(endOfMonth(date), "yyyy-MM-dd"),
  };
}
