import Link from "next/link";
import { Bell, Bike, Download, Globe, MessageCircle, MonitorDown, Printer, TriangleAlert } from "lucide-react";
import { CopyCommand } from "@/components/copy-command";
import { requireRestaurant } from "@/lib/auth";
import { Icon3D } from "@/components/ui/icon-3d";
import { GESTOR_APP_VERSION, appImageFedoraCommand, gestorDownloads } from "@/lib/gestor-app";

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

        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-ink">Instalar <span className="text-xs font-normal text-ink-faint">versão {GESTOR_APP_VERSION}</span></h2>
            <p className="text-sm text-ink-soft">Escolha o sistema do computador da loja e siga os passos. No Linux, o jeito mais fácil é copiar o comando e colar no Terminal.</p>
          </div>
          {gestorDownloads.map((item) => (
            <article key={item.key} id={item.key} className={card}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-ink">{item.system}</h3>
                  <p className="text-xs text-ink-faint">{item.hint}</p>
                </div>
                <a href={item.url} className="inline-flex items-center gap-2 rounded-xl border border-line px-3.5 py-2 text-sm font-medium text-ink transition hover:border-brand hover:text-brand">
                  <Download size={15} /> {item.label} <span className="text-xs text-ink-faint">{item.size}</span>
                </a>
              </div>
              {item.warning && (
                <p className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-900">
                  <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" /> {item.warning}
                </p>
              )}
              <ol className="mt-3 space-y-1.5 text-sm text-ink-body">
                {item.steps.map((text, index) => (
                  <li key={text} className="flex gap-2.5">
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#f1efea] text-[0.7rem] font-bold text-ink-soft">{index + 1}</span>
                    <span>{text}</span>
                  </li>
                ))}
              </ol>
              {item.command && (
                <div className="mt-3 space-y-2">
                  <CopyCommand command={item.command} label={item.commandHint} />
                  {item.key === "appimage" && <CopyCommand command={appImageFedoraCommand} label="Fedora e derivados" />}
                </div>
              )}
            </article>
          ))}
          <p className="text-sm text-ink-soft">Na primeira vez, entre com o mesmo e-mail e senha do painel. O app abre sozinho quando o computador liga e, ao fechar a janela, fica no ícone ao lado do relógio recebendo pedidos.</p>
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
