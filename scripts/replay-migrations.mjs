// Replay de schema.sql + todas as migrations num Postgres em memória (PGlite),
// com stubs do Supabase (auth.uid/role, papéis anon/authenticated/service_role,
// auth.users, storage). Uso: node scripts/replay-migrations.mjs [arquivo-alvo]
// Para na primeira instrução do alvo que falhar e mostra qual — serve para
// validar uma migration antes de colar no SQL Editor.
import { readFileSync, readdirSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";

// Divide SQL em instruções respeitando $tag$...$tag$, aspas simples e comentários --.
function split(sql) {
  const out = []; let buf = "", i = 0, tag = null, inStr = false;
  while (i < sql.length) {
    const ch = sql[i];
    if (tag) { if (sql.startsWith(tag, i)) { buf += tag; i += tag.length; tag = null; continue; } buf += ch; i++; continue; }
    if (inStr) { buf += ch; if (ch === "'" && sql[i+1] === "'") { buf += "'"; i += 2; continue; } if (ch === "'") inStr = false; i++; continue; }
    if (ch === "-" && sql[i+1] === "-") { const nl = sql.indexOf("\n", i); const end = nl < 0 ? sql.length : nl; buf += sql.slice(i, end); i = end; continue; }
    if (ch === "$") { const m = sql.slice(i).match(/^\$[A-Za-z_]*\$/); if (m) { tag = m[0]; buf += tag; i += tag.length; continue; } }
    if (ch === "'") { inStr = true; buf += ch; i++; continue; }
    if (ch === ";") { if (buf.trim()) out.push(buf.trim()); buf = ""; i++; continue; }
    buf += ch; i++;
  }
  if (buf.trim()) out.push(buf.trim());
  return out;
}

let ext = {};
try { const m = await import("@electric-sql/pglite/contrib/pgcrypto"); ext = { pgcrypto: m.pgcrypto }; console.log("pgcrypto: contrib carregado"); } catch { console.log("pgcrypto: contrib indisponível (gen_random_uuid é nativo, segue)"); }
const db = new PGlite({ extensions: ext });
const stubs = [
  "create role anon nologin", "create role authenticated nologin", "create role service_role nologin",
  "create role postgres superuser", "create role supabase_admin superuser", "create role supabase_auth_admin nologin", "create role authenticator nologin", "create role dashboard_user nologin",
  "create schema if not exists auth", "create schema if not exists extensions", "create schema if not exists storage",
  "create table if not exists auth.users (id uuid primary key default gen_random_uuid(), email text, phone text, raw_user_meta_data jsonb default '{}', raw_app_meta_data jsonb default '{}', created_at timestamptz default now(), updated_at timestamptz default now(), last_sign_in_at timestamptz)",
  "create table if not exists storage.buckets (id text primary key, name text, public boolean default false)",
  "create table if not exists storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text, owner uuid, metadata jsonb)",
  "create or replace function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$",
  "create or replace function auth.role() returns text language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), 'anon') $$",
  "create or replace function auth.jwt() returns jsonb language sql stable as $$ select '{}'::jsonb $$",
];
for (const s of stubs) { try { await db.exec(s); } catch (e) { console.log("stub falhou:", s.slice(0,40), "->", e.message.slice(0,80)); } }

const target = process.argv[2] ?? readdirSync("supabase/migrations").filter(f=>f.endsWith(".sql")).sort().at(-1);
console.log("alvo:", target);
const base = ["../schema.sql", ...readdirSync("supabase/migrations").filter(f => f.endsWith(".sql") && f !== target).sort()];
let baseOk = 0, baseFail = 0; const grouped = new Map();
for (const f of base) {
  const path = f.startsWith("../") ? "supabase/schema.sql" : `supabase/migrations/${f}`;
  for (const st of split(readFileSync(path, "utf8"))) {
    try { await db.exec(st); baseOk++; }
    catch (e) { baseFail++; if (baseErrors.length < 12) baseErrors.push(`${f.slice(0,32)}: ${e.message.slice(0,90)}  <<  ${st.slice(0,60).replace(/\s+/g," ")}`); }
  }
}
console.log(`BASE: ${baseOk} instruções ok, ${baseFail} falharam (esperado: itens exclusivos do Supabase)`);
for (const [k, g] of [...grouped.entries()].sort((a,b)=>b[1].n-a[1].n)) console.log(`   · ${String(g.n).padStart(3)}x  ${k}   ex: ${g.ex}`);

console.log("\n=== MIGRATION NOVA (para na primeira falha) ===");
const stmts = split(readFileSync(`supabase/migrations/${target}`, "utf8"));
let n = 0;
for (const st of stmts) {
  n++;
  try { await db.exec(st); }
  catch (e) {
    console.log(`FALHOU na instrução #${n} de ${stmts.length}:`);
    console.log("   erro:", e.message);
    console.log("   sql :", st.slice(0, 400).replace(/\s+/g, " "));
    process.exit(2);
  }
}
console.log(`OK: todas as ${stmts.length} instruções executaram.`);
const pol = await db.query("select count(*)::int as n from pg_policies where policyname like 'security_%'");
const fn = await db.query("select proname from pg_proc where proname in ('save_order_atomic','consume_security_rate_limit','cleanup_security_data','guard_tenant_links','owns_restaurant') order by 1");
const rl = await db.query("select public.consume_security_rate_limit($1, 3, 60) as ok", ["a".repeat(64)]);
console.log("políticas security_*:", pol.rows[0].n, "| funções:", fn.rows.map(r=>r.proname).join(", "), "| rate limit responde:", rl.rows[0].ok);
