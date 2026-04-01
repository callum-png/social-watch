export interface TeamMember {
  id: number;
  name: string;
  role: string;
  weekly_capacity_hours: number;
  is_active: boolean;
}

export interface ProjectType {
  id: number;
  name: string;
  default_duration_days: number;
  required_roles: string[];
  color: string;
  preferred_start_days: string[];
}

export interface ProjectPhase {
  name: string;
  start_date: string;
  end_date: string;
}

export interface ScheduledProject {
  id: number;
  project_type_id: number;
  client_name: string;
  project_name: string;
  start_date: string;
  end_date: string;
  kickoff_date: string | null;
  filming_date: string | null;
  phases: ProjectPhase[];
  assigned_members: number[];
  status: 'scheduled' | 'in_progress' | 'completed' | 'on_hold';
  notes: string;
  client_image_url: string;
  created_at: string;
  created_by: string;
  project_type?: ProjectType;
}

export interface DailySnapshot {
  id: number;
  date: string;
  team_sentiment_score: number;
  total_overtime_hours: number;
  notes: string;
}

export interface Holiday {
  id: number;
  date: string;
  name: string;
}

export interface SuggestedSlot {
  start_date: string;
  end_date: string;
  utilization_percentage: number;
  available_team_members: { id: number; name: string; role: string }[];
  risk_level: 'green' | 'yellow' | 'red';
}

export interface DailyCapacity {
  date: string;
  utilization_percentage: number;
  active_projects: string[];
  available_hours: number;
  used_hours: number;
  /** Launch videos in animation on this day */
  launch_videos_animating: number;
  launch_video_names: string[];
  /** Long-form videos in animation on this day */
  long_form_animating: number;
  long_form_names: string[];
  /** All projects in animation (any type) */
  concurrent_animations: number;
  in_animation: string[];
}
