import Link from "next/link";
import { deleteCustomer, saveCustomer } from "@/app/actions";
import { ActionFeedback } from "@/components/action-feedback";
import { requireRestaurant } from "@/lib/auth";
import { calculateLoyaltyPoints, withLoyaltyCampaign } from "@/lib/loyalty";
import type { Customer, Order } from "@/lib/types";

type CustomersSearchParams = {
  q?: string;
  status?: string;
  error?: string;
};

export default async function CustomersPage({ searchParams }: { searchParams: Promise<CustomersSearchParams> }) {
  const { supabase, restaurant } = await requireRestaurant();
  const sp = await searchParams;
  const query = (sp.q ?? "").trim();
  let request = supabase.from("customers").select("*").eq("restaurant_id", restaurant.id).order("created_at", { ascending: false });
  if (query) request = request.or(`name.ilike.%${query}%,phone.ilike.%${query}%,whatsapp.ilike.%${query}%`);
  const [{ data, error }, { data: loyalty }, { data: orders }] = await Promise.all([
    request,
    supabase.from("loyalty_programs").select("*").eq("restaurant_id", restaurant.id).maybeSingle(),
    supabase.from("orders").select("customer_id, customer_phone, total, status, payment_status, created_at").eq("restaurant_id", restaurant.id),
  ]);
  const customers = (data ?? []) as Customer[];
  const loyaltyWithCampaign = withLoyaltyCampaign(loyalty, restaurant.opening_hours as Record<string, unknown> | null);
  const loyaltyOrders = (orders ?? []) as Pick<Order, "customer_id" | "customer_phone" | "total" | "status" | "payment_status" | "created_at">[];
  const pointsForCustomer = (customer: Customer) => calculateLoyaltyPoints(loyaltyWithCampaign, loyaltyOrders.filter((order) => (
    order.customer_id === customer.id || (!order.customer_id && Boolean(customer.phone) && order.customer_phone === customer.phone)
  )));

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm">
      <ActionFeedback status={sp.status ?? ""} error={sp.error ?? ""} />
      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">
          Não foi possível carregar os clientes agora: {error.message}
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black">Clientes</h2>
          <p className="text-sm text-slate-500">Clientes são cadastrados automaticamente ao criar pedidos.</p>
        </div>
        <form className="flex flex-wrap gap-2">
          <input className="h-10 w-72 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-red-300" name="q" placeholder="Buscar nome ou telefone" defaultValue={query ?? ""} />
          <button className="h-10 rounded-lg border border-red-200 bg-white px-4 text-sm font-black text-slate-800 transition hover:border-red-300 hover:bg-red-50">Buscar</button>
        </form>
      </div>

      <div className="mt-5 overflow-hidden rounded-xl border border-slate-200">
        <div className="grid grid-cols-[minmax(170px,1fr)_150px_minmax(160px,1fr)_80px_92px_82px_76px] gap-3 border-b border-slate-200 bg-slate-50/80 px-4 py-2 text-[11px] font-black uppercase text-slate-500 max-lg:hidden">
          <span>Nome</span>
          <span>Telefone</span>
          <span>Email</span>
          <span>Pontos</span>
          <span className="col-span-3 text-right">Ações</span>
        </div>

        <div className="divide-y divide-slate-200">
          {customers.map((customer) => (
            <div key={customer.id} className="grid gap-3 px-4 py-2 text-sm transition hover:bg-slate-50/70 lg:grid-cols-[minmax(170px,1fr)_150px_minmax(160px,1fr)_80px_92px_82px_76px] lg:items-center">
              <form action={saveCustomer} className="contents">
                <input type="hidden" name="id" value={customer.id} />
                <input type="hidden" name="return_to" value="/clientes" />
                <label className="space-y-1 lg:space-y-0">
                  <span className="text-xs font-black uppercase text-slate-500 lg:hidden">Nome</span>
                  <input className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-red-300" name="name" defaultValue={customer.name} required />
                </label>
                <label className="space-y-1 lg:space-y-0">
                  <span className="text-xs font-black uppercase text-slate-500 lg:hidden">Telefone</span>
                  <input className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-red-300" name="phone" defaultValue={customer.phone ?? ""} />
                </label>
                <label className="space-y-1 lg:space-y-0">
                  <span className="text-xs font-black uppercase text-slate-500 lg:hidden">Email</span>
                  <input className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-red-300" name="email" defaultValue={customer.email ?? ""} />
                </label>
                <div className="flex h-9 items-center rounded-lg bg-red-50 px-3 text-sm font-black text-red-700">
                  <span className="mr-2 text-xs uppercase text-red-500 lg:hidden">Pontos</span>{pointsForCustomer(customer)}
                </div>
                <input type="hidden" name="address" value={customer.address ?? ""} />
                <input type="hidden" name="address_number" value={customer.address_number ?? ""} />
                <input type="hidden" name="neighborhood" value={customer.neighborhood ?? ""} />
                <input type="hidden" name="complement" value={customer.complement ?? ""} />
                <input type="hidden" name="reference" value={customer.reference ?? ""} />
                <input type="hidden" name="city" value={customer.city ?? ""} />
                <input type="hidden" name="state" value={customer.state ?? ""} />
                <input type="hidden" name="zip_code" value={customer.zip_code ?? ""} />
                <input type="hidden" name="cpf" value={customer.cpf ?? ""} />
                <input type="hidden" name="birth_date" value={customer.birth_date ?? ""} />
                <input type="hidden" name="notes" value={customer.notes ?? ""} />
                <div className="flex justify-end">
                  <button className="h-8 w-full rounded-lg border border-red-200 bg-white px-1.5 text-[10px] font-black text-slate-800 transition hover:border-red-300 hover:bg-red-50">Salvar</button>
                </div>
              </form>
              <div className="flex flex-wrap justify-end gap-2 lg:col-span-2 lg:col-start-6 lg:flex-nowrap">
                <Link className="inline-flex h-8 w-full min-w-16 items-center justify-center rounded-lg border border-slate-200 bg-white px-1.5 text-[10px] font-black text-slate-800 transition hover:border-red-300 hover:bg-red-50" href={`/clientes/${customer.id}`}>
                  Editar
                </Link>
                <form action={deleteCustomer} className="w-full min-w-16">
                  <input type="hidden" name="id" value={customer.id} />
                  <input type="hidden" name="return_to" value="/clientes" />
                  <button className="h-8 w-full rounded-lg border border-red-200 bg-white px-1.5 text-[10px] font-black text-red-600 transition hover:bg-red-50">Excluir</button>
                </form>
              </div>
            </div>
          ))}
          {!customers.length && <p className="p-5 text-sm text-slate-500">Nenhum cliente encontrado.</p>}
        </div>
      </div>
    </section>
  );
}
