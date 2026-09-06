// Verificação pós-publicação da migration de segurança + código novo.
// Uso: node scripts/verify-security-migration.mjs [https://perinifood.com.br] [slug]
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const site = process.argv[2] ?? "https://perinifood.com.br";
const slug = process.argv[3] ?? "forno-nordestino";
const env = Object.fromEntries(readFileSync(".env.local","utf8").split("\n").filter(l=>l&&!l.trim().startsWith("#")&&l.includes("=")).map(l=>{const i=l.indexOf("=");return [l.slice(0,i).trim(), l.slice(i+1).trim().replace(/^["']|["']$/g,"")];}));
const service = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth:{persistSession:false} });
const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth:{persistSession:false} });
let falhas = 0;
const check = (ok, label, detail="") => { console.log(`  ${ok ? "ok   " : "FALHA"} ${label}${detail ? "  -> " + detail : ""}`); if (!ok) falhas++; };

console.log("=== banco ===");
check(!(await service.from("customer_sessions").select("token_hash").limit(1)).error, "tabela customer_sessions existe");
check(!(await service.from("security_rate_limits").select("key").limit(1)).error, "tabela security_rate_limits existe");
const rl = await service.rpc("consume_security_rate_limit", { bucket_key: "f".repeat(64), max_requests: 5, window_seconds: 5 });
check(!rl.error && rl.data === true, "rpc consume_security_rate_limit responde", rl.error?.message);
const so = await service.rpc("save_order_atomic", { order_data: {}, item_data: [] });
check(!!so.error && !/Could not find the function/.test(so.error.message), "rpc save_order_atomic existe (rejeita payload vazio)", so.error?.message.slice(0,60));
check(!!(await anon.from("products").select("id").limit(1)).error, "anon NAO lê products direto", "(revogado)");
check(!!(await anon.from("restaurants").select("id").limit(1)).error, "anon NAO lê restaurants direto", "(revogado)");
const { data: restaurant } = await service.from("restaurants").select("id").eq("slug", slug).maybeSingle();

console.log("=== site ===");
const get = async (path, init) => { const r = await fetch(site + path, { redirect: "manual", ...init }); return r; };
let r = await get(`/cardapio/${slug}`);            check(r.status === 200, "cardápio público 200", String(r.status));
r = await get(`/cardapio/${slug}/checkout`);       check(r.status === 200, "checkout 200", String(r.status));
r = await get(`/api/menu/${slug}`);                check(r.status === 200, "api/menu 200", String(r.status));
r = await get(`/pedidos`);                         check(r.status === 307, "painel protegido (307 sem login)", String(r.status));
r = await get(`/api/customer-auth/register`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
check(r.status === 403, "register sem Origin -> 403 (same-origin)", String(r.status));
r = await get(`/api/customer-auth/register`, { method: "POST", headers: { "content-type": "application/json", origin: site }, body: JSON.stringify({ restaurantId: restaurant?.id, email: "x", password: "curta", name: "a", phone: "1" }) });
check(r.status === 400 || r.status === 422, "register payload inválido -> 400 (validação, não 500)", String(r.status));
r = await get(`/api/customer-auth/profile?restaurantId=${restaurant?.id}`);
check(r.status === 401, "perfil sem sessão -> 401", String(r.status));
r = await get(`/pedido/ABC123`);
check((r.headers.get("x-robots-tag") ?? "").includes("noindex"), "acompanhamento com noindex", r.headers.get("x-robots-tag") ?? "(sem header)");
check((r.headers.get("x-frame-options") ?? "") === "DENY", "X-Frame-Options DENY", r.headers.get("x-frame-options") ?? "");
console.log(falhas ? `\n${falhas} verificação(ões) falharam` : "\nTudo certo.");
process.exit(falhas ? 1 : 0);
