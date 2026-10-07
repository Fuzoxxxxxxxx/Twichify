import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET(request: Request) {
  // 1. Sécuriser la route (Optionnel mais recommandé pour Vercel Cron)
  const authHeader = request.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const client = await clientPromise;
  const db = client.db();

  const servicesToCheck = [
    { name: "Spotify API", url: "https://api.spotify.com/v1" },
    { name: "Twitch API", url: "https://api.twitch.tv/helix" },
  ];

  const now = new Date();

  const logs = await Promise.all(
    servicesToCheck.map(async (service) => {
      const start = Date.now();
      let status = "operational";

      try {
        const res = await fetch(service.url, {
          method: "GET",
          signal: AbortSignal.timeout(5000),
        });

        // 401/403/404 indiquent que l'API est en ligne mais refuse la requête anonyme
        if (res.ok || [401, 403, 404].includes(res.status)) {
          status = "operational";
        } else if (res.status >= 500) {
          status = "degraded";
        } else {
          status = "degraded";
        }
      } catch {
        // En cas de timeout ou problème DNS / réseau
        status = "down";
      }

      return {
        service: service.name,
        status,
        latencyMs: Date.now() - start,
        timestamp: now,
      };
    })
  );

  // Auto-diagnostic : jusqu'ici, « Overlays Server » était affiché sur /status sans jamais être
  // vérifié (aucune donnée était silencieusement traitée comme « opérationnel » par l'API /status).
  // On teste ici la disponibilité de notre propre base, qui fait tourner les widgets et l'API.
  const dbStart = Date.now();
  let dbStatus = "operational";
  try {
    await db.command({ ping: 1 });
  } catch {
    dbStatus = "down";
  }
  logs.push({
    service: "Overlays Server",
    status: dbStatus,
    latencyMs: Date.now() - dbStart,
    timestamp: now,
  });

  // 2. Sauvegarde en BDD
  await db.collection("statuslogs").insertMany(logs);

  return NextResponse.json({ success: true, timestamp: now, results: logs });
}