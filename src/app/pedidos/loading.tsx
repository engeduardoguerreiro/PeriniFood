// Feedback instantâneo ao abrir a tela operacional de pedidos.
export default function PedidosLoading() {
  return (
    <div className="mx-auto max-w-6xl space-y-5 p-5 animate-pulse" aria-busy="true" aria-label="Carregando pedidos">
      <div className="h-8 w-48 rounded bg-[#eae7df]" />
      <div className="flex gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-9 w-28 rounded-lg bg-[#eae7df]" />
        ))}
      </div>
      <div className="space-y-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-20 rounded-xl bg-[#eae7df]" />
        ))}
      </div>
    </div>
  );
}
