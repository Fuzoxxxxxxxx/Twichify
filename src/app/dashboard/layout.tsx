export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[#12141c] text-[#e1e7ef]">
      {/* Sidebar inspirée de ton image */}
      <aside className="w-64 border-r border-white/5 bg-[#1a1d27] p-6 flex flex-col gap-8">
        <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">N</div>
          NOWPLAYING
        </div>
        
        <nav className="flex flex-col gap-2 flex-1">
          <p className="text-xs font-semibold text-zinc-500 uppercase px-4 mb-2">Main</p>
          <a href="/dashboard" className="flex items-center gap-3 px-4 py-3 bg-indigo-600/10 text-indigo-400 rounded-xl border border-indigo-600/20">
            <span>🏠</span> Dashboard
          </a>
          
          <p className="text-xs font-semibold text-zinc-500 uppercase px-4 mt-6 mb-2">Connections</p>
          <a href="/dashboard/spotify" className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 rounded-xl transition text-zinc-400">
            <span>🎵</span> Spotify
          </a>
          
          <p className="text-xs font-semibold text-zinc-500 uppercase px-4 mt-6 mb-2">Widget</p>
          <a href="/dashboard/design" className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 rounded-xl transition text-zinc-400">
            <span>🎨</span> Design
          </a>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}