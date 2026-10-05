import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-paper px-4 py-12 text-ink">
      <div className="w-full max-w-md rounded-2xl border border-line bg-white p-6 text-center shadow-sm sm:p-8">
        <p className="brand-kicker">Erro 404</p>
        <h1 className="mt-2 text-2xl font-semibold">Página não encontrada</h1>
        <p className="mt-3 text-sm text-ink-soft">O endereço pode estar errado ou o conteúdo foi removido.</p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link href="/" className="btn-primary">Ir para o início</Link>
          <Link href="/pedidos" className="btn-muted">Abrir o painel</Link>
        </div>
      </div>
    </main>
  );
}
