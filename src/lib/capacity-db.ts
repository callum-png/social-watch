import { neon } from '@neondatabase/serverless';
import type {
  TeamMember,
  ProjectType,
  ProjectPhase,
  ScheduledProject,
  Holiday,
  DailySnapshot,
} from '@/types/capacity';

function getSql() {
  const url = process.env.CAPACITY_DATABASE_URL;
  if (!url) throw new Error('CAPACITY_DATABASE_URL is not set');
  return neon(url);
}

// -- Initialize tables ────────────────────────────────────────────────

export async function initializeDatabase(): Promise<void> {
  const sql = getSql();

  await sql`
    CREATE TABLE IF NOT EXISTS team_members (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      weekly_capacity_hours REAL NOT NULL DEFAULT 40,
      is_active BOOLEAN NOT NULL DEFAULT true
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS project_types (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      default_duration_days INTEGER NOT NULL,
      required_roles JSONB NOT NULL DEFAULT '[]',
      color TEXT NOT NULL DEFAULT '#6B7280',
      preferred_start_days JSONB NOT NULL DEFAULT '[]'
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS scheduled_projects (
      id SERIAL PRIMARY KEY,
      project_type_id INTEGER NOT NULL REFERENCES project_types(id),
      client_name TEXT NOT NULL,
      project_name TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      kickoff_date TEXT,
      filming_date TEXT,
      assigned_members JSONB NOT NULL DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'scheduled' CHECK(status IN ('scheduled', 'in_progress', 'completed', 'on_hold')),
      notes TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMP NOT NULL DEFAULT now(),
      created_by TEXT NOT NULL DEFAULT ''
    )
  `;

  // Migrations for existing tables
  await sql`ALTER TABLE scheduled_projects ADD COLUMN IF NOT EXISTS kickoff_date TEXT`;
  await sql`ALTER TABLE scheduled_projects ADD COLUMN IF NOT EXISTS filming_date TEXT`;
  await sql`ALTER TABLE scheduled_projects ALTER COLUMN created_by SET DEFAULT ''`;
  await sql`ALTER TABLE scheduled_projects ADD COLUMN IF NOT EXISTS phases JSONB NOT NULL DEFAULT '[]'`;
  await sql`ALTER TABLE scheduled_projects ADD COLUMN IF NOT EXISTS client_image_url TEXT NOT NULL DEFAULT ''`;

  await sql`
    CREATE TABLE IF NOT EXISTS capacity_settings (
      role_key TEXT PRIMARY KEY,
      max_slots INTEGER NOT NULL DEFAULT 2
    )
  `;
  // Seed defaults if missing
  await sql`INSERT INTO capacity_settings (role_key, max_slots) VALUES ('design', 2) ON CONFLICT (role_key) DO NOTHING`;
  await sql`INSERT INTO capacity_settings (role_key, max_slots) VALUES ('video',  3) ON CONFLICT (role_key) DO NOTHING`;
  await sql`INSERT INTO capacity_settings (role_key, max_slots) VALUES ('writer', 2) ON CONFLICT (role_key) DO NOTHING`;
  await sql`INSERT INTO capacity_settings (role_key, max_slots) VALUES ('social', 2) ON CONFLICT (role_key) DO NOTHING`;

  await sql`
    CREATE TABLE IF NOT EXISTS daily_snapshots (
      id SERIAL PRIMARY KEY,
      date TEXT NOT NULL UNIQUE,
      team_sentiment_score REAL NOT NULL DEFAULT 3.5,
      total_overtime_hours REAL NOT NULL DEFAULT 0,
      notes TEXT NOT NULL DEFAULT ''
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS holidays (
      id SERIAL PRIMARY KEY,
      date TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL
    )
  `;
}

// -- Parsers ──────────────────────────────────────────────────────────

function parseTeamMember(row: Record<string, unknown>): TeamMember {
  return {
    id: row.id as number,
    name: row.name as string,
    role: row.role as string,
    weekly_capacity_hours: row.weekly_capacity_hours as number,
    is_active: Boolean(row.is_active),
  };
}

function parseProjectType(row: Record<string, unknown>): ProjectType {
  return {
    id: row.id as number,
    name: row.name as string,
    default_duration_days: row.default_duration_days as number,
    required_roles: typeof row.required_roles === 'string'
      ? JSON.parse(row.required_roles)
      : (row.required_roles as string[]),
    color: row.color as string,
    preferred_start_days: typeof row.preferred_start_days === 'string'
      ? JSON.parse(row.preferred_start_days)
      : (row.preferred_start_days as string[]),
  };
}

