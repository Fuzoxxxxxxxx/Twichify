"use client";
import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { Copy, CheckCircle2, ExternalLink } from "lucide-react";

export default function Dashboard() {
  const { data: session } = useSession();
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Détecter si on revient d'une connexion réussie
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("success") === "spotify_connected") {
      setStep(3);
    }
  }, []);

  if (!session) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <p className="text-zinc-500 animate-pulse text-lg font-medium">Chargement de la session...</p>
    </div>
  );

  const saveSpotifyKeys = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/user/spotify-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, clientSecret }),
      });
      if (res.ok) setStep(2);
      else alert("Erreur lors de la sauvegarde.");
    } catch (e) {
      alert("Erreur réseau.");
    } finally {
      setLoading(false);
    }
  };

  const handleConnectSpotify = async () => {
    const res = await fetch("/api/spotify/auth-url");
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    else alert(data.error || "Identifiants invalides");
  };

  const copyToClipboard = () => {
    const url = `${window.location.origin}/widget/${session.user.id}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-2xl mx-auto p-10 bg-zinc-950 text-white mt-10 rounded-3xl border border-zinc-900 shadow-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-black mb-2 tracking-tight">Setup Spotify</h1>
        <div className="flex gap-2 mt-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full ${step >= i ? 'bg-green-500' : 'bg-zinc-800'}`} />
          ))}
        </div>
      </div>

      {step === 1 && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
          <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-sm text-blue-300">
            <p className="font-bold mb-1">Action requise :</p>
            Ajoutez l'URL de redirection dans votre panel Spotify Developer :
            <code className="block mt-2 bg-black/40 p-2 rounded text-blue-400">
              {typeof window !== 'undefined' ? window.location.origin : ''}/api/callback/spotify
            </code>
          </div>
          
          <div className="space-y-4">
            <input 
              type="text" 
              placeholder="Spotify Client ID"
              className="w-full p-4 bg-zinc-900 rounded-2xl border border-zinc-800 focus:border-green-500 outline-none transition" 
              onChange={(e) => setClientId(e.target.value)}
            />
            <input 
              type="password" 
              placeholder="Spotify Client Secret"
              className="w-full p-4 bg-zinc-900 rounded-2xl border border-zinc-800 focus:border-green-500 outline-none transition" 
              onChange={(e) => setClientSecret(e.target.value)}
            />
          </div>
          
          <button 
            onClick={saveSpotifyKeys}
            disabled={loading || !clientId || !clientSecret}
            className="w-full bg-white text-black py-4 rounded-2xl font-black hover:bg-zinc-200 transition disabled:opacity-50"
          >
            {loading ? "Traitement..." : "Enregistrer les clés"}
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="text-center py-6 space-y-6 animate-in zoom-in-95">
          <div className="inline-flex p-4 rounded-full bg-green-500/10 text-green-500 mb-2">
            <CheckCircle2 size={48} />
          </div>
          <h2 className="text-2xl font-bold">Identifiants enregistrés</h2>
          <p className="text-zinc-400">Vous devez maintenant autoriser l'application à lire votre activité Spotify.</p>
          <button 
            onClick={handleConnectSpotify}
            className="w-full bg-green-500 hover:bg-green-600 text-black py-5 rounded-2xl font-black text-lg transition shadow-[0_0_30px_rgba(34,197,94,0.2)]"
          >
            LIER MON COMPTE SPOTIFY
          </button>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
          <div className="text-center">
            <div className="inline-flex p-4 rounded-full bg-green-500/10 text-green-500 mb-4">
              <CheckCircle2 size={48} />
            </div>
            <h2 className="text-2xl font-bold italic uppercase tracking-tighter text-green-400">Prêt pour le stream !</h2>
          </div>

          <div className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800">
            <label className="block text-xs uppercase font-bold text-zinc-500 mb-3 tracking-widest">URL Source Navigateur OBS</label>
            <div className="relative group">
              <input 
                readOnly 
                value={`${typeof window !== 'undefined' ? window.location.origin : ''}/widget/${session.user.id}`}
                className="w-full bg-black p-4 pr-12 rounded-xl border border-zinc-800 text-sm font-mono text-zinc-300 focus:border-green-500 outline-none"
              />
              <button 
                onClick={copyToClipboard}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-zinc-400 hover:text-white transition"
              >
                {copied ? <CheckCircle2 size={20} className="text-green-500" /> : <Copy size={20} />}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <a 
              href={`/widget/${session.user.id}`} 
              target="_blank"
              className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl bg-zinc-800 font-bold hover:bg-zinc-700 transition"
            >
              <ExternalLink size={18} />
              Aperçu du Widget
            </a>
            <button onClick={() => setStep(1)} className="text-zinc-600 text-sm hover:text-zinc-400 transition">
              Recommencer la configuration
            </button>
          </div>
        </div>
      )}
    </div>
  );
}