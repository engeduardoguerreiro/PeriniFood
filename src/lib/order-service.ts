import "server-only";
import { headers } from "next/headers";
import { randomBytes } from "node:crypto";
import { createServiceClient } from "./supabase/service";
import { customerSession, rateLimit } from "./customer-session";
import { priceCart, amount, type PricingCatalog } from "./order-pricing";
import { boundedText, PublicError, uuid } from "./security";
import { parseDecimal } from "./utils";
import { getAccessState } from "./platform-billing";
import { isRestaurantOpen } from "./opening-hours";
import { deliveryRulesFromRestaurant, isMissingRelationError } from "./delivery-fee-rules";
import { addressText, shippingAddress, shippingFee } from "./shipping";
import type { DeliveryFeeRule, Restaurant } from "./types";

// Os campos de dinheiro chegam como o usuário digitou ("89,90"): Number() daria NaN
// e o pedido seria recusado com "Valor inválido.". parseDecimal entende vírgula e
// separador de milhar; amount continua validando faixa e arredondamento.
function money(form: FormData, key: string) {
  const raw = boundedText(form.get(key),20);
  return raw ? amount(parseDecimal(raw)) : 0;
}

export async function saveValidatedOrder(form: FormData, restaurantId: string, source: "site" | "pdv", existingId?: string) {
  uuid(restaurantId);
  const service = createServiceClient();
  if ((await getAccessState(restaurantId)).blocked) throw new PublicError("Loja indisponível.");
  const { data: restaurant, error } = await service.from("restaurants").select("*").eq("id",restaurantId).single();
  if (error || !restaurant) throw new PublicError("Loja indisponível.");
  const store = restaurant as Restaurant;
  const type = boundedText(form.get("type") ?? "pickup",20);
  if (!["delivery","pickup",...(source==="pdv" ? ["dine_in"] : [])].includes(type)) throw new PublicError("Modalidade inválida.");
  if (source==="site" && (!isRestaurantOpen(store) || (type==="delivery" ? !store.delivery_enabled : !store.pickup_enabled))) throw new PublicError("Loja indisponível para esta modalidade.");
  const payment = boundedText(form.get("payment_method") ?? "pix",20);
  if (!["cash","pix","credit_card","debit_card","online","other"].includes(payment) || (source==="site" && !(store.payment_methods?.length ? store.payment_methods : ["cash","pix","credit_card","debit_card"]).includes(payment))) throw new PublicError("Forma de pagamento inválida.");
  const raw = boundedText(form.get("cart"),100_000,true);
  let input: unknown;
  try { input=JSON.parse(raw); } catch { throw new PublicError("Carrinho inválido."); }
  const [products,variants,addons,options,pizzaOptions] = await Promise.all([
    service.from("products").select("*").eq("restaurant_id",restaurantId).eq("active",true),
    service.from("product_variants").select("*,products!inner(restaurant_id)").eq("products.restaurant_id",restaurantId).eq("active",true),
    service.from("product_addons").select("*").eq("restaurant_id",restaurantId).eq("active",true),
    service.from("product_options").select("*,product_option_items(*)").eq("restaurant_id",restaurantId),
    service.from("pizza_options").select("*").eq("restaurant_id",restaurantId).eq("active",true),
  ]);
  if ([products,variants,addons,options,pizzaOptions].some(r=>r.error)) throw new PublicError("Catálogo temporariamente indisponível.",503);
  const catalog = { products:products.data, variants:variants.data, addons:addons.data, options:options.data, pizzaOptions:pizzaOptions.data, maxFlavors:store.max_pizza_flavors ?? 4 } as PricingCatalog;
  const cart = priceCart(input,catalog,type);
  const subtotal = amount(cart.reduce((sum,item)=>sum+item.total,0));
  if (source==="site" && subtotal<amount(store.minimum_order ?? 0)) throw new PublicError("O pedido não atingiu o valor mínimo da loja.");
  let customerId: string|null = null;
  const claimed = form.get("customer_id");
  if (source==="site") {
    const session = await customerSession(restaurantId);
    if (claimed && claimed!==session?.customer_id) throw new PublicError("Sua sessão expirou. Entre novamente.",401);
    customerId=session?.customer_id ?? null;
    // Por IP primeiro: só o teto da loja deixava um script esgotar o bucket e
    // bloquear todos os clientes reais com 429.
    const forwarded = process.env.VERCEL ? (await headers()).get("x-vercel-forwarded-for")?.split(",")[0]?.trim() : null;
    // 20/10min: operadoras móveis compartilham IP (CGNAT) entre muitos clientes.
    await rateLimit("checkout-ip",`${restaurantId}:${forwarded ?? "local"}`,20,600);
    await rateLimit("checkout-store",restaurantId,120,60);
    if (customerId) await rateLimit("checkout-customer",customerId,10,600);
  } else if (claimed) {
    const {data} = await service.from("customers").select("id").eq("id",uuid(claimed)).eq("restaurant_id",restaurantId).maybeSingle();
    if (!data) throw new PublicError("Cliente inválido.");
    customerId=data.id;
  } else {
    customerId=await ensurePdvCustomer(service,restaurantId,form);
  }
  let deliveryFee=type==="delivery" ? money(form,"delivery_fee") : 0;
  let deliveryAddress=boundedText(form.get("delivery_address"),1000) || null;
  if (source==="site" && type==="delivery") {
    const address=shippingAddress(Object.fromEntries(form));
    deliveryAddress=addressText(address);
    const {data:rules,error:rulesError}=await service.from("delivery_fee_rules").select("*").eq("restaurant_id",restaurantId).eq("active",true);
    if (rulesError && !isMissingRelationError(rulesError)) throw new PublicError("Frete temporariamente indisponível.",503);
    const quote=await shippingFee(store,(rules?.length ? rules : deliveryRulesFromRestaurant(store)) as DeliveryFeeRule[],address);
    if (deliveryFee!==quote.fee) throw new PublicError("O frete foi atualizado. Recalcule a entrega antes de confirmar.");
    deliveryFee=quote.fee;
  }
  // Public checkout has no server-validated coupon redemption yet.
  const discount=source==="site" ? 0 : money(form,"discount");
  if (discount>subtotal) throw new PublicError("Desconto maior que o subtotal.");
  const order = {
    restaurant_id:restaurantId,customer_id:customerId,code:randomBytes(24).toString("hex"),source,type,payment_status:source==="pdv" ? "paid" : "pending",payment_method:payment,
    subtotal,delivery_fee:deliveryFee,discount,total:amount(subtotal+deliveryFee-discount),
    customer_name:boundedText(form.get("customer_name"),120,source==="site") || "Cliente balcão",
    customer_phone:boundedText(form.get("customer_phone"),25,source==="site") || null,
    delivery_address:deliveryAddress,notes:boundedText(form.get("customer_notes") ?? form.get("notes"),1000) || null,
    change_for:boundedText(form.get("change_for"),20) ? money(form,"change_for") : null,
  };
  const items=cart.map(item=>({ product_id:item.id,product_name:item.name,quantity:item.quantity,unit_price:item.price,total_price:item.total,notes:item.notes,
    selected_options:{variantId:item.variantId,flavorCount:item.flavorCount,flavors:item.flavors,dough:item.dough,crust:item.crust,addons:item.addons,changeFor:order.change_for},addons:item.addons }));
  const {data:id,error:saveError}=await service.rpc("save_order_atomic",{order_data:order,item_data:items,existing_id:existingId ? uuid(existingId) : null});
  if (saveError || !id) {
    if (/Order unavailable for edit/.test(saveError?.message ?? "")) throw new PublicError("Pedidos importados de integrações (iFood) não podem ser editados pelo PDV.",409);
    throw new PublicError("Não foi possível salvar o pedido. Nenhum item foi confirmado.",503);
  }
  // Na edição a RPC não troca o code do pedido; devolver o gerado aqui apontaria para um /pedido/<code> inexistente.
  return { id:String(id),code:existingId ? null : order.code,slug:store.slug };
}

