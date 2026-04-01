import {
  parseISO,
  format,
  addDays,
  isWeekend,
  isBefore,
  isAfter,
  isSameDay,
} from 'date-fns';
import type { DailyCapacity, ScheduledProject } from '@/types/capacity';
import {
  getHolidays,
  getScheduledProjects,
  getProjectTypes,
} from './capacity-db';

// -- Capacity rules ──────────────────────────────────────────────────

export const CAPACITY_RULES = {
  /** Max concurrent launch videos in animation */
  maxConcurrentLaunchVideos: 2,
  /** Max long-form videos per week */
  maxLongFormPerWeek: 1,
  /** Preferred animation start days */
  preferredStartDays: new Set(['Tuesday', 'Wednesday', 'Thursday']),
};

// -- Helper functions ─────────────────────────────────────────────────

export function isHoliday(date: string, holidaySet: Set<string>): boolean {
  return holidaySet.has(date);
}

export function isBusinessDay(date: string, holidaySet: Set<string>): boolean {
  const d = parseISO(date);
  return !isWeekend(d) && !isHoliday(date, holidaySet);
}

/**
 * Starting from `date` (exclusive), add `count` business days and return the
 * resulting ISO date string.
 */
export function addBusinessDays(date: string, count: number, holidaySet: Set<string>): string {
  let current = parseISO(date);
  let remaining = count;

  while (remaining > 0) {
    current = addDays(current, 1);
    const iso = format(current, 'yyyy-MM-dd');
    if (isBusinessDay(iso, holidaySet)) {
      remaining--;
    }
  }

  return format(current, 'yyyy-MM-dd');
}

/**
 * Count business days between `start` and `end` (inclusive on both ends).
 */
export function getBusinessDaysBetween(start: string, end: string, holidaySet: Set<string>): number {
  let current = parseISO(start);
  const endDate = parseISO(end);
  let count = 0;

  while (isBefore(current, endDate) || isSameDay(current, endDate)) {
    const iso = format(current, 'yyyy-MM-dd');
    if (isBusinessDay(iso, holidaySet)) {
      count++;
    }
    current = addDays(current, 1);
  }

  return count;
}

/**
 * Compute the animation end date for a project.
 * Animation window = start_date + (duration - 1) business days (inclusive).
 * The start_date itself counts as day 1.
 */
export function getAnimationEndDate(
  project: ScheduledProject,
  holidaySet: Set<string>,
): string {
  const duration = project.project_type?.default_duration_days ?? 9;
  return addBusinessDays(project.start_date, duration - 1, holidaySet);
}

// -- Core: capacity for a date range ──────────────────────────────────

