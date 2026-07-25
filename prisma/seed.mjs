import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

function loadEnv() {
  const files = [".env.local", ".env"];
  for (const file of files) {
    const fullPath = path.join(process.cwd(), file);
    if (!fs.existsSync(fullPath)) continue;
    for (const line of fs.readFileSync(fullPath, "utf8").split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
      const index = trimmed.indexOf("=");
      const key = trimmed.slice(0, index);
      const value = trimmed.slice(index + 1).replace(/^['"]|['"]$/g, "");
      process.env[key] ||= value;
    }
  }
}

async function findUserByEmail(supabase, email) {
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const found = data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
    if (found) return found;
    if (data.users.length < 1000) return null;
  }
  return null;
}

async function main() {
  loadEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY para rodar o seed.");

  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const email = "contato@fornonordestino.com.br";
  const password = process.env.SEED_ADMIN_PASSWORD || "Forno@2026";

  let user = await findUserByEmail(supabase, email);
  if (!user) {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name: "Forno Nordestino" },
    });
    if (error) throw error;
    user = data.user;
  } else {
    const { data, error } = await supabase.auth.admin.updateUserById(user.id, {
      password,
      email_confirm: true,
      user_metadata: { ...(user.user_metadata || {}), name: "Forno Nordestino" },
    });
    if (error) throw error;
    user = data.user;
  }

  const { data: restaurant, error: restaurantError } = await supabase
    .from("restaurants")
    .upsert({
      owner_id: user.id,
      name: "Forno Nordestino",
      slug: "forno-nordestino",
      description: "Pizzas, esfihas e sabores nordestinos para delivery.",
      phone: "11971005533",
      whatsapp: "11971005533",
      email,
      address: "Rua do Sabor, 100",
      city: "Sao Paulo",
      state: "SP",
      is_open: true,
      delivery_enabled: true,
      pickup_enabled: true,
      table_service_enabled: true,
      minimum_order: 20,
      delivery_fee: 5,
      estimated_delivery_time: "50 min",
      menu_footer_message: "Obrigado por pedir no Forno Nordestino.",
    }, { onConflict: "slug" })
    .select("id, name, slug")
    .single();
  if (restaurantError) throw restaurantError;

  const { error: userError } = await supabase
    .from("restaurant_users")
    .upsert({ restaurant_id: restaurant.id, user_id: user.id, role: "owner" }, { onConflict: "restaurant_id,user_id" });
  if (userError) throw userError;

  const categoryNames = ["Pizzas", "Esfihas", "Bebidas", "Combos", "Promoções", "Sobremesas"];
  const categories = {};
  for (const [index, name] of categoryNames.entries()) {
    const { data, error } = await supabase
      .from("categories")
      .upsert({
        restaurant_id: restaurant.id,
        name,
        description: `Categoria ${name}`,
        display_order: index + 1,
        active: true,
      }, { onConflict: "restaurant_id,name" })
      .select("id, name")
      .single();
    if (error) throw error;
    categories[name] = data.id;
  }

  const products = [
    ["Pizza Calabresa Grande 35 cm", "Pizza grande com calabresa, cebola e mussarela.", 29.9, "Pizzas", true],
    ["Pizza Mussarela Grande 35 cm", "Pizza grande com mussarela, tomate e orégano.", 29.9, "Pizzas", true],
    ["Esfiha de Carne", "Esfiha aberta de carne temperada.", 5, "Esfihas", false],
    ["Esfiha de Queijo", "Esfiha aberta de queijo.", 5, "Esfihas", false],
    ["Refrigerante 2L", "Refrigerante gelado 2 litros.", 12, "Bebidas", false],
  ];

  for (const [index, product] of products.entries()) {
    const [name, description, price, category, featured] = product;
    const { data, error } = await supabase
      .from("products")
      .upsert({
        restaurant_id: restaurant.id,
        category_id: categories[category],
        name,
        description,
        price,
        active: true,
        featured,
        preparation_time: category === "Bebidas" ? 5 : 25,
        sort_order: index + 1,
      }, { onConflict: "restaurant_id,name" })
      .select("id, name")
      .single();
    if (error) throw error;

    if (String(name).startsWith("Pizza")) {
      const { error: variantError } = await supabase.from("product_variants").upsert([
        { product_id: data.id, name: "Grande 35 cm", price, active: true },
        { product_id: data.id, name: "Familia 40 cm", price: Number(price) + 10, active: true },
      ], { onConflict: "product_id,name" });
      if (variantError) throw variantError;
    }
  }

  for (const addon of [
    ["Borda de catupiry", 7],
    ["Queijo extra", 5],
    ["Carne de sol extra", 9],
  ]) {
    const { error } = await supabase.from("product_addons").upsert({
      restaurant_id: restaurant.id,
      name: addon[0],
      price: addon[1],
      active: true,
    }, { onConflict: "restaurant_id,name" });
    if (error) throw error;
  }

  for (const integration of [
    { provider: "99food", name: "99Food", enabled: false, status: "disconnected" },
    { provider: "ifood", name: "iFood", enabled: false, status: "disconnected" },
    { provider: "keeta", name: "Keeta", enabled: false, status: "disconnected" },
    { provider: "whatsapp", name: "WhatsApp", enabled: true, status: "connected", external_store_id: "11971005533" },
    { provider: "webhook", name: "Webhook externo", enabled: false, status: "disconnected" },
  ]) {
    const { error } = await supabase.from("integrations").upsert({
      restaurant_id: restaurant.id,
      ...integration,
      is_enabled: integration.enabled,
      credentials: {},
      settings: {},
    }, { onConflict: "restaurant_id,provider" });
    if (error && !error.message.includes("integrations")) throw error;
  }

  console.log(`Seed concluido: ${restaurant.name} (${restaurant.slug}) / admin ${email} / senha ${password}`);
}

main().catch((error) => {
  const message = String(error.message || error);
  console.error(message);
  if (message.includes("schema cache") || message.includes("Could not find")) {
    console.error("Aplique primeiro supabase/migrations/20260521000100_mvp_schema.sql no Supabase SQL Editor e rode o seed novamente.");
  }
  process.exit(1);
});
