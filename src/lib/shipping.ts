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
type Coords = { lat: number; lon: number };
const coords = (lat: unknown, lon: unknown): Coords | null => {
  const point = { lat: Number(lat), lon: Number(lon) };
  return Number.isFinite(point.lat) && Number.isFinite(point.lon) && (point.lat || point.lon) ? point : null;
};
// Cache por instância: o endereço da loja é o mesmo em toda cotação e o Nominatim
// limita a 1 requisição/s.
const geoCache = new Map<string, Coords>();
async function cached(key: string, lookup: () => Promise<Coords | null>) {
  const hit = geoCache.get(key);
  if (hit) return hit;
  const found = await lookup().catch(() => null);
  if (found) { if (geoCache.size > 500) geoCache.clear(); geoCache.set(key, found); }
  return found;
}
async function nominatim(query: string) {
  return cached(`q:${query.toLowerCase()}`, async () => {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=${encodeURIComponent(query)}`, { headers: { "User-Agent": "PeriniFood/1.0 (delivery estimate)" }, signal: AbortSignal.timeout(8000), cache: "no-store" });
    if (!response.ok) return null;
    const rows = await response.json() as Array<{lat:string;lon:string}>;
    return rows[0] ? coords(rows[0].lat, rows[0].lon) : null;
  });
}
const km = (from: Coords, to: Coords) => {
  const rad = (n:number)=>n*Math.PI/180;
  const a=Math.sin(rad(to.lat-from.lat)/2)**2+Math.cos(rad(from.lat))*Math.cos(rad(to.lat))*Math.sin(rad(to.lon-from.lon)/2)**2;
  return 6371*2*Math.atan2(Math.sqrt(a),Math.sqrt(Math.max(0,1-a)));
};
// Pelo CEP só como último recurso: quando não conhece a rua, a API devolve o
// centro da cidade, o que daria frete errado sem ninguém perceber.
async function cepCoords(cep: string, cityCenter: Coords | null) {
  const digits = cep.replace(/\D/g, "");
  if (digits.length !== 8) return null;
  const found = await cached(`cep:${digits}`, async () => {
    const data = await fetch(`https://cep.awesomeapi.com.br/json/${digits}`, { signal: AbortSignal.timeout(6000), cache: "no-store" }).then(r => r.ok ? r.json() : null) as { lat?: string; lng?: string } | null;
    return coords(data?.lat, data?.lng);
  });
  return found && (!cityCenter || km(found, cityCenter) > 0.3) ? found : null;
}
// Do mais preciso ao mais genérico. O OpenStreetMap não tem muitas ruas de bairro
// (a da própria loja, por exemplo): a busca exata voltava vazia, o frete falhava e
// nenhum pedido do site entrava. O centro do bairro basta para as faixas de km.
async function locate(a: { street?: string | null; number?: string | null; neighborhood?: string | null; city?: string | null; state?: string | null; cep?: string | null }) {
  const join = (...parts: Array<string | null | undefined>) => parts.filter(Boolean).join(", ");
  const place = join(a.city, a.state);
  return (a.street && await nominatim(join(a.street, a.number, a.neighborhood, place, "Brasil")))
    || (a.street && await nominatim(join(a.street, place, "Brasil")))
    || (a.neighborhood && await nominatim(join(a.neighborhood, place, "Brasil")))
    || (a.cep && await cepCoords(a.cep, place ? await nominatim(join(place, "Brasil")) : null))
    || null;
}
// Exportada para o rastreamento (destino da entrega no mapa).
export async function geocode(query: string) {
  const found = await nominatim(query);
  if (!found) throw new PublicError("Endereço não localizado. Confira os dados de entrega.");
  return found;
}
export async function shippingFee(restaurant: Restaurant, rules: DeliveryFeeRule[], address: ShippingAddress) {
  const active = rules.filter(r=>r.active).sort((a,b)=>Number(a.min_km)-Number(b.min_km));
  if (!active.length) return { fee: amount(restaurant.delivery_fee ?? 0), ruleId: "", distanceKm: null };
  const from = await locate({ street:restaurant.address, number:restaurant.address_number, neighborhood:restaurant.neighborhood, city:restaurant.city, state:restaurant.state, cep:restaurant.zip_code });
  if (!from) throw new PublicError("Não foi possível calcular o frete agora. Escolha retirada ou fale com a loja.", 503);
  const to = await locate(address);
  if (!to) throw new PublicError("Endereço não localizado. Confira o CEP e o endereço de entrega.");
  const distanceKm=km(from,to);
  const rule=active.find(r=>distanceKm>=Number(r.min_km) && (r.max_km==null || distanceKm<=Number(r.max_km)));
  if (!rule) throw new PublicError("Endereço fora da área de entrega.");
  return { fee: rule.free_delivery ? 0 : amount(rule.fee), ruleId: rule.id, distanceKm };
}
