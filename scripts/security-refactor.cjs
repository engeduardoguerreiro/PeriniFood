const fs = require('node:fs');
const path = require('node:path');
function edit(file, transform) { const old = fs.readFileSync(file, 'utf8'); const next = transform(old); if (next !== old) fs.writeFileSync(file, next); }
function walk(dir) { return fs.readdirSync(dir, {withFileTypes:true}).flatMap(e => e.isDirectory() ? walk(path.join(dir,e.name)) : [path.join(dir,e.name)]); }

// Public catalog uses a server-only service client and explicit output DTOs.
for (const file of ['src/app/cardapio/[slug]/page.tsx','src/app/cardapio/[slug]/checkout/page.tsx','src/app/cardapio/[slug]/conta/page.tsx','src/app/api/menu/[slug]/route.ts']) {
  edit(file, s => {
    s = s.replace('import { createClient } from "@/lib/supabase/server";', 'import { createServiceClient } from "@/lib/supabase/service";\nimport { publicRestaurant, PUBLIC_PRODUCT_FIELDS } from "@/lib/public-data";');
    s = s.replace('await createClient()', 'createServiceClient()');
    s = s.replace('restaurant: publicRestaurant', 'restaurant: publicRestaurant');
    s = s.replace('const current = restaurant as Restaurant | null;', 'const current = restaurant ? publicRestaurant(restaurant as Restaurant) : null;');
    s = s.replace('const current = restaurant as Restaurant;', 'const current = publicRestaurant(restaurant as Restaurant);');
    s = s.replace('restaurant={restaurant as Restaurant}', 'restaurant={publicRestaurant(restaurant as Restaurant)}');
    s = s.replace('from("products").select("*")', 'from("products").select(PUBLIC_PRODUCT_FIELDS)');
    s = s.replace('const publicRestaurant = { ...current, is_open: storeOpen };', 'const storefront = { ...current, is_open: storeOpen };').replace('restaurant={publicRestaurant}', 'restaurant={storefront}');
    const tenant = file.endsWith('/page.tsx') && !file.includes('/checkout/') && !file.includes('/conta/') ? 'current.id' : 'restaurant.id';
    s = s.replace('from("product_variants").select("*").eq("active", true)', `from("product_variants").select("*, products!inner(restaurant_id)").eq("products.restaurant_id", ${tenant}).eq("active", true)`);
    if (file.includes('/api/')) {
      s = s.replace('import { NextResponse }', 'import type { Restaurant } from "@/lib/types";\nimport { NextResponse }');
      s = s.replace('error: error?.message ?? "Restaurante não encontrado"', 'error: "Restaurante não encontrado"');
      s = s.replace('{ ok: true, restaurant, categories, products, addons, variants, options }', '{ ok: true, restaurant: publicRestaurant(restaurant as Restaurant), categories, products, addons, variants, options }');
    }
    if (!s.includes('.select(PUBLIC_PRODUCT_FIELDS)')) s = s.replace(', PUBLIC_PRODUCT_FIELDS', '');
    return s;
  });
}

