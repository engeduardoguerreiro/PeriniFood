const fs=require('node:fs');
function edit(file,fn){fs.writeFileSync(file,fn(fs.readFileSync(file,'utf8')));}
edit('src/app/actions.ts',s=>{
  s=s.replace('import { randomUUID }','import { saveValidatedOrder } from "@/lib/order-service";\nimport { PublicError, boundedText } from "@/lib/security";\nimport { randomUUID }');
  const a=s.indexOf('type CartPayload ='); const b=s.indexOf('export async function saveCustomer',a);
  s=s.slice(0,a)+`export async function createPdvOrder(formData: FormData) {
  const { restaurant, role } = await requireRestaurant();
  if (role === "kitchen") throw new Error("Operação não permitida.");
  const { id } = await saveValidatedOrder(formData, restaurant.id, "pdv");
  revalidatePath("/pedidos");
  revalidatePath("/dashboard/orders");
  if (text(formData, "intent") === "print") redirect('/pedidos/' + id + '/print?auto=1');
  redirect("/pedidos");
}

export async function updatePdvOrder(formData: FormData) {
  const { restaurant, role } = await requireRestaurant();
  if (role === "kitchen") throw new Error("Operação não permitida.");
  const { id } = await saveValidatedOrder(formData, restaurant.id, "pdv", text(formData, "order_id"));
  revalidatePath("/pedidos");
  revalidatePath("/dashboard/orders");
  revalidatePath('/pedidos/' + id);
  if (text(formData, "intent") === "print") redirect('/pedidos/' + id + '/print?auto=1');
  redirect('/pedidos/' + id);
}

export async function createOnlineOrder(formData: FormData) { return createPublicOrder(formData); }

export async function createPublicOrder(formData: FormData) {
  let destination: string;
  try {
    const order = await saveValidatedOrder(formData, text(formData, "restaurant_id"), "site");
    destination = '/pedido/' + order.code;
  } catch (error) {
    const slug = encodeURIComponent(boundedText(formData.get("slug"),100,true));
    const message = error instanceof PublicError ? error.message : "Não foi possível finalizar. Tente novamente.";
    destination = '/cardapio/' + slug + '/checkout?error=' + encodeURIComponent(message);
  }
  redirect(destination);
}

`+s.slice(b);
  const c=s.indexOf('async function ensureCustomerForOrder'); const d=s.indexOf('async function saveProductRecord',c);
  if(c>=0) s=s.slice(0,c)+s.slice(d);
  s=s.replace('function orderCodeValue() {\n  return Math.random().toString(36).slice(2, 8).toUpperCase();\n}\n','');
  return s;
});
edit('src/app/pedido/[codigo]/page.tsx',s=>s.replace('import { StatusBadge }','import { notFound } from "next/navigation";\nimport { StatusBadge }').replace('  const supabase = createServiceClient();','  if (!/^[a-f0-9]{48}$/.test(codigo)) notFound();\n  const supabase = createServiceClient();').replace('.select("*")\n    .or(`code.eq.${codigo},order_number.eq.${Number(codigo) || -1}`)', '.select("id,code,order_number,status,type,total")\n    .eq("code", codigo)').replace('.from("order_items").select("*")','.from("order_items").select("id,product_name,quantity,total_price")').replace('const current = order as Order;', 'const current = order as Order;'));
edit('src/app/cardapio/[slug]/checkout/page.tsx',s=>s.replace('export default async function CheckoutPage({ params }: { params: Promise<{ slug: string }> }) {','export default async function CheckoutPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ error?: string }> }) {').replace('  return <PublicCheckout', '  const { error: checkoutError } = await searchParams;\n  return <PublicCheckout checkoutError={checkoutError}'));
edit('src/components/public-checkout.tsx',s=>{
  const a=s.indexOf('function onlyDigits'); const b=s.indexOf('export function PublicCheckout',a);
  s=s.slice(0,a)+s.slice(b);
  s=s.replace('PublicCheckout({ restaurant, deliveryRules }: { restaurant: Restaurant; deliveryRules: DeliveryFeeRule[] })','PublicCheckout({ restaurant, deliveryRules, checkoutError }: { restaurant: Restaurant; deliveryRules: DeliveryFeeRule[]; checkoutError?: string })');
  s=s.replace('useEffect, useMemo, useState','useCallback, useEffect, useMemo, useState');
  const c=s.indexOf('  async function calculateDeliveryRule'); const d=s.indexOf('\n  useEffect(',c);
  s=s.slice(0,c)+`  const calculateDeliveryRule = useCallback(async (nextAddress: Address, messagePrefix = "Endereço informado.") => {
    setDeliveryCalculating(true);
    try {
      const response = await fetch("/api/shipping/quote", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({restaurantId:restaurant.id,address:nextAddress}) });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.message ?? "Não foi possível calcular o frete.");
      setDeliveryRuleId(data.ruleId);
      setAddressStatus(messagePrefix + " Frete calculado: " + money(data.fee));
    } catch (error) { setAddressStatus(error instanceof Error ? error.message : "Não foi possível calcular o frete."); }
    finally { setDeliveryCalculating(false); }
  }, [restaurant.id]);
`+s.slice(d);
  s=s.replace('[address.street, address.number, address.neighborhood, address.city, address.state, address.cep, type, addressIsComplete]','[address, type, addressIsComplete, calculateDeliveryRule]');
  s=s.replace('      {!restaurant.is_open && (','      {checkoutError && <p role="alert" className="mx-auto mb-5 max-w-[1280px] rounded-lg bg-red-50 p-4 text-red-700">{checkoutError}</p>}\n      {!restaurant.is_open && (');
  s=s.replace('        <input type="hidden" name="restaurant_id"', '        {Object.entries(address).map(([key,value]) => <input key={key} type="hidden" name={key} value={value} />)}\n        <input type="hidden" name="restaurant_id"');
  return s;
});
edit('src/app/api/orders/[id]/route.ts',s=>s.replace('supabase.from("orders").update(body)', 'supabase.from("orders").update({ notes: typeof body.notes === "string" ? body.notes.slice(0,1000) : null })'));
edit('next.config.ts',s=>s.replace('  async redirects() {', `  async headers() {
    return [{ source: "/:path*", headers: [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "no-referrer" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
      { key: "Content-Security-Policy", value: "object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'" },
    ] }, { source: "/pedido/:path*", headers: [{ key: "Cache-Control", value: "private, no-store" }, { key: "X-Robots-Tag", value: "noindex, nofollow" }] },
    { source: "/api/customer-auth/:path*", headers: [{ key: "Cache-Control", value: "private, no-store" }] }];
  },
  async redirects() {`));
