import { Filter } from "lucide-react";
import type { ReportSearchParams } from "@/lib/reports";
import { DateRangeFilter } from "./DateRangeFilter";

function pick(searchParams: ReportSearchParams, key: string, fallback = "") {
  const value = searchParams[key];
  return Array.isArray(value) ? value[0] ?? fallback : value ?? fallback;
}

export function ReportFilters({
  searchParams,
  showAdvanced = false,
}: {
  searchParams: ReportSearchParams;
  showAdvanced?: boolean;
}) {
  const period = pick(searchParams, "periodo", "30dias");
  return (
    <form className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid gap-3 lg:grid-cols-[180px_repeat(2,160px)_1fr_auto] lg:items-end">
        <label className="grid gap-1 text-xs font-black uppercase text-slate-500">
          Período
          <select className="field-light h-11 rounded-xl py-2 text-sm" name="periodo" defaultValue={period}>
            <option value="hoje">Hoje</option>
            <option value="ontem">Ontem</option>
            <option value="7dias">Últimos 7 dias</option>
            <option value="30dias">Últimos 30 dias</option>
            <option value="mes">Este mês</option>
            <option value="mes-anterior">Mês anterior</option>
            <option value="personalizado">Personalizado</option>
          </select>
        </label>
        <DateRangeFilter searchParams={searchParams} />
        <label className="grid gap-1 text-xs font-black uppercase text-slate-500">
          Busca
          <input className="field-light h-11 rounded-xl py-2 text-sm" name="q" placeholder="Produto, cliente ou pedido" defaultValue={pick(searchParams, "q")} />
        </label>
        <button className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#232A31] px-5 text-sm font-black text-white transition hover:bg-[#E50914]">
          <Filter size={16} />
          Filtrar
        </button>
      </div>
      {showAdvanced ? (
        <div className="mt-3 grid gap-3 md:grid-cols-4">
          <select className="field-light h-11 rounded-xl py-2 text-sm" name="status" defaultValue={pick(searchParams, "status", "todos")}>
            <option value="todos">Todos os status</option>
            <option value="pending">Novo</option>
            <option value="accepted">Confirmado</option>
            <option value="preparing">Em preparo</option>
            <option value="ready">Pronto</option>
            <option value="out_for_delivery">Saiu para entrega</option>
            <option value="completed">Entregue</option>
            <option value="canceled">Cancelado</option>
          </select>
          <select className="field-light h-11 rounded-xl py-2 text-sm" name="tipo_pedido" defaultValue={pick(searchParams, "tipo_pedido", "todos")}>
            <option value="todos">Todos os tipos</option>
            <option value="delivery">Delivery</option>
            <option value="pickup">Retirada</option>
            <option value="dine_in">Consumo no local</option>
          </select>
          <select className="field-light h-11 rounded-xl py-2 text-sm" name="pagamento" defaultValue={pick(searchParams, "pagamento", "todos")}>
            <option value="todos">Todos os pagamentos</option>
            <option value="pix">Pix</option>
            <option value="cash">Dinheiro</option>
            <option value="credit_card">Cartão de crédito</option>
            <option value="debit_card">Cartão de débito</option>
            <option value="online">Pago online</option>
          </select>
          <select className="field-light h-11 rounded-xl py-2 text-sm" name="canal" defaultValue={pick(searchParams, "canal", "todos")}>
            <option value="todos">Todos os canais</option>
            <option value="pdv">PDV</option>
            <option value="site">Cardápio próprio</option>
            <option value="ifood">iFood</option>
            <option value="99food">99Food</option>
            <option value="keeta">Keeta</option>
          </select>
        </div>
      ) : null}
    </form>
  );
}
