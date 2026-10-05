import "server-only";
import type { DeliveryFeeRule, Restaurant } from "./types";
import { amount } from "./order-pricing";
import { boundedText, PublicError } from "./security";

export type ShippingAddress = { street: string; number: string; neighborhood: string; city: string; state: string; cep: string; complement: string; reference: string };
export function shippingAddress(row: Record<string, unknown>): ShippingAddress {
  return { street: boundedText(row.street,200,true), number: boundedText(row.number ?? row.address_number,20,true), neighborhood: boundedText(row.neighborhood,100,true),
    city: boundedText(row.city,100,true), state: boundedText(row.state,2,true), cep: boundedText(row.cep ?? row.zip_code,10), complement: boundedText(row.complement,150), reference: boundedText(row.reference,150) };
}
export function addressText(a: ShippingAddress) { return [a.street,a.number,a.neighborhood,`${a.city}/${a.state}`,a.cep,a.complement,a.reference].filter(Boolean).join(" - "); }
// Exportada para o rastreamento (destino da entrega no mapa).
export async function geocode(query: string) {
  const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=${encodeURIComponent(query)}`, { headers: { "User-Agent": "PeriniFood/1.0 (delivery estimate)" }, signal: AbortSignal.timeout(8000), cache: "no-store" });
  if (!response.ok) throw new PublicError("Não foi possível calcular o frete. Tente novamente.");
  const rows = await response.json() as Array<{lat:string;lon:string}>;
  if (!rows[0] || !Number.isFinite(Number(rows[0].lat)) || !Number.isFinite(Number(rows[0].lon))) throw new PublicError("Endereço não localizado. Confira os dados de entrega.");
  return { lat:Number(rows[0].lat), lon:Number(rows[0].lon) };
}
export async function shippingFee(restaurant: Restaurant, rules: DeliveryFeeRule[], address: ShippingAddress) {
  const active = rules.filter(r=>r.active).sort((a,b)=>Number(a.min_km)-Number(b.min_km));
  if (!active.length) return { fee: amount(restaurant.delivery_fee ?? 0), ruleId: "", distanceKm: null };
  const from = await geocode([restaurant.address,restaurant.address_number,restaurant.neighborhood,restaurant.city,restaurant.state,restaurant.zip_code,"Brasil"].filter(Boolean).join(", "));
  const to = await geocode([address.street,address.number,address.neighborhood,address.city,address.state,address.cep,"Brasil"].filter(Boolean).join(", "));
  const rad = (n:number)=>n*Math.PI/180;
  const a=Math.sin(rad(to.lat-from.lat)/2)**2+Math.cos(rad(from.lat))*Math.cos(rad(to.lat))*Math.sin(rad(to.lon-from.lon)/2)**2;
  const distanceKm=6371*2*Math.atan2(Math.sqrt(a),Math.sqrt(Math.max(0,1-a)));
  const rule=active.find(r=>distanceKm>=Number(r.min_km) && (r.max_km==null || distanceKm<=Number(r.max_km)));
  if (!rule) throw new PublicError("Endereço fora da área de entrega.");
  return { fee: rule.free_delivery ? 0 : amount(rule.fee), ruleId: rule.id, distanceKm };
}