export async function getCapacityForDateRange(
  startDate: string,
  endDate: string,
): Promise<DailyCapacity[]> {
  const [projects, holidays] = await Promise.all([
    getScheduledProjects(),
    getHolidays(),
  ]);

  const holidaySet = new Set(holidays.map((h) => h.date));

  // Pre-compute animation end dates for all active projects
  const projectWindows = projects
    .filter((p) => p.status !== 'completed' && p.status !== 'on_hold')
    .map((p) => ({
      ...p,
      animation_end: getAnimationEndDate(p, holidaySet),
      type_name: p.project_type?.name ?? 'Unknown',
    }));

  const result: DailyCapacity[] = [];
  let current = parseISO(startDate);
  const end = parseISO(endDate);

  while (isBefore(current, end) || isSameDay(current, end)) {
    const iso = format(current, 'yyyy-MM-dd');

    if (isBusinessDay(iso, holidaySet)) {
      const inAnimation: string[] = [];
      const allActive: string[] = [];
      const launchVideoNames: string[] = [];
      const longFormNames: string[] = [];

      for (const pw of projectWindows) {
        const dayDate = parseISO(iso);
        const projectStart = parseISO(pw.start_date);
        const projectEnd = parseISO(pw.end_date);

        // Is this day within the full project window (start → deadline)?
        const isActive =
          (isAfter(dayDate, projectStart) || isSameDay(dayDate, projectStart)) &&
          (isBefore(dayDate, projectEnd) || isSameDay(dayDate, projectEnd));

        if (isActive) {
          const label = `${pw.client_name} - ${pw.project_name}`;
          allActive.push(label);

          // Is this day within the animation window specifically?
          const animating = iso >= pw.start_date && iso <= pw.animation_end;
          if (animating) {
            inAnimation.push(label);

            // Track by type
            if (pw.type_name === 'Launch Video') {
              launchVideoNames.push(label);
            } else if (pw.type_name === 'Long-Form Video') {
              longFormNames.push(label);
            }
          }
        }
      }

      // Utilization based on launch video cap (the primary constraint)
      const lvCount = launchVideoNames.length;
      const utilization = Math.min(
        100,
        Math.round((lvCount / CAPACITY_RULES.maxConcurrentLaunchVideos) * 100),
      );

      result.push({
        date: iso,
        utilization_percentage: utilization,
        active_projects: allActive,
        available_hours: 0,
        used_hours: 0,
        launch_videos_animating: lvCount,
        launch_video_names: launchVideoNames,
        long_form_animating: longFormNames.length,
        long_form_names: longFormNames,
        concurrent_animations: inAnimation.length,
        in_animation: inAnimation,
      });
    }

    current = addDays(current, 1);
  }

  return result;
}

// -- Suggest launch dates ─────────────────────────────────────────────

const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export async function suggestLaunchDates(projectTypeId: number) {
  const [projectTypes, holidays] = await Promise.all([
    getProjectTypes(),
    getHolidays(),
  ]);

  const holidaySet = new Set(holidays.map((h) => h.date));
  const projectType = projectTypes.find((pt) => pt.id === projectTypeId);
  if (!projectType) return [];

  const preferredDays = CAPACITY_RULES.preferredStartDays;
  const durationDays = projectType.default_duration_days;

  const today = format(new Date(), 'yyyy-MM-dd');
  const searchStart = addBusinessDays(today, 2, holidaySet);

  const slots = [];
  let candidate = parseISO(searchStart);
  let safetyLimit = 200;

  while (slots.length < 6 && safetyLimit > 0) {
    safetyLimit--;
    const iso = format(candidate, 'yyyy-MM-dd');
    const dayName = DAY_NAMES[candidate.getDay()];

    if (isBusinessDay(iso, holidaySet) && preferredDays.has(dayName)) {
      const endDate = addBusinessDays(iso, durationDays - 1, holidaySet);
      const capacity = await getCapacityForDateRange(iso, endDate);

      // Check against the appropriate cap for this project type
      let peakConcurrent: number;
      if (projectType.name === 'Launch Video') {
        peakConcurrent = capacity.length > 0
          ? Math.max(...capacity.map((c) => c.launch_videos_animating))
          : 0;
      } else if (projectType.name === 'Long-Form Video') {
        peakConcurrent = capacity.length > 0
          ? Math.max(...capacity.map((c) => c.long_form_animating))
          : 0;
      } else {
        peakConcurrent = 0; // Other types don't have hard caps yet
      }

      const maxForType = projectType.name === 'Launch Video'
        ? CAPACITY_RULES.maxConcurrentLaunchVideos
        : projectType.name === 'Long-Form Video'
        ? CAPACITY_RULES.maxLongFormPerWeek
        : 99;

      if (peakConcurrent < maxForType) {
        let riskLevel: 'green' | 'yellow' | 'red';
        if (peakConcurrent === 0) riskLevel = 'green';
        else if (peakConcurrent >= maxForType - 1) riskLevel = 'yellow';
        else riskLevel = 'green';

        slots.push({
          start_date: iso,
          end_date: endDate,
          concurrent_animations: peakConcurrent,
          risk_level: riskLevel,
        });
      }
    }

    candidate = addDays(candidate, 1);
  }

  return slots;
}
