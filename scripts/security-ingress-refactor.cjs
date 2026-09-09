const fs=require('node:fs');
function edit(file,fn){fs.writeFileSync(file,fn(fs.readFileSync(file,'utf8')));}
edit('src/app/api/integrations/webhook/[provider]/route.ts',()=>`import { privateJson } from "@/lib/security";

// Legacy unauthenticated ingestion retired. Configured integrations use the
// authenticated /api/integrations/[provider]/webhook contract.
export async function POST() {
  return privateJson({ ok:false, message:"Endpoint desativado. Configure o webhook autenticado." },410);
}
`);
for(const file of ['src/app/api/integrations/ifood/poll/route.ts','src/app/api/integrations/ifood/catalog/push/route.ts','src/app/api/integrations/ifood/catalog/push-pizzas/route.ts']){
  edit(file,s=>{
    s='import { requireIntegrationToken } from "@/lib/integrations/ingress";\n'+s;
    const a=s.indexOf('  const secret = process.env.IFOOD_POLL_SECRET;');
    const b=s.indexOf('  try {',a);
    return s.slice(0,a)+'  const denied = requireIntegrationToken(request, process.env.IFOOD_POLL_SECRET);\n  if (denied) return denied;\n'+s.slice(b);
  });
}
edit('src/app/api/integrations/webhook/ifood/route.ts',s=>'import { requireIntegrationToken } from "@/lib/integrations/ingress";\n'+s.replace('  let events: IFoodEvent[] = [];','  const denied = requireIntegrationToken(request, process.env.IFOOD_WEBHOOK_SECRET);\n  if (denied) return denied;\n  let events: IFoodEvent[] = [];'));
edit('src/app/api/keep-alive/route.ts',s=>{
  s='import { requireIntegrationToken } from "@/lib/integrations/ingress";\n'+s;
  const a=s.indexOf('  const secret = process.env.CRON_SECRET;'),b=s.indexOf('  try {',a);
  s=s.slice(0,a)+'  const denied = requireIntegrationToken(request, process.env.CRON_SECRET);\n  if (denied) return denied;\n'+s.slice(b);
  return s.replace('    if (error) throw error;','    if (error) throw error;\n    const cleanup = await supabase.rpc("cleanup_security_data");\n    if (cleanup.error) throw cleanup.error;').replace('    const message = error instanceof Error ? error.message : "erro desconhecido";','    const message = "Serviço temporariamente indisponível";').replace('} catch (error) {','} catch {');
});
edit('src/lib/integrations/external-order.ts',s=>{
  s='import { secretMatches, PublicError, boundedText } from "@/lib/security";\n'+s;
  s=s.replace('  const data = payload as Record<string, any>;','  const data = record(payload);');
  for(const name of ['delivery','totals','customer'])s=s.replace('const '+name+' = data.'+name+' ?? {};','const '+name+' = record(data.'+name+');');
  s=s.replace('const address = delivery.address ?? {};','const address = record(delivery.address);');
  s=s.replace('const items = Array.isArray(data.items) ? data.items : [];','const items = Array.isArray(data.items) ? data.items.map(record) : [];\n  if (!items.length || items.length > 100) throw new PublicError("Itens inválidos.");');
  s=s.replace('items.map((entry: Record<string, any>) => {','items.map((entry) => {');
  s=s.replace('entry.addons.map((addon: Record<string, any>) => ({','entry.addons.map(record).map((addon) => ({');
  s=s.replace('items.reduce((sum: number, item: any)', 'items.reduce((sum: number, item)');
  s=s.replaceAll('(data.payment ?? {})','record(data.payment)');
  for(const field of ['street','number','neighborhood','complement','reference','city','state','zipCode'])s=s.replace('        '+field+': address.'+field+',','        '+field+': optionalText(address.'+field+'),');
  s=s.replace('status: record(data.payment).status,','status: optionalText(record(data.payment).status),').replace('notes: data.notes,','notes: optionalText(data.notes),');
  s=s.replace('export function normalizeGenericExternalOrder',`function record(value: unknown): Record<string, unknown> { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string,unknown> : {}; }
function optionalText(value: unknown) { return value == null ? undefined : boundedText(String(value),1000); }
export type IntegrationRecord = { id:string;restaurant_id:string;provider:string;external_store_id?:string;webhook_secret?:string;is_enabled?:boolean;enabled?:boolean;receive_orders?:boolean;credentials?:Record<string,unknown>;settings?:Record<string,unknown>;auto_accept_orders?:boolean };

export function normalizeGenericExternalOrder`);
  const a=s.indexOf('  const supabase = createServiceClient();',s.indexOf('export async function findIntegrationForPayload'));
  const b=s.indexOf('\nexport async function createOrderFromExternalPayload',a);
  s=s.slice(0,a)+`  if (!token || token.length < 32 || !normalized.externalStoreId) return null;
  const { data, error } = await createServiceClient().from("integrations").select("*")
    .eq("provider",provider).eq("external_store_id",normalized.externalStoreId).limit(2);
  if (error || data?.length !== 1) return null;
  const integration = data[0] as IntegrationRecord;
  if (!(integration.is_enabled ?? integration.enabled) || integration.receive_orders === false) return null;
  const secret=integration.webhook_secret ?? integration.credentials?.webhookSecret ?? integration.settings?.webhookSecret;
  return secretMatches(secret,token) ? integration : null;
}
`+s.slice(b);
  s=s.replace('integration: any','integration: IntegrationRecord');
  return s;
});
edit('src/lib/integrations/security.ts',s=>s.replace('`https://wa.me/${normalized}text=', '`https://wa.me/${normalized}?text=').replace('key.toLowerCase().includes("authorization") || key.toLowerCase().includes("secret")','/authorization|secret|cookie|token|api.key/i.test(key)'));
// The generic ingress only resolves strictly authenticated integrations. Input
// errors return generic responses, and the JSON body is bounded before parsing.
for(const file of ['src/app/api/integrations/[provider]/webhook/route.ts','src/app/api/integrations/custom-webhook/orders/route.ts'])edit(file,s=>{
  s='import { readObject, publicFailure } from "@/lib/security";\n'+s;
  s=s.replace('payload = await request.json();','payload = await readObject(request, 262144);');
  s=s.replace('  const normalized = normalizeGenericExternalOrder(', '  let normalized;\n  try { normalized = normalizeGenericExternalOrder(');
  s=s.replace('provider, payload);','provider, payload); } catch(error) { return publicFailure(error); }').replace('"webhook", payload);','"webhook", payload); } catch(error) { return publicFailure(error); }');
  return s;
});
edit('src/lib/platform-admin.ts',s=>s.replace('isAdmin: isPlatformAdminEmail(email)','isAdmin: Boolean(user?.email_confirmed_at) && isPlatformAdminEmail(email)'));
edit('src/app/api/customers/route.ts',s=>s.replace('const q = searchParams.get("q");','const q = (searchParams.get("q") ?? "").replace(/[^\\p{L}\\p{N} @+.-]/gu, "").slice(0,100);').replace('const { data, error } = await query;','const { data, error } = await query.limit(100);'));
