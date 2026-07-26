// Esqueleto exibido instantaneamente ao navegar para qualquer tela /dashboard/*,
// enquanto os dados do servidor carregam — evita a sensação de tela travada.
export default function DashboardLoading() {
  return (
    <div className="space-y-8 animate-pulse" aria-busy="true" aria-label="Carregando">
      <div className="h-8 w-64 rounded bg-[#eae7df]" />

      <div className="grid gap-5 xl:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-28 rounded-xl bg-[#eae7df]" />
        ))}
      </div>

      <div className="grid gap-7 md:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-xl bg-[#eae7df]" />
        ))}
      </div>

      <div className="grid gap-8 xl:grid-cols-[1.4fr_1fr]">
        <div className="h-72 rounded-xl bg-[#eae7df]" />
        <div className="h-72 rounded-xl bg-[#eae7df]" />
      </div>
    </div>
  );
}
