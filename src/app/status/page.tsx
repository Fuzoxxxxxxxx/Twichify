"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Check } from "lucide-react";

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
  const [overall, setOverall] = useState("All Systems Operational");
  const [lastUpdated, setLastUpdated] = useState("--");

  useEffect(() => {
    const loadStatus = async () => {
      try {
        const res = await fetch("/api/status", { cache: "no-store" });
        const data = await res.json();

        if (data.services?.length) {
          setServices(data.services);
        }

        if (data.spotify === "Online" && data.mongodb === "Healthy") {
          setOverall("All Systems Operational");
        } else {
          setOverall("Some services are degraded");
        }

        const now = new Date();
        setLastUpdated(`${now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} ${now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" })} (UTC)`);
      } catch (error) {
        console.error("Erreur chargement status", error);
      }
    };

    loadStatus();
    const timer = setInterval(loadStatus, 15000);
    return () => clearInterval(timer);
  }, []);

  return (
    <main className="min-h-screen bg-[#05070b] text-white">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black tracking-[-0.06em] text-white">Twitchify Status Page</h1>
            <p className="mt-2 text-xl text-zinc-400">Check the status of our services</p>
          </div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm font-semibold text-zinc-200 shadow-sm transition hover:border-zinc-700 hover:text-white"
          >
            <ArrowLeft size={16} />
            Dashboard
          </Link>
        </div>

        <div className="mb-8 flex items-center justify-between rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-5 py-4 shadow-sm shadow-emerald-900/10">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300">
              <Check size={18} />
            </div>
            <span className="text-[18px] font-black tracking-[-0.04em] text-white">{overall}</span>
          </div>
          <span className="text-[12px] font-medium text-zinc-400">{lastUpdated}</span>
        </div>

        <div className="space-y-7 pb-8">
          {services.length === 0 ? (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6 text-zinc-400">Chargement des services...</div>
          ) : (
            services.map((service) => (
              <div key={service.name} className="space-y-2">
                <div className="flex items-center justify-between gap-4 px-1">
                  <div className="flex items-center gap-2 text-[18px] font-bold tracking-[-0.04em] text-white">
                    <span>{service.name}</span>
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 text-[10px] font-bold text-zinc-400">
                      i
                    </span>
                  </div>
                  <span className="text-[15px] font-semibold text-white">{service.percent}</span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex flex-1 gap-[4px] overflow-hidden rounded-full">
                    {service.history?.map((state: string, index: number) => (
                      <div
                        key={`${service.name}-${index}`}
                        className={`h-6 w-[10px] rounded-full ${getBarColor(state)}`}
                      />
                    ))}
                  </div>
                </div>

                <div className="mt-1 flex items-center justify-between text-[11px] text-zinc-500">
                  <span>30 days ago</span>
                  <span>Today</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