function parseScheduledProject(row: Record<string, unknown>): ScheduledProject {
  const project: ScheduledProject = {
    id: row.id as number,
    project_type_id: row.project_type_id as number,
    client_name: row.client_name as string,
    project_name: row.project_name as string,
    start_date: row.start_date as string,
    end_date: row.end_date as string,
    kickoff_date: (row.kickoff_date as string) ?? null,
    filming_date: (row.filming_date as string) ?? null,
    phases: typeof row.phases === 'string'
      ? JSON.parse(row.phases)
      : ((row.phases as ProjectPhase[]) ?? []),
    client_image_url: (row.client_image_url as string) ?? '',
    assigned_members: typeof row.assigned_members === 'string'
      ? JSON.parse(row.assigned_members)
      : (row.assigned_members as number[]),
    status: row.status as ScheduledProject['status'],
    notes: row.notes as string,
    created_at: String(row.created_at),
    created_by: (row.created_by as string) ?? '',
  };

  if (row.pt_id != null) {
    project.project_type = {
      id: row.pt_id as number,
      name: row.pt_name as string,
      default_duration_days: row.pt_default_duration_days as number,
      required_roles: typeof row.pt_required_roles === 'string'
        ? JSON.parse(row.pt_required_roles as string)
        : (row.pt_required_roles as string[]),
      color: row.pt_color as string,
      preferred_start_days: typeof row.pt_preferred_start_days === 'string'
        ? JSON.parse(row.pt_preferred_start_days as string)
        : (row.pt_preferred_start_days as string[]),
    };
  }

  return project;
}

// -- Query functions ──────────────────────────────────────────────────

export async function getTeamMembers(activeOnly = true): Promise<TeamMember[]> {
  const sql = getSql();
  const rows = activeOnly
    ? await sql`SELECT * FROM team_members WHERE is_active = true ORDER BY name`
    : await sql`SELECT * FROM team_members ORDER BY name`;
  return rows.map(parseTeamMember);
}

export async function getProjectTypes(): Promise<ProjectType[]> {
  const sql = getSql();
  const rows = await sql`SELECT * FROM project_types ORDER BY name`;
  return rows.map(parseProjectType);
}

export async function getScheduledProjects(month?: string): Promise<ScheduledProject[]> {
  const sql = getSql();

  let rows;
  if (month) {
    const pattern = `${month}%`;
    const monthEnd = `${month}-31`;
    const monthStart = `${month}-01`;
    rows = await sql`
      SELECT
        sp.*,
        pt.id AS pt_id,
        pt.name AS pt_name,
        pt.default_duration_days AS pt_default_duration_days,
        pt.required_roles AS pt_required_roles,
        pt.color AS pt_color,
        pt.preferred_start_days AS pt_preferred_start_days
      FROM scheduled_projects sp
      LEFT JOIN project_types pt ON sp.project_type_id = pt.id
      WHERE sp.start_date LIKE ${pattern} OR sp.end_date LIKE ${pattern}
        OR (sp.start_date <= ${monthEnd} AND sp.end_date >= ${monthStart})
      ORDER BY sp.start_date ASC
    `;
  } else {
    rows = await sql`
      SELECT
        sp.*,
        pt.id AS pt_id,
        pt.name AS pt_name,
        pt.default_duration_days AS pt_default_duration_days,
        pt.required_roles AS pt_required_roles,
        pt.color AS pt_color,
        pt.preferred_start_days AS pt_preferred_start_days
      FROM scheduled_projects sp
      LEFT JOIN project_types pt ON sp.project_type_id = pt.id
      ORDER BY sp.start_date ASC
    `;
  }

  return rows.map(parseScheduledProject);
}

export async function getProjectById(id: number): Promise<ScheduledProject | undefined> {
  const sql = getSql();
  const rows = await sql`
    SELECT
      sp.*,
      pt.id AS pt_id,
      pt.name AS pt_name,
      pt.default_duration_days AS pt_default_duration_days,
      pt.required_roles AS pt_required_roles,
      pt.color AS pt_color,
      pt.preferred_start_days AS pt_preferred_start_days
    FROM scheduled_projects sp
    LEFT JOIN project_types pt ON sp.project_type_id = pt.id
    WHERE sp.id = ${id}
  `;
  return rows.length > 0 ? parseScheduledProject(rows[0]) : undefined;
}

