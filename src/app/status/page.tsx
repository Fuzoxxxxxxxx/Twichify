"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Check, AlertTriangle } from "lucide-react";

const getBarColor = (state: string) => {
  switch (state) {
    case "green":
      return "bg-[#7ccf6b]";
    case "yellow":
      return "bg-[#f3d85a]";
    case "red":
      return "bg-[#ef6a4d]";
    default:
      return "bg-[#b7d9af]";
  }
};

export default function StatusPage() {
  const [services, setServices] = useState<any[]>([]);
  const [overall, setOverall] = useState("Checking systems...");
  const [isAllOperational, setIsAllOperational] = useState(true);
  const [latency, setLatency] = useState("--");
  const [lastUpdated, setLastUpdated] = useState("--");

  useEffect(() => {
    const loadStatus = async () => {
      try {
        const res = await fetch("/api/status", { cache: "no-store" });
        const data = await res.json();

        if (data.services?.length) {
          setServices(data.services);
        }

        if (data.latency) {
          setLatency(data.latency);
        }

        if (data.allSystemsOperational) {
          setOverall("All Systems Operational");
          setIsAllOperational(true);
        } else {
          setOverall("Some services are experiencing issues");
          setIsAllOperational(false);
        }

        const now = new Date();
        setLastUpdated(
          `${now.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })} ${now.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "UTC",
          })} (UTC)`
        );
      } catch (error) {
        console.error("Erreur chargement status", error);
        setOverall("Unable to load system status");
        setIsAllOperational(false);
      }
    };

    loadStatus();
    const timer = setInterval(loadStatus, 15000);
    return () => clearInterval(timer);
  }, []);

  return (
    <main className="min-h-screen bg-[#05070b] text-white">
      <div className="mx-auto max-w-6xl px-6 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black tracking-[-0.06em] text-white">
              Twitchify Status Page
            </h1>
            <p className="mt-2 text-xl text-zinc-400">
              Real-time monitoring of our core services
            </p>
          </div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm font-semibold text-zinc-200 shadow-sm transition hover:border-zinc-700 hover:text-white"
          >
            <ArrowLeft size={16} />
            Dashboard
          </Link>
        </div>

        {/* Global Status Box */}
        <div
          className={`mb-8 flex items-center justify-between rounded-2xl border px-5 py-4 shadow-sm ${
            isAllOperational
              ? "border-emerald-500/20 bg-emerald-500/10 shadow-emerald-900/10"
              : "border-amber-500/20 bg-amber-500/10 shadow-amber-900/10"
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full ${
                isAllOperational
                  ? "bg-emerald-500/20 text-emerald-300"
                  : "bg-amber-500/20 text-amber-300"
              }`}
            >
              {isAllOperational ? <Check size={18} /> : <AlertTriangle size={18} />}
            </div>
            <span className="text-[18px] font-black tracking-[-0.04em] text-white">
              {overall}
            </span>
          </div>
          <div className="flex items-center gap-4 text-[12px] font-medium text-zinc-400">
            <span>Latency: {latency}</span>
            <span>•</span>
            <span>{lastUpdated}</span>
          </div>
        </div>

        {/* Services List avec Barres 24h */}
        <div className="space-y-7 pb-8">
          {services.length === 0 ? (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6 text-zinc-400">
              Chargement des services...
            </div>
          ) : (
            services.map((service) => (
              <div key={service.name} className="space-y-2">
                <div className="flex items-center justify-between gap-4 px-1">
                  <div className="flex items-center gap-2 text-[18px] font-bold tracking-[-0.04em] text-white">
                    <span>{service.name}</span>
                  </div>
                  <span className="text-[15px] font-semibold text-white">
                    {service.status} ({service.percent})
                  </span>
                </div>

                {/* Barres d'historique 24h */}
                <div className="flex items-center gap-2">
                  <div className="flex flex-1 gap-[4px] overflow-hidden rounded-full">
                    {service.history?.map((state: string, index: number) => (
                      <div
                        key={`${service.name}-${index}`}
                        className={`h-6 flex-1 rounded-full ${getBarColor(state)}`}
                      />
                    ))}
                  </div>
                </div>

                <div className="mt-1 flex items-center justify-between text-[11px] text-zinc-500">
                  <span>24h ago</span>
                  <span>Now</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}