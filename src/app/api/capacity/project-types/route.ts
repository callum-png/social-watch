import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { initializeDatabase } from "@/lib/capacity-db";

function getSql() {
  const url = process.env.CAPACITY_DATABASE_URL;
  if (!url) throw new Error("CAPACITY_DATABASE_URL is not set");
  return neon(url);
}

// The two canonical types
const CANONICAL = [
  { name: "Design", color: "#1B4D7E", default_duration_days: 14 },
  { name: "Video",  color: "#E8630A", default_duration_days: 14 },
];

// Old pod names → category
const POD_CATEGORY: Record<string, string> = {
  "Pod 6":  "Design",
  "Pod 6b": "Design",
  "Pod 6A": "Design",
  "Pod 6B": "Design",
  "Pod 7c": "Video",
  "Pod 7A": "Video",
  "Pod 7B": "Video",
};

async function migrate() {
  const sql = getSql();

  // Ensure Design and Video exist, get their IDs
  const typeIds: Record<string, number> = {};
  for (const t of CANONICAL) {
    const existing = await sql`SELECT id FROM project_types WHERE name = ${t.name}`;
    if (existing.length > 0) {
      typeIds[t.name] = existing[0].id as number;
    } else {
      const rows = await sql`
        INSERT INTO project_types (name, default_duration_days, required_roles, color, preferred_start_days)
        VALUES (${t.name}, ${t.default_duration_days}, '[]'::jsonb, ${t.color}, '[]'::jsonb)
        RETURNING id
      `;
      typeIds[t.name] = rows[0].id as number;
    }
  }

  // Migrate old pod types → Design / Video, then delete them
  for (const [podName, category] of Object.entries(POD_CATEGORY)) {
    const pods = await sql`SELECT id FROM project_types WHERE name = ${podName}`;
    for (const pod of pods) {
      const newId = typeIds[category];
      await sql`UPDATE scheduled_projects SET project_type_id = ${newId} WHERE project_type_id = ${pod.id as number}`;
      await sql`DELETE FROM project_types WHERE id = ${pod.id as number}`;
    }
  }

  return typeIds;
}

export async function GET() {
  try {
    await initializeDatabase();
    await migrate();
    const sql = getSql();
    const rows = await sql`SELECT * FROM project_types ORDER BY name`;
    return NextResponse.json({ types: rows });
  } catch (error) {
    console.error("GET /api/capacity/project-types error:", error);
    return NextResponse.json({ error: "Failed to fetch project types." }, { status: 500 });
  }
}

export async function POST() {
  try {
    await initializeDatabase();
    await migrate();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST /api/capacity/project-types error:", error);
    return NextResponse.json({ error: "Failed." }, { status: 500 });
  }
}