export async function createProject(data: {
  project_type_id: number;
  client_name: string;
  project_name: string;
  start_date: string;
  end_date: string;
  kickoff_date?: string | null;
  filming_date?: string | null;
  phases?: ProjectPhase[];
  assigned_members: number[];
  status?: ScheduledProject['status'];
  notes?: string;
  client_image_url?: string;
  created_by?: string;
}): Promise<ScheduledProject> {
  const sql = getSql();
  const members = JSON.stringify(data.assigned_members);
  const phases = JSON.stringify(data.phases ?? []);
  const status = data.status ?? 'scheduled';
  const notes = data.notes ?? '';
  const kickoff = data.kickoff_date ?? null;
  const filming = data.filming_date ?? null;
  const imageUrl = data.client_image_url ?? '';

  const rows = await sql`
    INSERT INTO scheduled_projects
      (project_type_id, client_name, project_name, start_date, end_date, kickoff_date, filming_date, phases, assigned_members, status, notes, client_image_url, created_by)
    VALUES (${data.project_type_id}, ${data.client_name}, ${data.project_name}, ${data.start_date}, ${data.end_date}, ${kickoff}, ${filming}, ${phases}::jsonb, ${members}::jsonb, ${status}, ${notes}, ${imageUrl}, '')
    RETURNING id
  `;

  return (await getProjectById(rows[0].id as number))!;
}

export async function updateProject(
  id: number,
  data: Partial<{
    project_type_id: number;
    client_name: string;
    project_name: string;
    start_date: string;
    end_date: string;
    kickoff_date: string | null;
    filming_date: string | null;
    phases: ProjectPhase[];
    assigned_members: number[];
    status: ScheduledProject['status'];
    notes: string;
    client_image_url: string;
  }>,
): Promise<ScheduledProject | undefined> {
  const sql = getSql();

  const members = data.assigned_members !== undefined
    ? JSON.stringify(data.assigned_members)
    : null;
  const phases = data.phases !== undefined
    ? JSON.stringify(data.phases)
    : null;

  await sql`
    UPDATE scheduled_projects SET
      project_type_id = COALESCE(${data.project_type_id ?? null}, project_type_id),
      client_name = COALESCE(${data.client_name ?? null}, client_name),
      project_name = COALESCE(${data.project_name ?? null}, project_name),
      start_date = COALESCE(${data.start_date ?? null}, start_date),
      end_date = COALESCE(${data.end_date ?? null}, end_date),
      kickoff_date = CASE WHEN ${data.kickoff_date !== undefined} THEN ${data.kickoff_date ?? null} ELSE kickoff_date END,
      filming_date = CASE WHEN ${data.filming_date !== undefined} THEN ${data.filming_date ?? null} ELSE filming_date END,
      phases = COALESCE(${phases}::jsonb, phases),
      assigned_members = COALESCE(${members}::jsonb, assigned_members),
      status = COALESCE(${data.status ?? null}, status),
      notes = COALESCE(${data.notes ?? null}, notes),
      client_image_url = COALESCE(${data.client_image_url ?? null}, client_image_url)
    WHERE id = ${id}
  `;

  return getProjectById(id);
}

export async function deleteProject(id: number): Promise<boolean> {
  const sql = getSql();
  const rows = await sql`DELETE FROM scheduled_projects WHERE id = ${id} RETURNING id`;
  return rows.length > 0;
}

export async function getHolidays(): Promise<Holiday[]> {
  const sql = getSql();
  const rows = await sql`SELECT * FROM holidays ORDER BY date ASC`;
  return rows as unknown as Holiday[];
}

export async function getSnapshotsForMonth(month: string): Promise<DailySnapshot[]> {
  const sql = getSql();
  const pattern = `${month}%`;
  const rows = await sql`SELECT * FROM daily_snapshots WHERE date LIKE ${pattern} ORDER BY date ASC`;
  return rows as unknown as DailySnapshot[];
}

export async function upsertSnapshot(data: {
  date: string;
  team_sentiment_score: number;
  total_overtime_hours: number;
  notes?: string;
}): Promise<DailySnapshot> {
  const sql = getSql();
  const notes = data.notes ?? '';

  const rows = await sql`
    INSERT INTO daily_snapshots (date, team_sentiment_score, total_overtime_hours, notes)
    VALUES (${data.date}, ${data.team_sentiment_score}, ${data.total_overtime_hours}, ${notes})
    ON CONFLICT(date)
    DO UPDATE SET
      team_sentiment_score = EXCLUDED.team_sentiment_score,
      total_overtime_hours = EXCLUDED.total_overtime_hours,
      notes = EXCLUDED.notes
    RETURNING *
  `;

  return rows[0] as unknown as DailySnapshot;
}

export async function getTeamMembersByRole(role: string): Promise<TeamMember[]> {
  const sql = getSql();
  const rows = await sql`SELECT * FROM team_members WHERE role = ${role} AND is_active = true ORDER BY name`;
  return rows.map(parseTeamMember);
}

