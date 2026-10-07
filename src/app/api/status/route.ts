import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET() {
  const startTime = Date.now();

  try {
    const client = await clientPromise;
    const db = client.db();

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // 1. Récupération des logs des 24h
    const logs = await db
      .collection("statuslogs")
      .find({ timestamp: { $gte: twentyFourHoursAgo } })
      .sort({ timestamp: 1 })
      .toArray();

    // 2. Récupération optionnelle des incidents des 7 derniers jours
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const incidents = await db
      .collection("incidents")
      .find({ createdAt: { $gte: sevenDaysAgo } })
      .sort({ createdAt: -1 })
      .toArray();

    // 2bis. Disponibilité sur 30 jours (agrégée en base, plus fiable qu'une moyenne des barres 24h)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const uptime30dAgg = await db
      .collection("statuslogs")
      .aggregate([
        { $match: { timestamp: { $gte: thirtyDaysAgo } } },
        {
          $group: {
            _id: "$service",
            total: { $sum: 1 },
            operational: { $sum: { $cond: [{ $eq: ["$status", "operational"] }, 1, 0] } },
          },
        },
      ])
      .toArray();
    const uptime30dByService = new Map(
      uptime30dAgg.map((r) => [r._id as string, r.total > 0 ? (r.operational / r.total) * 100 : null])
    );

    const serviceNames = ["Spotify API", "Twitch API", "Overlays Server"];
    const totalPoints = 24; // 24 points pour représenter les 24 dernières heures

    // 3. Formater les données par service
    const servicesData = serviceNames.map((name) => {
      const serviceLogs = logs.filter((l) => l.service === name);
      const historyStates: string[] = [];

      // Une barre par heure : on regroupe les logs par tranche horaire (de la plus ancienne à la plus récente).
      const HOUR = 60 * 60 * 1000;
      const now = Date.now();

      for (let i = 0; i < totalPoints; i++) {
        const from = now - (totalPoints - i) * HOUR;
        const to = from + HOUR;
        const bucket = serviceLogs.filter((l) => {
          const t = new Date(l.timestamp).getTime();
          return t >= from && t < to;
        });

        // Pire statut de l'heure ; aucune donnée = considéré opérationnel (comportement inchangé).
        if (bucket.some((l) => l.status === "down")) {
          historyStates.push("red");
        } else if (bucket.some((l) => l.status === "degraded")) {
          historyStates.push("yellow");
        } else {
          historyStates.push("green");
        }
      }

      const operationalCount = historyStates.filter((s) => s === "green").length;
      const percent = `${((operationalCount / totalPoints) * 100).toFixed(1)}%`;
      const currentStatus =
        historyStates[historyStates.length - 1] === "green"
          ? "Operational"
          : "Degraded";

      return {
        name,
        status: currentStatus,
        percent,
        // null tant qu'il n'y a pas encore 30 jours de données (ex. juste après la mise en place du suivi)
        uptime30d: uptime30dByService.get(name) ?? null,
        history: historyStates,
      };
    });

    const allSystemsOperational = servicesData.every(
      (s) => s.status === "Operational"
    );

    // Mesure réelle du temps de réponse backend + BDD
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