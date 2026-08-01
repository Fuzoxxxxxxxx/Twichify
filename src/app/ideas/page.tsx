"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, BellRing, Lightbulb, Send, Sparkles, Trash2 } from "lucide-react";

export default function IdeasPage() {
  const [idea, setIdea] = useState("");
  const [ideas, setIdeas] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const loadIdeas = async () => {
    try {
      const res = await fetch("/api/ideas");
      const data = await res.json();
      setIdeas(data.ideas || []);
    } catch (e) {
      console.error("Erreur chargement idées", e);
    }
  };

  useEffect(() => {
    loadIdeas();
  }, []);

  const submitIdea = async () => {
    if (!idea.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea: idea.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setIdeas(data.ideas || []);
        setIdea("");
      }
    } finally {
      setLoading(false);
    }
  };

  const clearIdeas = async () => {
    try {
      const res = await fetch("/api/ideas", { method: "DELETE" });
      const data = await res.json();
      if (res.ok) setIdeas(data.ideas || []);
    } catch (e) {
      console.error("Erreur suppression idées", e);
    }
  };

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="rounded-full border border-zinc-800 bg-zinc-950/80 p-2 text-zinc-300 transition hover:text-white">
              <ArrowLeft size={16} />
            </Link>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-amber-400">Boîte à idées</p>
              <h1 className="mt-1 text-4xl font-black tracking-tighter text-white">Proposez une feature</h1>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[32px] border border-zinc-800 bg-zinc-950/60 p-6 shadow-2xl shadow-black/30">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400">
                <Lightbulb size={18} />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-500">Suggestion</p>
                <h2 className="mt-1 text-xl font-black text-white">Partagez votre idée</h2>
              </div>
            </div>

            <textarea
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              rows={6}
              placeholder="Ex : créer un historique des musiques jouées pendant le stream..."
              className="w-full resize-none rounded-[24px] border border-zinc-700 bg-black/20 p-4 text-sm text-white outline-none transition focus:border-amber-500"
            />

            <div className="mt-4 flex items-center justify-between gap-3">
              <button
                onClick={submitIdea}
                disabled={loading || !idea.trim()}
                className="flex items-center gap-2 rounded-2xl bg-amber-500 px-5 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-black transition hover:bg-amber-400 disabled:opacity-50"
              >
                <Send size={14} />
                {loading ? "Envoi..." : "Envoyer"}
              </button>

              <button
                onClick={clearIdeas}
                className="flex items-center gap-2 rounded-2xl border border-zinc-700 bg-zinc-900/60 px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-300 transition hover:text-white"
              >
                <Trash2 size={14} />
                Vider
              </button>
            </div>
          </div>

          <div className="rounded-[32px] border border-zinc-800 bg-zinc-950/60 p-6 shadow-2xl shadow-black/30">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-400">
                <BellRing size={18} />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-500">Top idées</p>
                <h2 className="mt-1 text-xl font-black text-white">Suggestions récentes</h2>
              </div>
            </div>

            <div className="space-y-3">
              {ideas.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-zinc-700 bg-black/20 p-4 text-sm text-zinc-500">
                  Aucune idée pour le moment. Lancez la première suggestion.
                </p>
              ) : (
                ideas.map((item, index) => (
                  <div key={`${item}-${index}`} className="rounded-2xl border border-zinc-800 bg-black/20 px-4 py-3 text-sm text-zinc-200">
                    {item}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
