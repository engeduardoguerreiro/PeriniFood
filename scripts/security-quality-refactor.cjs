const fs=require('node:fs');
function edit(file,fn){fs.writeFileSync(file,fn(fs.readFileSync(file,'utf8')));}
edit('src/app/actions.ts',s=>s.replace('isRestaurantOpen, openingHourDays','openingHourDays').replace('return rules.map(({ removed, ...rule }) => rule);','return rules.map((entry) => ({ name: entry.name, restaurant_id: entry.restaurant_id, min_km: entry.min_km, max_km: entry.max_km, fee: entry.fee, free_delivery: entry.free_delivery, active: entry.active }));').replace('const returnTo = text(formData, "return_to", fallbackPath);','const requested = text(formData, "return_to", fallbackPath);\n  const returnTo = requested.startsWith("/") && !requested.startsWith("//") && !requested.includes("\\\\") ? requested : fallbackPath;'));
edit('src/app/admin/page.tsx',s=>s.replace('Date.now()', 'new Date().getTime()'));
edit('src/app/admin/relatorios/page.tsx',s=>s.replace('monthLabel, ','').replace(', monthLabel',''));
edit('src/app/dashboard/products/product-form.tsx',s=>{
  s=s.replace('/* eslint-disable @next/next/no-img-element */','').replace('useEffect, ','');
  const a=s.indexOf('  useEffect(() => {'),b=s.indexOf('\n  function updateSizeRow',a);
  s=s.slice(0,a)+s.slice(b);
  return s.replace('() => isPizza ? buildSizeRows() : []','() => buildSizeRows()');
});
edit('src/components/public-customer-account.tsx',s=>{
  s=s.replace('useEffect,','useCallback, useEffect,');
  const a=s.indexOf('  useEffect(() => {'),b=s.indexOf('\n  function fillDraft',a);
  const effect=s.slice(a,b).replace('[restaurant.id, restaurant.slug]','[restaurant.id, restaurant.slug, saveProfile]');
  s=s.slice(0,a)+s.slice(b);
  s=s.replace('  function fillDraft(customer: CustomerProfile) {','  const fillDraft = useCallback((customer: CustomerProfile) => {').replace('  function saveProfile(customer: CustomerProfile) {','  const saveProfile = useCallback((customer: CustomerProfile) => {');
  s=s.replace('  }\n\n  const saveProfile', '  }, []);\n\n  const saveProfile');
  s=s.replace('    fillDraft(customer);\n  }','    fillDraft(customer);\n  }, [fillDraft]);\n\n'+effect);
  s=s.replace(/\s*<input[^\n]*placeholder="CPF"[^\n]*\/>/g,'').replace(/\s*<input[^\n]*type="date"[^\n]*draft.birthDate[^\n]*\/>/g,'');
  s=s.replace('type="password" placeholder="Senha"','type="password" autoComplete={mode === "register" ? "new-password" : "current-password"} minLength={mode === "register" ? 12 : undefined} maxLength={128} placeholder={mode === "register" ? "Senha com pelo menos 12 caracteres" : "Senha"}');
  return s;
});
edit('src/components/public-checkout.tsx',s=>{
  const a=s.indexOf('function deliveryRuleLabel'),b=s.indexOf('export function PublicCheckout',a);
  if(a>=0)s=s.slice(0,a)+s.slice(b);
  return s;
});
edit('src/components/public-menu-order.tsx',s=>s.replace('  deliveryRules,\n',''));
edit('src/components/manual-order-builder.tsx',s=>{
  s=s.replace('useEffect,','useEffectEvent, useEffect,');
  s=s.replace('    if (queryTerm.length < 2) {\n      setCustomerMatches([]);\n      setShowCustomerMatches(false);\n      setCustomerLookupStatus("");\n      return;\n    }','');
  s=s.replace('    const timer = window.setTimeout(async () => {\n      setCustomerLookupStatus', '    const timer = window.setTimeout(async () => {\n      if (queryTerm.length < 2) { setCustomerMatches([]); setShowCustomerMatches(false); setCustomerLookupStatus(""); return; }\n      setCustomerLookupStatus');
  s=s.replace('  useEffect(() => {\n    if (orderType !== "delivery"', '  const calculateCurrentDelivery = useEffectEvent(() => calculateDeliveryRule(address, "Endereço completo."));\n  useEffect(() => {\n    if (orderType !== "delivery"');
  s=s.replace('void calculateDeliveryRule(address, "Endereço completo.");','void calculateCurrentDelivery();');
  return s;
});
edit('src/components/printer-agent-indicator.tsx',s=>s.replace('    void check();\n    const interval', '    const initial = window.setTimeout(() => void check(), 0);\n    const interval').replace('return () => window.clearInterval(interval);','return () => { window.clearTimeout(initial); window.clearInterval(interval); };'));
edit('src/components/printer-discovery.tsx',s=>{
  s=s.replace('useEffect,','useEffectEvent, useEffect,');
  s=s.replace('  useEffect(() => {\n    void loadPrinters();','  const initialize = useEffectEvent(loadPrinters);\n  const pollStatus = useEffectEvent(loadStatus);\n  useEffect(() => {\n    const initial = window.setTimeout(() => void initialize(), 0);');
  s=s.replace('void loadStatus().catch(() => setOnline(false));','void pollStatus().catch(() => setOnline(false));').replace('return () => window.clearInterval(interval);','return () => { window.clearTimeout(initial); window.clearInterval(interval); };');
  return s;
});
edit('src/components/order-print-client.tsx',s=>{
  s=s.replace('useEffect,','useEffectEvent, useEffect,');
  s=s.replace('  useEffect(() => {\n    if (printedRef.current)', '  const startPrint = useEffectEvent(() => {\n    if (printedRef.current)');
  s=s.replace('  }, []);\n\n  if (auto)', '  });\n  useEffect(() => {\n    const initial = window.setTimeout(() => startPrint(), 0);\n    return () => window.clearTimeout(initial);\n  }, []);\n\n  if (auto)');
  return s;
});
edit('src/components/integrations/integration-ui.tsx',s=>{
  s=s.replace('type IntegrationRecord = Record<string, any>;',`export type IntegrationRecord = Record<string, unknown> & {
    id?:string;provider?:string;status?:string;is_enabled?:boolean;enabled?:boolean;name?:string;price?:number;created_at?:string;
    event_type?:string;error_message?:string;message?:string;external_product_id?:string;external_product_name?:string;
    external_payment_code?:string;external_payment_name?:string;internal_payment_method?:string;
    credentials?:Record<string,unknown>;settings?:Record<string,unknown>;config?:Record<string,unknown>;
  };`);
  const a=s.indexOf('function valueFromIntegration'),b=s.indexOf('\nexport function MarketplaceIntegrationSettings',a);
  s=s.slice(0,a)+`function valueFromIntegration(integration: IntegrationRecord | null, key:string, fallback:boolean):boolean;
function valueFromIntegration(integration: IntegrationRecord | null, key:string, fallback?:string):string;
function valueFromIntegration(integration: IntegrationRecord | null, key:string, fallback:string|boolean="") {
  if (!integration) return fallback;
  const snake=key.replace(/[A-Z]/g,letter=>"_"+letter.toLowerCase());
  const value=integration[snake] ?? integration[key] ?? integration.credentials?.[key] ?? integration.settings?.[key] ?? integration.config?.[key] ?? fallback;
  return typeof fallback === "boolean" ? value === true || value === "true" : String(value);
}
`+s.slice(b);
  return s;
});
edit('src/app/integracoes/[provider]/page.tsx',s=>{
  s=s.replace('import { MarketplaceIntegrationSettings }','import { MarketplaceIntegrationSettings, type IntegrationRecord }');
  const a=s.indexOf('async function safeSelect'),b=s.indexOf('\nexport default',a);
  s=s.slice(0,a)+`async function safeRows(query: PromiseLike<{data:IntegrationRecord[]|null;error:unknown}>) {
    const result=await query; return result.error ? [] : result.data ?? [];
  }
`+s.slice(b);
  s=s.replace('providers.includes(provider as any)','providers.some(value=>value===provider)').replace('integration.id ??','integration?.id ??');
  s=s.replace(/safeSelect\(supabase, "([a-z_]+)", \(from\) => from/g,'safeRows(supabase.from("$1")');
  s=s.replace('if (role === "kitchen")','if (!isAdminRole(role))');
  return s;
});
edit('prisma/seed.mjs',s=>s.replace('const password = process.env.SEED_ADMIN_PASSWORD || "Forno@2026";','const password = process.env.SEED_ADMIN_PASSWORD;\n  if (!password || password.length < 12) throw new Error("Defina SEED_ADMIN_PASSWORD com pelo menos 12 caracteres.");').replace(' / senha ${password}',''));
