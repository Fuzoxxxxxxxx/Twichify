"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Check, AlertTriangle, XCircle } from "lucide-react";

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

        // Vraie condition basée sur la nouvelle API
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

        {/* Services List */}
        <div className="space-y-4 pb-8">
          {services.length === 0 ? (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6 text-zinc-400">
              Chargement des services...
            </div>
          ) : (
            services.map((service) => (
              <div
                key={service.name}
                className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5 shadow-sm transition hover:border-zinc-700"
              >
                <div className="flex items-center gap-3">
                  <span className="text-[18px] font-bold tracking-[-0.04em] text-white">
                    {service.name}
                  </span>
                </div>

                {/* Status Badge */}
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                      service.state === "green"
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                    }`}
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${
                        service.state === "green" ? "bg-emerald-400" : "bg-rose-400"
                      }`}
                    />
                    {service.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}