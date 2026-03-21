import { NextResponse } from "next/server";
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { PAPERS } from "@/lib/papers";

const RESEARCH_DIR = join(process.cwd(), "public", "research");
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

export async function POST(request: Request): Promise<NextResponse> {
  // ── Auth guard — require UPLOAD_SECRET bearer token ──
  const secret = process.env.UPLOAD_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "Upload endpoint not configured" },
      { status: 503 },
    );
  }
  const auth = request.headers.get("authorization");
  if (!auth || auth !== `Bearer ${secret}`) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const paperId = formData.get("paperId") as string | null;

    if (!file || !paperId) {
      return NextResponse.json(
        { error: "Missing file or paperId" },
        { status: 400 },
      );
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "Only PDF files are accepted" },
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File exceeds 50 MB limit" },
        { status: 400 },
      );
    }

    const paper = PAPERS.find((p) => p.id === paperId);
    if (!paper) {
      return NextResponse.json(
        { error: "Unknown paper ID" },
        { status: 400 },
      );
    }

    await mkdir(RESEARCH_DIR, { recursive: true });

    const buffer = Buffer.from(await file.arrayBuffer());
    const filePath = join(RESEARCH_DIR, paper.filename);
    await writeFile(filePath, buffer);

    return NextResponse.json({ ok: true, path: `/research/${paper.filename}` });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 },
    );
  }
}
