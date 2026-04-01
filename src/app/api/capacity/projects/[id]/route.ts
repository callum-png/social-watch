import { NextRequest, NextResponse } from "next/server";
import { getProjectById, updateProject, deleteProject, initializeDatabase } from "@/lib/capacity-db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await initializeDatabase();
    const { id } = await params;
    const projectId = Number(id);
    if (isNaN(projectId)) {
      return NextResponse.json({ error: "Invalid project ID." }, { status: 400 });
    }
    const project = await getProjectById(projectId);
    if (!project) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }
    return NextResponse.json({ project });
  } catch (error) {
    console.error("GET /api/capacity/projects/[id] error:", error);
    return NextResponse.json({ error: "Failed to fetch project." }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await initializeDatabase();
    const { id } = await params;
    const projectId = Number(id);
    if (isNaN(projectId)) {
      return NextResponse.json({ error: "Invalid project ID." }, { status: 400 });
    }
    const existing = await getProjectById(projectId);
    if (!existing) {
      return NextResponse.json({ error: `Project with id ${projectId} not found.` }, { status: 404 });
    }
    const body = await request.json();
    const project = await updateProject(projectId, body);
    return NextResponse.json({ project });
  } catch (error) {
    console.error("PUT /api/capacity/projects/[id] error:", error);
    return NextResponse.json({ error: "Failed to update project." }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await initializeDatabase();
    const { id } = await params;
    const projectId = Number(id);
    if (isNaN(projectId)) {
      return NextResponse.json({ error: "Invalid project ID." }, { status: 400 });
    }
    const existing = await getProjectById(projectId);
    if (!existing) {
      return NextResponse.json({ error: `Project with id ${projectId} not found.` }, { status: 404 });
    }
    await deleteProject(projectId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/capacity/projects/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete project." }, { status: 500 });
  }
}
