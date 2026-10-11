/* eslint-disable @next/next/no-img-element */
import { Bike, ChevronRight, Clock3, CreditCard, Info, MapPin, MessageCircle, ShoppingBag } from "lucide-react";
import { openingHourDays, storeStatusLabel, type OpeningHours } from "@/lib/opening-hours";
import { money, whatsappLink } from "@/lib/utils";
import type { Restaurant } from "@/lib/types";

const paymentLabels: Record<string, string> = { cash: "Dinheiro", pix: "Pix", credit_card: "Cartão de crédito", debit_card: "Cartão de débito", online: "Pagamento online", other: "Outros" };

// Topo do cardápio público: compacto no celular (o cliente vê produtos já na
// primeira tela) e com as informações que decidem a compra num painel recolhível.
export function StoreHeader({ restaurant, deliveryFees }: { restaurant: Restaurant; deliveryFees: { min: number; max: number } }) {
  const cover = restaurant.site_cover_url ?? restaurant.banner_url ?? restaurant.cover_url;
  const status = storeStatusLabel(restaurant);
  const address = [restaurant.address && `${restaurant.address}${restaurant.address_number ? `, ${restaurant.address_number}` : ""}`, restaurant.neighborhood, restaurant.city && `${restaurant.city}${restaurant.state ? `/${restaurant.state}` : ""}`].filter(Boolean).join(" · ");
  const hours = (restaurant.opening_hours ?? {}) as OpeningHours;
  const payments = (restaurant.payment_methods?.length ? restaurant.payment_methods : ["cash", "pix", "credit_card", "debit_card"]).map((m) => paymentLabels[m] ?? m);
  const whatsapp = restaurant.whatsapp || restaurant.phone;

  return (
    <header className="bg-white">
      <div className="relative h-36 overflow-hidden bg-[#1c1410] sm:h-48 md:h-60">
        {cover && <img src={cover} alt="" fetchPriority="high" decoding="async" className="h-full w-full object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
      </div>

      <div className="mx-auto max-w-6xl px-4">
        <div className="relative -mt-10 flex items-end gap-3 sm:-mt-12">
          <span className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-full border-4 border-white bg-white shadow-[0_10px_24px_-10px_rgba(0,0,0,0.5)] sm:h-24 sm:w-24">
            {restaurant.logo_url ? <img src={restaurant.logo_url} alt={restaurant.name} className="h-full w-full object-contain" /> : <span className="text-2xl font-black text-ink">{restaurant.name.slice(0, 2)}</span>}
          </span>
          <span className={`mb-1 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${status.open ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>
            <span className={`h-2 w-2 rounded-full ${status.open ? "bg-emerald-500" : "bg-amber-500"}`} /> {status.text}
          </span>
        </div>

        <h1 className="mt-2 text-2xl font-black leading-tight tracking-tight text-ink sm:text-3xl">{restaurant.name}</h1>
        {restaurant.description && <p className="mt-0.5 line-clamp-1 text-sm text-slate-500">{restaurant.description}</p>}

        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-slate-700">
          {restaurant.delivery_enabled !== false && <li className="inline-flex items-center gap-1.5"><Bike className="h-4 w-4 text-brand" /> {restaurant.estimated_delivery_time ?? "40-50 min"}</li>}
          {restaurant.delivery_enabled !== false && <li className="inline-flex items-center gap-1.5"><ShoppingBag className="h-4 w-4 text-brand" /> {deliveryFees.min === deliveryFees.max ? `Entrega ${deliveryFees.min ? money(deliveryFees.min) : "grátis"}` : `Entrega de ${deliveryFees.min ? money(deliveryFees.min) : "grátis"} a ${money(deliveryFees.max)}, conforme a distância`}</li>}
          {Number(restaurant.minimum_order ?? 0) > 0 && <li className="text-slate-500">Pedido mínimo {money(restaurant.minimum_order)}</li>}
          {restaurant.pickup_enabled && <li className="text-slate-500">Retirada no local</li>}
        </ul>

        <details className="group mt-3 border-y border-slate-100 py-2.5 [&_summary::-webkit-details-marker]:hidden">
          <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold text-ink">
            <span className="inline-flex items-center gap-2"><Info className="h-4 w-4 text-brand" /> Ver informações da loja</span>
            <ChevronRight className="h-4 w-4 text-slate-400 transition group-open:rotate-90" />
          </summary>
          <div className="grid gap-4 pb-1 pt-3 text-sm text-slate-600 sm:grid-cols-3">
            <div>
              <p className="mb-1 flex items-center gap-1.5 font-semibold text-ink"><Clock3 className="h-4 w-4" /> Horários</p>
              <ul className="space-y-0.5">
                {openingHourDays.map(([key, label]) => (
                  <li key={key} className="flex justify-between gap-3"><span>{label.replace("-feira", "")}</span><span className="[font-variant-numeric:tabular-nums]">{hours[key]?.active ? `${hours[key].open} – ${hours[key].close}` : "Fechado"}</span></li>
                ))}
              </ul>
            </div>
            <div>
              <p className="mb-1 flex items-center gap-1.5 font-semibold text-ink"><CreditCard className="h-4 w-4" /> Pagamento</p>
              <p>{payments.join(" · ")}</p>
            </div>
            <div className="space-y-2">
              {address && <p className="flex gap-1.5"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-ink" /> {address}</p>}
              {whatsapp && (
                <a href={whatsappLink(whatsapp, `Olá! Vim pelo cardápio online da ${restaurant.name}.`)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-2 font-semibold text-white">
                  <MessageCircle className="h-4 w-4" /> Falar no WhatsApp
                </a>
              )}
            </div>
          </div>
        </details>
      </div>
    </header>
  );
}
