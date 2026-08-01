import { NextResponse } from "next/server";

const ideas: string[] = [
  "Historique des titres joués pendant le stream",
  "Export des statistiques en CSV",
  "Mode overlay plus premium pour les clips",
];

export async function GET() {
  return NextResponse.json({ ideas });
}

export async function POST(req: Request) {
  const { idea } = await req.json();
  const clean = String(idea || "").trim();

  if (!clean) {
    return NextResponse.json({ error: "Idée vide" }, { status: 400 });
  }

  ideas.unshift(clean);
  return NextResponse.json({ success: true, ideas: ideas.slice(0, 10) });
}

export async function DELETE() {
  ideas.length = 0;
  return NextResponse.json({ success: true, ideas });
}
