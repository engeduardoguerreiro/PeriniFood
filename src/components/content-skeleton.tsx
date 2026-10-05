// Esqueleto do conteúdo mostrado enquanto a tela carrega. Como o AppShell vive
// no layout, a barra lateral continua visível e só esta área pisca — a
// navegação deixa de parecer travada.
export function ContentSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Carregando">
      <div className="space-y-2">
        <div className="h-7 w-56 animate-pulse rounded-lg bg-[#eae7df]" />
        <div className="h-4 w-80 animate-pulse rounded bg-[#f0ede7]" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl border border-line bg-white" />
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-line bg-white">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex items-center gap-4 border-b border-line-soft px-4 py-3.5 last:border-0">
            <div className="h-10 w-10 shrink-0 animate-pulse rounded-lg bg-[#f0ede7]" />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 w-1/3 animate-pulse rounded bg-[#eae7df]" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-[#f0ede7]" />
            </div>
            <div className="h-8 w-20 shrink-0 animate-pulse rounded-lg bg-[#f0ede7]" />
          </div>
        ))}
      </div>
    </div>
  );
}
