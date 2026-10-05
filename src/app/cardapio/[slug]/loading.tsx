// Esqueleto do cardápio público: no 4G a página leva alguns instantes para buscar
// o catálogo e, sem isto, o cliente via a tela anterior parada.
export default function Loading() {
  return (
    <main className="min-h-screen bg-[#f1f1f1]" aria-busy="true" aria-label="Carregando cardápio">
      <div className="h-56 animate-pulse bg-[#2a1608] md:h-80" />
      <div className="sticky top-0 border-b border-slate-200 bg-white px-4 py-3">
        <div className="mx-auto h-12 max-w-[1320px] animate-pulse rounded-lg bg-slate-100" />
      </div>
      <div className="mx-auto grid max-w-[1320px] gap-3 px-4 py-6 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="grid min-h-[142px] grid-cols-[1fr_112px] gap-4 rounded-lg bg-white p-4 shadow-sm">
            <div className="space-y-3">
              <div className="h-4 w-2/3 animate-pulse rounded bg-slate-200" />
              <div className="h-3 w-full animate-pulse rounded bg-slate-100" />
              <div className="h-3 w-4/5 animate-pulse rounded bg-slate-100" />
            </div>
            <div className="h-28 w-28 animate-pulse rounded-lg bg-slate-100" />
          </div>
        ))}
      </div>
    </main>
  );
}
