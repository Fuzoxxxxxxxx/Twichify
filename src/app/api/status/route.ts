import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET() {
  const startTime = Date.now();

  try {
    const client = await clientPromise;
    const db = client.db();

    const now = Date.now();
    const twentyFourHoursAgo = new Date(now - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

    // 1. Exécution des requêtes en parallèle pour réduire la latence
    const [logs, incidents, uptime30dAgg] = await Promise.all([
      db
        .collection("statuslogs")
        .find({ timestamp: { $gte: twentyFourHoursAgo } })
        .sort({ timestamp: 1 })
        .toArray(),

      db
        .collection("incidents")
        .find({ createdAt: { $gte: sevenDaysAgo } })
        .sort({ createdAt: -1 })
        .toArray(),

      db
        .collection("statuslogs")
        .aggregate([
          { $match: { timestamp: {$gte: thirtyDaysAgo } } },
          {
            $group: {
              _id: "$service",
              total: { $sum: 1 },
              operational: {
                $sum: {$cond: [{ $eq: ["$status", "operational"] }, 1, 0] },
              },
            },
          },
        ])
        .toArray(),
    ]);

    // Map pour accès rapide à l'uptime 30 jours
    const uptime30dByService = new Map(
      uptime30dAgg.map((r) => [
        r._id as string,
        r.total > 0 ? (r.operational / r.total) * 100 : null,
      ])
    );

    const serviceNames = ["Spotify API", "Twitch API", "Overlays Server"];
    const totalPoints = 24;
    const HOUR = 60 * 60 * 1000;

    // 2. Traitement des données par service
    const servicesData = serviceNames.map((name) => {
      const serviceLogs = logs.filter((l) => l.service === name);
      const historyStates: ("green" | "yellow" | "red")[] = [];

      for (let i = 0; i < totalPoints; i++) {
        const from = now - (totalPoints - i) * HOUR;
        const to = from + HOUR;
        const bucket = serviceLogs.filter((l) => {
          const t = new Date(l.timestamp).getTime();
          return t >= from && t < to;
        });

        if (bucket.some((l) => l.status === "down")) {
          historyStates.push("red");
        } else if (bucket.some((l) => l.status === "degraded")) {
          historyStates.push("yellow");
        } else {
          historyStates.push("green");
        }
      }

      // Statut actuel (dernier point de mesure)
      const lastState = historyStates[historyStates.length - 1];
      const currentStatus =
        lastState === "green"
          ? "Operational"
          : lastState === "yellow"
          ? "Degraded"
          : "Down";

      // Pourcentage d'heures 100% opérationnelles sur les 24 dernières heures
      const operationalCount = historyStates.filter((s) => s === "green").length;
      const percent = `${((operationalCount / totalPoints) * 100).toFixed(1)}%`;

      return {
        name,
        status: currentStatus,
        percent,
        uptime30d: uptime30dByService.get(name) ?? null,
        history: historyStates,
      };
    });

    const allSystemsOperational = servicesData.every(
      (s) => s.status === "Operational"
    );

    const latency = `${Date.now() - startTime}ms`;

    return NextResponse.json(
      {
        services: servicesData,
        latency,
        allSystemsOperational,
        incidents,
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  } catch (error) {
    console.error("Erreur API status:", error);
    return NextResponse.json(
      { error: "Impossible de charger le statut" },
      { status: 500 }
    );
  }
}