// No consumer identity/profile is trusted or retained in localStorage.
edit('src/components/public-customer-account.tsx', s => {
  const start = s.indexOf('  useEffect(() => {');
  const end = s.indexOf('\n  function fillDraft', start);
  s = s.slice(0,start) + `  useEffect(() => {
    window.localStorage.removeItem(accountStorageKey(restaurant.slug));
    const controller = new AbortController();
    fetch('/api/customer-auth/profile?restaurantId=' + restaurant.id, { signal: controller.signal })
      .then(async response => response.ok ? response.json() : null)
      .then(data => { if (data?.ok) { setAccount(data); saveProfile(data.customer); } })
      .catch(() => {});
    return () => controller.abort();
  }, [restaurant.id, restaurant.slug]);
` + s.slice(end);
  s = s.replace('function saveProfile(customer: CustomerProfile, persist = true)', 'function saveProfile(customer: CustomerProfile)');
  s = s.replace('    if (persist) window.localStorage.setItem(accountStorageKey(restaurant.slug), JSON.stringify(customer));\n','');
  s = s.replace(/function logout\(\) \{/, 'async function logout() {\n    const response = await fetch("/api/customer-auth/logout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ restaurantId: restaurant.id }) });\n    if (!response.ok) { setStatus("Não foi possível sair. Tente novamente."); return; }');
  // Login identifiers cannot be changed without email verification.
  s = s.replaceAll('placeholder="E-mail" value={draft.email}', 'placeholder="E-mail" readOnly={Boolean(profile)} value={draft.email}');
  return s;
});
edit('src/components/public-checkout.tsx', s => {
  const start = s.indexOf('  useEffect(() => {');
  const end = s.indexOf('\n  function applyCustomerProfile', start);
  s = s.slice(0,start) + `  useEffect(() => {
    window.localStorage.removeItem('gastroflow_customer_' + restaurant.slug);
    const controller = new AbortController();
    Promise.resolve().then(() => {
      try { const saved = window.sessionStorage.getItem('gastroflow_cart_' + restaurant.slug); if (saved) setCart(JSON.parse(saved)); } catch { window.sessionStorage.removeItem('gastroflow_cart_' + restaurant.slug); }
    });
    fetch('/api/customer-auth/profile?restaurantId=' + restaurant.id, { signal: controller.signal })
      .then(async response => response.ok ? response.json() : null)
      .then(data => { if (data?.ok) applyCustomerProfile(data.customer); }).catch(() => {});
    return () => controller.abort();
  }, [restaurant.id, restaurant.slug]);
` + s.slice(end);
  s = s.replace('function applyCustomerProfile(customer: CustomerProfile, persist = true)', 'function applyCustomerProfile(customer: CustomerProfile)');
  s = s.replace('    if (persist) window.localStorage.setItem(`gastroflow_customer_${restaurant.slug}`, JSON.stringify(customer));\n', '');
  const sub = s.indexOf('        onSubmit={() => {');
  const subEnd = s.indexOf('        className=',sub);
  if (sub >= 0) s = s.slice(0,sub)+s.slice(subEnd);
  s = s.replace(/\s*<input[^\n]*name="customer_cpf"[^\n]*\/>/g,'').replace(/\s*<input[^\n]*name="customer_birth_date"[^\n]*\/>/g,'');
  return s;
});
edit('src/components/public-menu-order.tsx', s => {
  const start = s.indexOf('  useEffect(() => {');
  const end = s.indexOf('\n  function isPizzaProduct',start);
  s = s.slice(0,start)+`  useEffect(() => {
    window.localStorage.removeItem('gastroflow_customer_' + restaurant.slug);
    const controller = new AbortController();
    fetch('/api/customer-auth/profile?restaurantId=' + restaurant.id, { signal: controller.signal })
      .then(async response => response.ok ? response.json() : null)
      .then(data => { if (data?.ok) setCustomerName(data.customer.name); }).catch(() => {});
    return () => controller.abort();
  }, [restaurant.id, restaurant.slug]);
`+s.slice(end);
  return s;
});

for (const file of walk('src').filter(f=>/\.(ts|tsx)$/.test(f))) {
  edit(file,s=> {
    if (/\.from\("customers"\)\s*\.select\("\*"/.test(s)) {
      s='import { CUSTOMER_FIELDS } from "@/lib/public-data";\n'+s;
      s=s.replace(/(\.from\("customers"\)\s*\.select\()"\*"/g,'$1CUSTOMER_FIELDS');
    }
    return s;
  });
}
edit('src/app/api/customers/route.ts',s=>s.replace('}).select("*").single()', '}).select(CUSTOMER_FIELDS).single()'));
edit('src/app/actions.ts', s=>s.replace('import { hashCustomerPassword } from "@/lib/customer-auth";\n','').replace('  const newPassword = text(formData, "new_password");\n','').replace('  if (newPassword) payload.password_hash = hashCustomerPassword(newPassword);\n',''));
edit('src/app/clientes/[id]/page.tsx', s=>s.replace(/<input[^\n]*name="new_password"[^\n]*\/>/,'<p className="text-sm">A senha é pessoal. Alterações devem ser feitas pelo titular da conta.</p>'));
edit('src/lib/supabase/service.ts',s=>'import "server-only";\n'+s);
edit('src/lib/api-helpers.ts',s=>s.replace('import type { Restaurant }', 'import { getAccessState } from "@/lib/platform-billing";\nimport { headers } from "next/headers";\nimport type { Restaurant }').replace('  return { context:', `  const origin = (await headers()).get("origin");
  const host = (await headers()).get("host");
  if (origin && new URL(origin).host !== host) return { error: NextResponse.json({ ok: false, error: "Origem inválida" }, { status: 403 }) };
  const access = await getAccessState(context.restaurant.id);
  if (access.blocked) return { error: NextResponse.json({ ok: false, error: "Acesso suspenso ou indisponível" }, { status: 403 }) };
  return { context:`));
edit('src/lib/platform-billing.ts',s=>s.replace('if (error || !data) return { blocked: false,', 'if (error || !data) return { blocked: Boolean(error),'));
edit('src/lib/opening-hours.ts',s=>s.replaceAll('if (!day.active','if (!day?.active'));
edit('src/app/dashboard/cash-register/page.tsx',s=>s.replaceAll('data.status','data?.status').replaceAll('data.opening_amount','data?.opening_amount'));
edit('eslint.config.mjs',s=>s.replace('    "next-env.d.ts",','    "next-env.d.ts",\n    "dist/**",\n    "dist-desktop/**",').replace('  // Override default ignores', '  { files: ["**/*.cjs", "scripts/**/*.js"], rules: { "@typescript-eslint/no-require-imports": "off" } },\n  // Override default ignores'));