// O PDV cadastra o cliente a partir de nome + telefone (comportamento de antes do refactor):
// procura pelo telefone dentro do restaurante e atualiza só o que foi informado, ou insere.
// Só o balcão faz isso — no site a conta é criada pelo consumidor em /api/customer-auth/register.
async function ensurePdvCustomer(service: ReturnType<typeof createServiceClient>, restaurantId: string, form: FormData) {
  const name=boundedText(form.get("customer_name"),120);
  const phone=boundedText(form.get("customer_phone"),25);
  if (!name || !phone) return null;
  const field=(key: string, max: number) => boundedText(form.get(key),max) || null;
  const birth=field("customer_birth_date",10);
  const payload: Record<string,string|null> = {
    restaurant_id:restaurantId,name,phone,whatsapp:phone.replace(/\D/g,"") || phone,
    email:field("customer_email",160)?.toLowerCase() ?? null,cpf:field("customer_cpf",20),birth_date:birth && /^\d{4}-\d{2}-\d{2}$/.test(birth) ? birth : null,
    address:field("street",200),address_number:field("address_number",20),neighborhood:field("neighborhood",120),complement:field("complement",120),
    reference:field("reference",200),city:field("city",120),state:field("state",40),zip_code:field("zip_code",12),notes:field("customer_notes",1000),
  };
  const {data:existing,error:lookupError}=await service.from("customers").select("id").eq("restaurant_id",restaurantId).eq("phone",phone).maybeSingle();
  if (lookupError) throw new PublicError("Não foi possível consultar o cliente.",503);
  const save=(data: Record<string,string|null>) => existing?.id
    ? service.from("customers").update(data).eq("id",existing.id).eq("restaurant_id",restaurantId).select("id").single()
    : service.from("customers").insert(data).select("id").single();
  const patch=existing?.id ? Object.fromEntries(Object.entries(payload).filter(([,value])=>value!==null)) : payload;
  let saved=await save(patch);
  // E-mail já usado por outro cliente da loja (índice único): salva sem o e-mail em vez de perder o pedido.
  if (saved.error?.code==="23505" && patch.email) saved=await save({ ...patch,email:null });
  if (saved.error || !saved.data) throw new PublicError("Não foi possível salvar os dados do cliente.",503);
  return saved.data.id as string;
}
