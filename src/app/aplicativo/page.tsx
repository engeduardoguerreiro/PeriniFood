import Link from "next/link";
import { Bell, Bike, Download, Globe, MessageCircle, MonitorDown, Printer } from "lucide-react";
import { requireRestaurant } from "@/lib/auth";
import { Icon3D } from "@/components/ui/icon-3d";
import { GESTOR_APP_VERSION, gestorDownloads } from "@/lib/gestor-app";

export const metadata = { title: "Gestor de Pedidos para computador · PeriniFood" };

// Download do app desktop do Gestor de Pedidos (Windows e Linux). É a tela de
// operação da loja; cadastros, cardápio e relatórios continuam no painel online.
export default async function GestorAppPage() {
  await requireRestaurant();
  const card = "rounded-2xl border border-line bg-white p-5 shadow-[0_1px_2px_rgba(27,26,23,0.04)]";
  const features = [
    { icon: Bell, text: "Alerta sonoro e aviso na tela para cada pedido do cardápio e do iFood, mesmo com a janela minimizada." },
    { icon: MessageCircle, text: "Pedido pelo WhatsApp ou telefone: lance em segundos (F2) e confirme com o cliente pelo WhatsApp." },
    { icon: Bike, text: "Despache o motoboy com link de rastreio e acompanhe a entrega no mapa ao vivo." },
    { icon: Printer, text: "Comanda impressa sozinha no computador da impressora." },
  ];

  return (
    // Fora do layout do painel: precisa do próprio fundo claro.
    <div className="panel-3d min-h-screen text-ink">
      <main className="mx-auto max-w-3xl space-y-5 p-5">
        <div>
          <Link href="/pedidos" className="text-xs font-medium text-ink-faint transition hover:text-brand">← Voltar ao painel</Link>
          <h1 className="mt-1.5 flex items-center gap-3 text-2xl font-semibold tracking-tight text-ink">
            <Icon3D icon={MonitorDown} tone="red" size="sm" /><span className="min-w-0">Gestor de Pedidos para computador</span>
          </h1>
          <p className="mt-1 text-sm text-ink-soft">Toda a operação da loja numa janela só: receber, tirar, despachar e acompanhar pedidos. Cadastros, cardápio e relatórios continuam aqui no painel online.</p>
        </div>

        <section className={card}>
          <ul className="grid gap-3 sm:grid-cols-2">
            {features.map((item) => (
              <li key={item.text} className="flex items-start gap-2.5 text-sm text-ink-body">
                <item.icon className="mt-0.5 h-4 w-4 shrink-0 text-brand" /> {item.text}
              </li>
            ))}
          </ul>
        </section>

        <section className={card}>
          <h2 className="font-semibold text-ink">Baixar o aplicativo <span className="text-xs font-normal text-ink-faint">versão {GESTOR_APP_VERSION}</span></h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {gestorDownloads.map((item) => (
              <a key={item.key} href={item.url} className="flex flex-col gap-2 rounded-xl border border-line p-4 transition hover:border-brand hover:bg-brand-soft">
                <span className="text-sm font-semibold text-ink">{item.system}</span>
                <span className="inline-flex items-center gap-2 text-sm font-medium text-brand"><Download size={15} /> {item.label}</span>
                <span className="text-xs text-ink-faint">{item.size}</span>
              </a>
            ))}
          </div>
          <div className="mt-5 space-y-2 text-sm text-ink-soft">
            <p><strong className="text-ink">Windows:</strong> abra o arquivo baixado e siga o instalador. Se aparecer &quot;O Windows protegeu o computador&quot;, clique em <em>Mais informações</em> e depois em <em>Executar assim mesmo</em>.</p>
            <p><strong className="text-ink">Ubuntu / Mint / Debian:</strong> dê dois cliques no .deb, ou no terminal: <code className="rounded bg-[#f1efea] px-1.5 py-0.5 text-xs">sudo apt install ./perinifood-gestor_{GESTOR_APP_VERSION}_amd64.deb</code></p>
            <p><strong className="text-ink">Outros Linux:</strong> no AppImage, clique com o botão direito &gt; Propriedades &gt; Permitir executar, e abra com dois cliques.</p>
            <p>Na primeira vez, entre com o mesmo e-mail e senha do painel. O app abre sozinho quando o computador liga e fica no ícone ao lado do relógio quando você fecha a janela.</p>
          </div>
        </section>

        <section className={card}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 font-semibold text-ink"><Globe className="h-4 w-4 text-brand" /> Sem instalar</h2>
              <p className="mt-1 text-sm text-ink-soft">O mesmo gestor abre no navegador, em qualquer computador.</p>
            </div>
            <Link href="/gestor" className="inline-flex items-center gap-2 rounded-xl bg-btn px-4 py-2.5 text-sm font-medium text-white transition hover:bg-btn-hover">Abrir o gestor no navegador</Link>
          </div>
          <p className="mt-3 text-xs text-ink-faint">Para a comanda sair sem a janela de impressão, instale também o <Link href="/impressao" className="font-semibold text-brand hover:underline">agente de impressão</Link>.</p>
        </section>
      </main>
    </div>
  );
}
