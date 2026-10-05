"use server";

import { mkdir, writeFile } from "fs/promises";
import { revalidatePath } from "next/cache";
import { parseDecimal } from "@/lib/utils";
import { redirect } from "next/navigation";
import path from "path";
import { saveValidatedOrder } from "@/lib/order-service";
import { PublicError, boundedText } from "@/lib/security";
import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireRestaurant } from "@/lib/auth";
import { submittedImageUrl } from "@/lib/image-url";
import { createTrackingLink } from "@/lib/delivery-tracking";
import { queueOrderNotification } from "@/lib/whatsapp/notify";
import { isAdminRole } from "@/lib/integrations/security";
import { mergeDeliveryRulesIntoOpeningHours } from "@/lib/delivery-fee-rules";
import { logIntegrationEvent } from "@/lib/integrations/external-order";
import { syncOrderStatusToIFood } from "@/lib/integrations/ifood/status-sync";
import { openingHourDays } from "@/lib/opening-hours";
import { digits, slugify } from "@/lib/utils";
import type { OrderStatus } from "@/lib/types";

// Ações destrutivas ou de configuração: mesma regra que as telas usam para
// esconder os botões (owner/admin/manager). Sem isso, caixa e cozinha chamavam
// a action direto e apagavam pedidos/clientes ou trocavam credenciais.
async function requireManager() {
  const context = await requireRestaurant();
  if (!isAdminRole(context.role)) throw new Error("Seu perfil não tem permissão para esta operação.");
  return context;
}

const ORDER_STATUSES: OrderStatus[] = ["pending", "accepted", "preparing", "ready", "out_for_delivery", "completed", "canceled"];

function text(formData: FormData, key: string, fallback = "") {
  return String(formData.get(key) ?? fallback).trim();
}

function num(formData: FormData, key: string, fallback = 0) {
  return parseDecimal(formData.get(key), fallback);
}

function uniqueValues(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}


// opening_hours também guarda _delivery_fee_rules, _loyalty_campaign e outras chaves
// gravadas por outras telas: parte do JSON atual e só substitui dias e impressora.
function openingHoursPayload(formData: FormData, existing: Record<string, unknown> | null) {
  const printerMethod = text(formData, "printer_method", "browser");
  const allowedPrinterMethods = new Set(["browser", "thermal", "network", "fiscal"]);
  const paperWidth = Number(text(formData, "printer_paper_width", "80"));
  const printerSettings = {
    enabled: formData.get("printer_enabled") === "on",
    method: allowedPrinterMethods.has(printerMethod) ? printerMethod : "browser",
    printer_name: text(formData, "printer_name") || null,
    paper_width: paperWidth === 58 ? 58 : 80,
    copies: Math.min(5, Math.max(1, num(formData, "printer_copies", 1))),
    auto_print: formData.get("printer_auto_print") === "on",
    cut_paper: formData.get("printer_cut_paper") === "on",
    open_cash_drawer: formData.get("printer_open_cash_drawer") === "on",
    network_address: text(formData, "printer_network_address") || null,
    notes: text(formData, "printer_notes") || null,
  };
  return {
    ...(existing ?? {}),
    ...Object.fromEntries(openingHourDays.map(([key]) => [
    key,
    {
      active: formData.get(`opening_${key}_active`) === "on",
      open: text(formData, `opening_${key}_open`, "18:00"),
      close: text(formData, `opening_${key}_close`, "23:00"),
    },
    ])),
    _printer_settings: printerSettings,
  };
}

function deliveryFeeRulesPayload(formData: FormData, restaurantId: string) {
  const ruleNames = formData.getAll("delivery_rule_name").map(String);
  const ruleMinKms = formData.getAll("delivery_rule_min_km").map(String);
  const ruleMaxKms = formData.getAll("delivery_rule_max_km").map(String);
  const ruleFees = formData.getAll("delivery_rule_fee").map(String);
  const freeRuleIndexes = new Set(formData.getAll("delivery_rule_free").map(String));
  const activeRuleIndexes = new Set(formData.getAll("delivery_rule_active").map(String));
  const removedRuleIndexes = new Set(formData.getAll("delivery_rule_remove").map(String));

  const rules = ruleNames
    .map((name, index) => {
      const minKm = parseDecimal(ruleMinKms[index]);
      const maxKm = String(ruleMaxKms[index] ?? "").trim() ? parseDecimal(ruleMaxKms[index]) : null;
      return {
        id: randomUUID(),
        restaurant_id: restaurantId,
        name: name.trim() || (maxKm === null ? `A partir de ${minKm} km` : `Até ${maxKm} km`),
        min_km: minKm,
        max_km: maxKm,
        fee: parseDecimal(ruleFees[index]),
        free_delivery: freeRuleIndexes.has(String(index)),
        active: activeRuleIndexes.has(String(index)),
        removed: removedRuleIndexes.has(String(index)),
      };
    })
    .filter((rule) => !rule.removed && (rule.name || rule.min_km > 0 || rule.max_km !== null || rule.fee > 0));

  if (rules.some((rule) => rule.min_km < 0 || rule.fee < 0 || (rule.max_km !== null && rule.max_km < rule.min_km))) {
    throw new Error("Confira as faixas de entrega. KM e taxa não podem ser negativos, e o KM final deve ser maior que o inicial.");
  }

  return rules.map((entry) => ({ name: entry.name, restaurant_id: entry.restaurant_id, min_km: entry.min_km, max_km: entry.max_km, fee: entry.fee, free_delivery: entry.free_delivery, active: entry.active }));
}

async function replaceDeliveryFeeRules(restaurantId: string, rules: ReturnType<typeof deliveryFeeRulesPayload>) {
  const service = createServiceClient();
  const deleteRules = await service.from("delivery_fee_rules").delete().eq("restaurant_id", restaurantId);
  const fallbackToRestaurantJson = async () => {
    const { data: restaurant, error: readError } = await service.from("restaurants").select("opening_hours").eq("id", restaurantId).maybeSingle();
    if (readError) throw new Error(readError.message);
    const nextOpeningHours = mergeDeliveryRulesIntoOpeningHours(restaurant?.opening_hours ?? {}, rules);
    const { error: updateError } = await service.from("restaurants").update({ opening_hours: nextOpeningHours }).eq("id", restaurantId);
    if (updateError) throw new Error(updateError.message);
  };

  if (deleteRules.error) {
    if (deleteRules.error.message.includes("delivery_fee_rules")) {
      await fallbackToRestaurantJson();
      return;
    }
    throw new Error(deleteRules.error.message);
  }
  if (!rules.length) {
    await fallbackToRestaurantJson();
    return;
  }

  const insertRules = await service.from("delivery_fee_rules").insert(rules);
  if (insertRules.error) {
    if (insertRules.error.message.includes("delivery_fee_rules")) {
      await fallbackToRestaurantJson();
      return;
    }
    throw new Error(insertRules.error.message);
  }
  await fallbackToRestaurantJson();
}

function pizzaOptionGroupName(kind: string) {
  if (kind === "massa") return "Tipos de Massas";
  if (kind === "borda") return "Bordas";
  if (kind === "adicional") return "Adicionais";
  return null;
}

function redirectWithFeedback(formData: FormData, fallbackPath: string, status: "saved" | "deleted" | "updated", error?: string): never {
  const requested = text(formData, "return_to", fallbackPath);
  const returnTo = requested.startsWith("/") && !requested.startsWith("//") && !requested.includes("\\") ? requested : fallbackPath;
  const separator = returnTo.includes("?") ? "&" : "?";
  const params = error ? `error=${encodeURIComponent(error)}` : `status=${status}`;
  redirect(`${returnTo}${separator}${params}`);
}

async function replaceProductOptionGroup(
  supabase: Awaited<ReturnType<typeof createClient>>,
  restaurantId: string,
  productId: string,
  name: string,
  type: "single" | "multiple",
  items: Array<{ name: string; additional_price: number }>,
  required = false,
) {
  const { data: existing, error: existingError } = await supabase
    .from("product_options")
    .select("id")
    .eq("restaurant_id", restaurantId)
    .eq("product_id", productId)
    .eq("name", name);
  if (existingError) throw new Error(existingError.message);
  const ids = (existing ?? []).map((item) => item.id);
  if (ids.length) {
    const { error: deleteError } = await supabase.from("product_options").delete().in("id", ids);
    if (deleteError) throw new Error(deleteError.message);
  }
  if (!items.length) return;
  const { data: option, error } = await supabase.from("product_options").insert({
    restaurant_id: restaurantId,
    product_id: productId,
    name,
    type,
    required,
    min_choices: required ? 1 : 0,
    max_choices: type === "single" ? 1 : null,
  }).select("id").single();
  if (error || !option) throw new Error(error?.message ?? "Não foi possível salvar opções do produto.");
  const { error: itemsError } = await supabase.from("product_option_items").insert(items.map((item) => ({
    restaurant_id: restaurantId,
    option_id: option.id,
    name: item.name,
    additional_price: item.additional_price,
    active: true,
  })));
  if (itemsError) throw new Error(itemsError.message);
}

// Larguras máximas por tipo de imagem. Sem isso o lojista sobe a foto original
// da câmera (2–3 MB) e ela vai inteira para o cardápio, o cabeçalho e a comanda,
// deixando as páginas pesadas e a impressão lenta.
const UPLOAD_MAX_WIDTH: Record<string, number> = {
  logos: 512,
  products: 640,
  banners: 1600,
  "site-covers": 1920,
};

// Sempre reprocessa com sharp e grava WebP (aceita transparência): o tipo
// declarado pelo navegador não é confiável e um arquivo que o sharp não decodifica
// não é imagem — é recusado em vez de ir cru para o Storage.
async function shrinkUpload(bytes: Buffer, folder: string): Promise<Buffer> {
  const width = UPLOAD_MAX_WIDTH[folder] ?? 1600;
  try {
    const { default: sharp } = await import("sharp");
    return await sharp(bytes).rotate().resize({ width, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
  } catch {
    throw new Error("Não foi possível ler a imagem. Envie um arquivo PNG, JPG ou WEBP válido.");
  }
}

async function saveUpload(file: FormDataEntryValue | null, folder: string) {
  if (!(file instanceof File) || !file.size) return null;
  const allowed = new Set(["image/png", "image/jpeg", "image/webp"]);
  if (!allowed.has(file.type)) throw new Error("Envie uma imagem PNG, JPG ou WEBP.");
  if (file.size > 6 * 1024 * 1024) throw new Error("A imagem deve ter no máximo 6 MB.");
  const extension = "webp";
  const filename = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
  const bytes = await shrinkUpload(Buffer.from(await file.arrayBuffer()), folder);

  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const service = createServiceClient();
    const bucket = "gastroflow-uploads";
    const bucketResult = await service.storage.createBucket(bucket, { public: true });
    if (bucketResult.error && !bucketResult.error.message.toLowerCase().includes("already exists")) {
      throw new Error(`Não foi possível preparar o armazenamento de imagens: ${bucketResult.error.message}`);
    }
    const { error } = await service.storage.from(bucket).upload(filename, bytes, {
      contentType: "image/webp",
      cacheControl: "31536000",
      upsert: true,
    });
    if (error) throw new Error(`Não foi possível enviar a imagem: ${error.message}`);
    return service.storage.from(bucket).getPublicUrl(filename).data.publicUrl;
  }

  const uploadDir = path.join(process.cwd(), "public", "uploads", folder);
  await mkdir(uploadDir, { recursive: true });
  const localFilename = filename.split("/").pop() ?? `${Date.now()}.${extension}`;
  await writeFile(path.join(uploadDir, localFilename), bytes);
  return `/uploads/${folder}/${localFilename}`;
}

type ProductPayload = Record<string, string | number | boolean | null>;

function missingSchemaColumn(error: { message: string } | null) {
  return error?.message.match(/Could not find the '([^']+)' column/)?.[1] ?? null;
}

async function saveProductRecord(
  supabase: Awaited<ReturnType<typeof createClient>>,
  id: string,
  restaurantId: string,
  payload: ProductPayload,
) {
  const nextPayload = { ...payload };
  for (let attempt = 0; attempt < 8; attempt++) {
    const result = id ?
       await supabase.from("products").update(nextPayload).eq("id", id).eq("restaurant_id", restaurantId).select("id").single()
      : await supabase.from("products").insert(nextPayload).select("id").single();

    if (!result.error && result.data) return result.data.id;

    const missingColumn = missingSchemaColumn(result.error);
    if (missingColumn && missingColumn in nextPayload) {
      delete nextPayload[missingColumn];
      continue;
    }

    throw new Error(result.error.message ?? "Não foi possível salvar o produto.");
  }

  throw new Error("Não foi possível salvar o produto com o schema atual do banco.");
}

async function saveProductVariants(
  supabase: Awaited<ReturnType<typeof createClient>>,
  productId: string,
  variants: Array<{ name: string; price: number; active: boolean; slices: number | null; notes: string | null; sort_order: number }>,
) {
  await supabase.from("product_variants").delete().eq("product_id", productId);
  if (!variants.length) return;
  const rows = variants.map((variant) => ({
    product_id: productId,
    name: variant.name,
    price: variant.price,
    active: variant.active,
    slices: variant.slices,
    notes: variant.notes,
    sort_order: variant.sort_order,
  }));
  const first = await supabase.from("product_variants").insert(rows);
  if (!first.error) return;
  const fallbackRows = rows.map((row) => ({
    product_id: row.product_id,
    name: row.name,
    price: row.price,
    active: row.active,
  }));
  const second = await supabase.from("product_variants").insert(fallbackRows);
  if (second.error) {
    const minimalRows = rows.map((row) => ({
      product_id: row.product_id,
      name: row.name,
      price: row.price,
    }));
    const third = await supabase.from("product_variants").insert(minimalRows);
    if (third.error) throw new Error(third.error.message);
  }
}

export async function signIn(formData: FormData) {
  const supabase = await createClient();
  const email = text(formData, "email").toLowerCase();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: text(formData, "password"),
  });
  if (error) {
    const message = error.message.toLowerCase().includes("invalid login credentials") ?
       "E-mail ou senha inválidos. Confira os dados e tente novamente."
      : error.message;
    redirect(`/login?error=${encodeURIComponent(message)}`);
  }
  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function register(formData: FormData) {
  const supabase = await createClient();
  const email = text(formData, "email");
  const password = text(formData, "password");
  const restaurantName = text(formData, "restaurant_name");
  const slug = slugify(text(formData, "slug") || restaurantName);
  const whatsapp = digits(text(formData, "whatsapp"));
  if (!restaurantName || !slug) redirect(`/register?error=${encodeURIComponent("Informe o nome do restaurante.")}`);
  if (whatsapp.length < 10) redirect(`/register?error=${encodeURIComponent("Informe um WhatsApp válido com DDD.")}`);

  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) redirect(`/register?error=${encodeURIComponent(error.message)}`);
  const user = data.user;
  if (!user) redirect("/login?message=Confirme seu e-mail para continuar");

  const { data: restaurant, error: restaurantError } = await supabase
    .from("restaurants")
    .insert({
      owner_id: user.id,
      name: restaurantName,
      slug,
      description: text(formData, "description", "Delivery moderno com pedidos online."),
      email,
      whatsapp,
      phone: whatsapp,
      is_open: true,
      delivery_enabled: true,
      pickup_enabled: true,
      table_service_enabled: true,
    })
    .select("id")
    .single();

  if (restaurantError) {
    const message = restaurantError.code === "23505" ? "Esse endereço de cardápio (slug) já está em uso. Escolha outro." : restaurantError.message;
    redirect(`/register?error=${encodeURIComponent(message)}`);
  }

  const { error: memberError } = await supabase.from("restaurant_users").insert({
    restaurant_id: restaurant.id,
    user_id: user.id,
    role: "owner",
  });
  if (memberError) redirect(`/register?error=${encodeURIComponent(memberError.message)}`);

  // Loja nova nasce aguardando ativação: a equipe libera no /admin após o
  // pagamento ou contato. Mesmo se este insert falhar, a falta de assinatura já
  // é tratada como "pending" por getAccessState.
  await createServiceClient().from("platform_subscriptions").insert({
    restaurant_id: restaurant.id,
    status: "pending",
    contact_name: restaurantName,
    contact_email: email,
    contact_phone: whatsapp,
    notes: "Cadastro pelo site — aguardando ativação.",
  });

  redirect("/ativacao");
}

export async function updatePassword(formData: FormData) {
  const supabase = await createClient();
  const password = text(formData, "password");
  const confirm = text(formData, "confirm_password");
  if (password.length < 6) redirect("/configuracoes?tab=seguranca&password_error=senha-curta");
  if (password !== confirm) redirect("/configuracoes?tab=seguranca&password_error=confirmacao");
  const { error } = await supabase.auth.updateUser({ password });
  if (error) redirect(`/configuracoes?tab=seguranca&password_error=${encodeURIComponent(error.message)}`);
  redirect("/configuracoes?tab=seguranca&password_success=1");
}

export async function saveCategory(formData: FormData) {
  const { supabase, restaurant } = await requireRestaurant();
  const id = text(formData, "id");
  const payload = {
    restaurant_id: restaurant.id,
    name: text(formData, "name"),
    description: text(formData, "description") || null,
    display_order: num(formData, "display_order"),
    active: formData.get("active") === "on",
  };
  const result = id ?
     await supabase.from("categories").update(payload).eq("id", id).eq("restaurant_id", restaurant.id)
    : await supabase.from("categories").insert(payload);
  if (result.error) redirectWithFeedback(formData, "/cardapio/categorias", "saved", result.error.message);
  revalidatePath("/dashboard/categories");
  revalidatePath("/cardapio/categorias");
  revalidatePath("/dashboard/pdv");
  revalidatePath("/pedidos/novo");
  revalidatePath("/dashboard/menu");
  revalidatePath("/cardapio");
  redirectWithFeedback(formData, "/cardapio/categorias", "saved");
}

export async function toggleCategory(formData: FormData) {
  const { supabase, restaurant } = await requireRestaurant();
  const result = await supabase.from("categories").update({ active: formData.get("active") === "true" }).eq("id", text(formData, "id")).eq("restaurant_id", restaurant.id);
  if (result.error) redirectWithFeedback(formData, "/cardapio/categorias", "updated", result.error.message);
  revalidatePath("/dashboard/categories");
  revalidatePath("/cardapio/categorias");
  revalidatePath("/dashboard/pdv");
  revalidatePath("/pedidos/novo");
  revalidatePath(`/cardapio/${restaurant.slug}`);
  redirectWithFeedback(formData, "/cardapio/categorias", "updated");
}

export async function deleteCategory(formData: FormData) {
  const { supabase, restaurant } = await requireRestaurant();
  const id = text(formData, "id");
  if (!id) return;
  await supabase.from("products").update({ category_id: null }).eq("category_id", id).eq("restaurant_id", restaurant.id);
  const result = await supabase.from("categories").delete().eq("id", id).eq("restaurant_id", restaurant.id);
  if (result.error) redirectWithFeedback(formData, "/cardapio/categorias", "deleted", result.error.message);
  revalidatePath("/dashboard/categories");
  revalidatePath("/cardapio/categorias");
  revalidatePath("/cardapio/produtos");
  revalidatePath("/dashboard/products");
  revalidatePath("/dashboard/pdv");
  revalidatePath("/pedidos/novo");
  revalidatePath(`/cardapio/${restaurant.slug}`);
  redirectWithFeedback(formData, "/cardapio/categorias", "deleted");
}

export async function saveProductType(formData: FormData) {
  const { supabase, restaurant } = await requireRestaurant();
  const id = text(formData, "id");
  const payload = {
    restaurant_id: restaurant.id,
    name: text(formData, "name"),
    description: text(formData, "description") || null,
    active: formData.get("active") === "on",
  };
  const result = id ?
     await supabase.from("product_types").update(payload).eq("id", id).eq("restaurant_id", restaurant.id)
    : await supabase.from("product_types").insert(payload);
  if (result.error) redirectWithFeedback(formData, "/cardapio/tipos", "saved", result.error.message);
  revalidatePath("/cardapio/tipos");
  revalidatePath("/cardapio/produtos");
  redirectWithFeedback(formData, "/cardapio/tipos", "saved");
}

export async function toggleProductType(formData: FormData) {
  const { supabase, restaurant } = await requireRestaurant();
  const result = await supabase.from("product_types").update({ active: formData.get("active") === "true" }).eq("id", text(formData, "id")).eq("restaurant_id", restaurant.id);
  if (result.error) redirectWithFeedback(formData, "/cardapio/tipos", "updated", result.error.message);
  revalidatePath("/cardapio/tipos");
  redirectWithFeedback(formData, "/cardapio/tipos", "updated");
}

export async function deleteProductType(formData: FormData) {
  const { supabase, restaurant } = await requireRestaurant();
  const result = await supabase.from("product_types").delete().eq("id", text(formData, "id")).eq("restaurant_id", restaurant.id);
  if (result.error) redirectWithFeedback(formData, "/cardapio/tipos", "deleted", result.error.message);
  revalidatePath("/cardapio/tipos");
  revalidatePath("/cardapio/produtos");
  redirectWithFeedback(formData, "/cardapio/tipos", "deleted");
}

export async function savePizzaOption(formData: FormData) {
  const { supabase, restaurant } = await requireRestaurant();
  const id = text(formData, "id");
  const previous = id ?
     await supabase.from("pizza_options").select("kind, name").eq("id", id).eq("restaurant_id", restaurant.id).maybeSingle()
    : { data: null };
  const payload = {
    restaurant_id: restaurant.id,
    kind: text(formData, "kind"),
    name: text(formData, "name"),
    price: num(formData, "price"),
    active: formData.get("active") === "on",
  };
  if (id) {
    const result = await supabase.from("pizza_options").update(payload).eq("id", id).eq("restaurant_id", restaurant.id);
    if (result.error) redirectWithFeedback(formData, "/cardapio/opcoes-pizza", "saved", result.error.message);
    const groupName = pizzaOptionGroupName(payload.kind);
    const previousName = previous.data?.name ?? payload.name;
    if (groupName) {
      const { data: groups } = await supabase
        .from("product_options")
        .select("id")
        .eq("restaurant_id", restaurant.id)
        .eq("name", groupName);
      const groupIds = (groups ?? []).map((group) => group.id);
      if (groupIds.length) {
        await supabase
          .from("product_option_items")
          .update({ name: payload.name, additional_price: payload.price, active: payload.active })
          .eq("restaurant_id", restaurant.id)
          .eq("name", previousName)
          .in("option_id", groupIds);
      }
    }
  } else {
    const result = await supabase.from("pizza_options").insert(payload);
    if (result.error) redirectWithFeedback(formData, "/cardapio/opcoes-pizza", "saved", result.error.message);
  }
  revalidatePath("/cardapio/opcoes-pizza");
  revalidatePath("/cardapio/produtos");
  revalidatePath("/dashboard/products");
  revalidatePath("/cardapio");
  revalidatePath(`/cardapio/${restaurant.slug}`);
  revalidatePath(`/r/${restaurant.slug}`);
  redirectWithFeedback(formData, "/cardapio/opcoes-pizza", "saved");
}

export async function togglePizzaOption(formData: FormData) {
  const { supabase, restaurant } = await requireRestaurant();
  const id = text(formData, "id");
  const active = formData.get("active") === "true";
  const { data: option } = await supabase.from("pizza_options").select("kind, name").eq("id", id).eq("restaurant_id", restaurant.id).maybeSingle();
  const result = await supabase.from("pizza_options").update({ active }).eq("id", id).eq("restaurant_id", restaurant.id);
  if (result.error) redirectWithFeedback(formData, "/cardapio/opcoes-pizza", "updated", result.error.message);
  if (option) {
    const groupName = pizzaOptionGroupName(option.kind);
    if (groupName) {
      const { data: groups } = await supabase.from("product_options").select("id").eq("restaurant_id", restaurant.id).eq("name", groupName);
      const groupIds = (groups ?? []).map((group) => group.id);
      if (groupIds.length) {
        await supabase.from("product_option_items").update({ active }).eq("restaurant_id", restaurant.id).eq("name", option.name).in("option_id", groupIds);
      }
    }
  }
  revalidatePath("/cardapio/opcoes-pizza");
  revalidatePath("/cardapio/produtos");
  revalidatePath(`/cardapio/${restaurant.slug}`);
  redirectWithFeedback(formData, "/cardapio/opcoes-pizza", "updated");
}

export async function deletePizzaOption(formData: FormData) {
  const { supabase, restaurant } = await requireRestaurant();
  const id = text(formData, "id");
  const { data: option } = await supabase.from("pizza_options").select("kind, name").eq("id", id).eq("restaurant_id", restaurant.id).maybeSingle();
  const result = await supabase.from("pizza_options").delete().eq("id", id).eq("restaurant_id", restaurant.id);
  if (result.error) redirectWithFeedback(formData, "/cardapio/opcoes-pizza", "deleted", result.error.message);
  if (option) {
    const groupName = pizzaOptionGroupName(option.kind);
    if (groupName) {
      const { data: groups } = await supabase.from("product_options").select("id").eq("restaurant_id", restaurant.id).eq("name", groupName);
      const groupIds = (groups ?? []).map((group) => group.id);
      if (groupIds.length) {
        await supabase.from("product_option_items").delete().eq("restaurant_id", restaurant.id).eq("name", option.name).in("option_id", groupIds);
      }
    }
  }
  revalidatePath("/cardapio/opcoes-pizza");
  revalidatePath("/cardapio/produtos");
  revalidatePath(`/cardapio/${restaurant.slug}`);
  redirectWithFeedback(formData, "/cardapio/opcoes-pizza", "deleted");
}

export async function saveProduct(formData: FormData) {
  const { supabase, restaurant } = await requireRestaurant();
  const id = text(formData, "id");
  let savedId: string | null = null;
  try {
  const imageUpload = await saveUpload(formData.get("image_file"), "products");
  const name = text(formData, "name");
  if (!name) throw new Error("Informe o nome do produto.");
  const productKind = text(formData, "product_type_kind", "other");
  const isPizza = productKind === "pizza";
  const basePrice = num(formData, "price");
  if (basePrice < 0) throw new Error("O preço não pode ser negativo.");
  const payload = {
    restaurant_id: restaurant.id,
    category_id: text(formData, "category_id") || null,
    product_type_id: text(formData, "product_type_id") || null,
    name,
    description: text(formData, "description") || null,
    price: basePrice,
    image_url: imageUpload ?? submittedImageUrl(text(formData, "image_url")),
    active: formData.get("active") === "on",
    featured: formData.get("featured") === "on",
    max_flavors: isPizza ? Math.min(4, Math.max(1, Number(restaurant.max_pizza_flavors ?? 1))) : 1,
    preparation_time: num(formData, "preparation_time", 15),
    internal_notes: text(formData, "internal_notes") || null,
    delivery_available: formData.get("delivery_available") === "on",
    pickup_available: formData.get("pickup_available") === "on",
    dine_in_available: formData.get("dine_in_available") === "on",
    sort_order: num(formData, "sort_order", 0),
    stock_control_enabled: formData.get("stock_control_enabled") === "on",
    stock_quantity: num(formData, "stock_quantity", 0),
  };
  const sizeNames = formData.getAll("size_name").map(String);
  const sizePrices = formData.getAll("size_price").map(String);
  const sizeSlices = formData.getAll("size_slices").map(String);
  const sizeNotes = formData.getAll("size_notes").map(String);
  const activeSizeNames = new Set(formData.getAll("size_active").map(String));
  const sizes = sizeNames.map((sizeName, index) => ({
    name: sizeName.trim(),
    price: parseDecimal(sizePrices[index]),
    active: activeSizeNames.has(sizeName),
    slices: Number(String(sizeSlices[index] ?? "")) || null,
    notes: String(sizeNotes[index] ?? "").trim() || null,
    sort_order: index,
  })).filter((size) => size.name);
  if (sizes.some((size) => size.price < 0)) throw new Error("Tamanho não pode ter preço negativo.");
  if (isPizza && !sizes.some((size) => size.active && size.price > 0)) {
    throw new Error("Pizza precisa ter pelo menos um tamanho ativo com preço maior que zero.");
  }
  if (!isPizza && basePrice <= 0) throw new Error("Produto comum precisa ter preço maior que zero.");
  // Validações antes de gravar: depois do insert, um erro deixaria o produto
  // salvo pela metade e o lojista recriaria uma cópia ao tentar de novo.
  const selectedMassas = uniqueValues([...formData.getAll("dough_option").map(String), ...formData.getAll("massa_option").map(String)]);
  const selectedBordas = uniqueValues([...formData.getAll("crust_option").map(String), ...formData.getAll("borda_option").map(String)]);
  const selectedAdicionais = uniqueValues([...formData.getAll("addition_option").map(String), ...formData.getAll("adicional_option").map(String)]);
  if (selectedMassas.length !== formData.getAll("dough_option").length && formData.getAll("dough_option").length) throw new Error("Existem massas duplicadas.");
  if (selectedBordas.length !== formData.getAll("crust_option").length && formData.getAll("crust_option").length) throw new Error("Existem bordas duplicadas.");
  if (selectedAdicionais.length !== formData.getAll("addition_option").length && formData.getAll("addition_option").length) throw new Error("Existem adicionais duplicados.");

  savedId = await saveProductRecord(supabase, id, restaurant.id, payload);
  const productId = savedId;

  if (productId) {
    await saveProductVariants(supabase, productId, isPizza ? sizes : []);
    const selectedOptionIds = [...selectedMassas, ...selectedBordas, ...selectedAdicionais];
    const { data: pizzaOptions } = await supabase
      .from("pizza_options")
      .select("id, kind, name, price")
      .eq("restaurant_id", restaurant.id)
      .in("id", selectedOptionIds.length ? selectedOptionIds : ["00000000-0000-0000-0000-000000000000"]);
    const toItems = (kind: string) => (pizzaOptions ?? [])
      .filter((item) => item.kind === kind)
      .map((item) => ({ name: item.name, additional_price: Number(item.price) }));
    await replaceProductOptionGroup(supabase, restaurant.id, productId, "Tipos de Massas", "single", isPizza ? toItems("massa") : []);
    await replaceProductOptionGroup(supabase, restaurant.id, productId, "Bordas", "single", isPizza ? toItems("borda") : []);
    await replaceProductOptionGroup(supabase, restaurant.id, productId, "Adicionais", "multiple", toItems("adicional"));
  }
  revalidatePath("/dashboard/products");
  revalidatePath("/cardapio/produtos");
  revalidatePath("/dashboard/menu");
  revalidatePath("/cardapio");
  revalidatePath(`/cardapio/${restaurant.slug}`);
  } catch (error) {
    const editId = id || savedId;
    redirectWithFeedback(
      formData,
      editId ? `/cardapio/produtos/${editId}` : "/cardapio/produtos/novo",
      "saved",
      error instanceof Error ? error.message : "Não foi possível salvar o produto.",
    );
  }
  redirect("/cardapio/produtos?status=saved");
}

export async function toggleProduct(formData: FormData) {
  const { supabase, restaurant } = await requireRestaurant();
  const { error } = await supabase.from("products").update({ active: formData.get("active") === "true" }).eq("id", text(formData, "id")).eq("restaurant_id", restaurant.id);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/products");
  revalidatePath("/cardapio/produtos");
  revalidatePath(`/cardapio/${restaurant.slug}`);
}

export async function deleteProduct(formData: FormData) {
  const { supabase, restaurant } = await requireRestaurant();
  const id = text(formData, "id");
  if (!id) return;
  await supabase.from("products").delete().eq("id", id).eq("restaurant_id", restaurant.id);
  revalidatePath("/dashboard/products");
  revalidatePath("/cardapio/produtos");
  revalidatePath("/dashboard/menu");
  revalidatePath("/cardapio");
  revalidatePath(`/cardapio/${restaurant.slug}`);
}

export async function saveAddon(formData: FormData) {
  const { supabase, restaurant } = await requireRestaurant();
  const id = text(formData, "id");
  const payload = {
    restaurant_id: restaurant.id,
    name: text(formData, "name"),
    price: num(formData, "price"),
    active: formData.get("active") === "on",
  };
  if (!payload.name) redirectWithFeedback(formData, "/cardapio/adicionais", "saved", "Informe o nome do adicional.");
  const result = id
    ? await supabase.from("product_addons").update(payload).eq("id", id).eq("restaurant_id", restaurant.id)
    : await supabase.from("product_addons").insert(payload);
  if (result.error) redirectWithFeedback(formData, "/cardapio/adicionais", "saved", result.error.message);
  revalidatePath("/cardapio/adicionais");
  revalidatePath(`/cardapio/${restaurant.slug}`);
}

export async function toggleAddon(formData: FormData) {
  const { supabase, restaurant } = await requireRestaurant();
  const { error } = await supabase.from("product_addons").update({ active: formData.get("active") === "true" }).eq("id", text(formData, "id")).eq("restaurant_id", restaurant.id);
  if (error) throw new Error(error.message);
  revalidatePath("/cardapio/adicionais");
  revalidatePath(`/cardapio/${restaurant.slug}`);
}

export async function updateRestaurant(formData: FormData) {
  const { supabase, restaurant } = await requireManager();
  const name = text(formData, "name");
  const slug = slugify(text(formData, "slug"));
  if (!name || !slug) redirectWithFeedback(formData, "/configuracoes", "saved", "Informe o nome da loja e o endereço do cardápio (slug).");
  const manualOpenStatus = text(formData, "manual_open_status", "auto");
  // Calculado antes do update: um erro nas faixas não pode deixar o resto gravado.
  let deliveryRules: ReturnType<typeof deliveryFeeRulesPayload>;
  try {
    deliveryRules = deliveryFeeRulesPayload(formData, restaurant.id);
  } catch (error) {
    redirectWithFeedback(formData, "/configuracoes", "saved", error instanceof Error ? error.message : "Revise as faixas de entrega.");
  }
  let logoUpload: string | null, bannerUpload: string | null, siteCoverUpload: string | null;
  try {
    logoUpload = await saveUpload(formData.get("logo_file"), "logos");
    bannerUpload = await saveUpload(formData.get("banner_file"), "banners");
    siteCoverUpload = await saveUpload(formData.get("site_cover_file"), "site-covers");
  } catch (error) {
    redirectWithFeedback(formData, "/configuracoes", "saved", error instanceof Error ? error.message : "Não foi possível enviar a imagem.");
  }
  const typed = (key: string) => submittedImageUrl(text(formData, key));
  const logoUrl = logoUpload ?? (typed("logo_url") || restaurant.logo_url || null);
  const coverUrl = bannerUpload ?? siteCoverUpload ?? (typed("cover_url") || restaurant.cover_url || null);
  const bannerUrl = bannerUpload ?? siteCoverUpload ?? (typed("banner_url") || typed("cover_url") || restaurant.banner_url || restaurant.cover_url || null);
  const siteCoverUrl = siteCoverUpload ?? (typed("site_cover_url") || restaurant.site_cover_url || bannerUrl || coverUrl || null);
  const payload = {
    name,
    legal_name: text(formData, "legal_name") || null,
    cnpj: text(formData, "cnpj") || null,
    state_registration: text(formData, "state_registration") || null,
    slug,
    description: text(formData, "description") || null,
    logo_url: logoUrl,
    cover_url: coverUrl,
    banner_url: bannerUrl,
    site_cover_url: siteCoverUrl,
    phone: text(formData, "phone") || null,
    whatsapp: text(formData, "whatsapp") || null,
    email: text(formData, "email") || null,
    address: text(formData, "address") || null,
    address_number: text(formData, "address_number") || null,
    neighborhood: text(formData, "neighborhood") || null,
    city: text(formData, "city") || null,
    state: text(formData, "state") || null,
    zip_code: text(formData, "zip_code") || null,
    is_open: formData.get("is_open") === "on",
    manual_open_status: ["auto", "open", "closed"].includes(manualOpenStatus) ? manualOpenStatus : "auto",
    opening_hours: openingHoursPayload(formData, restaurant.opening_hours),
    minimum_order: num(formData, "minimum_order"),
    delivery_fee: num(formData, "delivery_fee"),
    estimated_delivery_time: text(formData, "estimated_delivery_time") || null,
    menu_footer_message: text(formData, "menu_footer_message") || null,
    delivery_enabled: formData.get("delivery_enabled") === "on",
    pickup_enabled: formData.get("pickup_enabled") === "on",
    table_service_enabled: formData.get("table_service_enabled") === "on",
    max_pizza_flavors: Math.min(4, Math.max(1, num(formData, "max_pizza_flavors", 1))),
    payment_methods: formData.getAll("payment_methods").map(String),
  };
  const restaurantPayload: Record<string, string | number | boolean | string[] | Record<string, unknown> | null | undefined> = { ...payload };
  for (let attempt = 0; attempt < 4; attempt++) {
    const update = await supabase.from("restaurants").update(restaurantPayload).eq("id", restaurant.id);
    if (!update.error) break;
    const missingColumn = missingSchemaColumn(update.error);
    if (missingColumn && ["legal_name", "cnpj", "state_registration", "address_number", "neighborhood", "manual_open_status"].includes(missingColumn)) {
      redirectWithFeedback(formData, "/configuracoes", "saved", `O campo ${missingColumn} ainda não existe no banco. Execute a migration de configurações.`);
    }
    if (missingColumn && missingColumn in restaurantPayload) {
      delete restaurantPayload[missingColumn];
      continue;
    }
    redirectWithFeedback(formData, "/configuracoes", "saved", update.error.code === "23505" ? "Esse endereço de cardápio (slug) já está em uso." : update.error.message);
  }

  await replaceDeliveryFeeRules(restaurant.id, deliveryRules);

  // "layout": o cabeçalho do painel (nome/logo da loja) é renderizado no layout;
  // revalidar só a página deixaria a logo antiga no topo.
  revalidatePath("/dashboard/settings", "layout");
  revalidatePath("/configuracoes", "layout");
  revalidatePath("/dashboard/pdv");
  revalidatePath("/pedidos/novo");
  revalidatePath(`/r/${restaurant.slug}`);
  revalidatePath(`/cardapio/${restaurant.slug}`);
  if (slug !== restaurant.slug) revalidatePath(`/cardapio/${slug}`);
  redirectWithFeedback(formData, "/configuracoes", "saved");
}

export async function updateStoreOperationStatus(formData: FormData) {
  const { supabase, restaurant } = await requireRestaurant();
  const mode = text(formData, "operation_status", "auto");
  const allowedModes = new Set(["auto", "open", "closed", "offline"]);
  const normalizedMode = allowedModes.has(mode) ? mode : "auto";
  const payload = normalizedMode === "offline"
    ? { is_open: false, manual_open_status: "auto" }
    : { is_open: true, manual_open_status: normalizedMode };
  const { error } = await supabase.from("restaurants").update(payload).eq("id", restaurant.id);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
  revalidatePath("/configuracoes");
  revalidatePath("/pedidos/novo");
  revalidatePath(`/cardapio/${restaurant.slug}`);
}

export async function saveDeliveryFeeRules(formData: FormData) {
  const { restaurant } = await requireManager();
  try {
    const deliveryRules = deliveryFeeRulesPayload(formData, restaurant.id);
    await replaceDeliveryFeeRules(restaurant.id, deliveryRules);
  } catch (error) {
    redirectWithFeedback(formData, "/configuracoes", "saved", error instanceof Error ? error.message : "Erro desconhecido.");
  }
  // "layout": o cabeçalho do painel (nome/logo da loja) é renderizado no layout;
  // revalidar só a página deixaria a logo antiga no topo.
  revalidatePath("/dashboard/settings", "layout");
  revalidatePath("/configuracoes", "layout");
  revalidatePath("/dashboard/pdv");
  revalidatePath("/pedidos/novo");
  revalidatePath(`/r/${restaurant.slug}`);
  revalidatePath(`/cardapio/${restaurant.slug}`);
  redirectWithFeedback(formData, "/configuracoes", "saved");
}

export async function updateOrderStatus(formData: FormData) {
  const { supabase, restaurant } = await requireRestaurant();
  const id = text(formData, "id");
  const status = text(formData, "status") as OrderStatus;
  if (!ORDER_STATUSES.includes(status)) throw new Error("Status inválido.");
  const { data: order } = await supabase
    .from("orders")
    .select("id, status, external_order_id, external_platform")
    .eq("id", id)
    .eq("restaurant_id", restaurant.id)
    .maybeSingle();
  if (!order) throw new Error("Pedido não encontrado.");
  // Pedido encerrado (concluído/cancelado) não volta para a fila.
  if (order.status === status || order.status === "completed" || order.status === "canceled") {
    revalidatePath("/pedidos");
    revalidatePath("/dashboard/orders");
    return;
  }

  // Pedido do iFood não pode ser concluído manualmente — o iFood finaliza sozinho
  // (o status "completed" chega pelo evento CONCLUDED via polling).
  if (status === "completed" && order?.external_platform === "ifood") {
    revalidatePath("/pedidos");
    revalidatePath("/dashboard/orders");
    return;
  }

  const { error: updateError } = await supabase.from("orders").update({ status }).eq("id", id).eq("restaurant_id", restaurant.id);
  if (updateError) throw new Error(updateError.message);
  queueOrderNotification(id);
  // Só fala com o iFood se o pedido foi importado pelo servidor (integration_orders):
  // external_order_id em orders é editável pelo lojista e apontaria para pedido alheio.
  const linkedToIFood = order?.external_order_id && order.external_platform === "ifood"
    ? Boolean((await createServiceClient().from("integration_orders").select("id").eq("order_id", id).eq("restaurant_id", restaurant.id).eq("external_order_id", order.external_order_id).limit(1)).data?.length)
    : false;
  if (order?.external_order_id && order.external_platform === "ifood" && !linkedToIFood) {
    await logIntegrationEvent({
      restaurantId: restaurant.id,
      provider: "ifood",
      direction: "OUTBOUND",
      eventType: "status_skipped",
      externalId: order.external_order_id,
      status: "error",
      requestPayload: { orderId: id, status },
      responsePayload: { error: "Pedido sem vínculo de importação do iFood; status não enviado." },
    });
  } else if (order?.external_order_id && order.external_platform === "ifood") {
    try {
      const result = await syncOrderStatusToIFood(order.external_order_id, status);
      await logIntegrationEvent({
        restaurantId: restaurant.id,
        provider: "ifood",
        direction: "OUTBOUND",
        eventType: `status_${result.action}`,
        externalId: order.external_order_id,
        status: result.ok ? "ok" : "error",
        requestPayload: { orderId: id, externalOrderId: order.external_order_id, status },
        responsePayload: result as unknown as Record<string, unknown>,
      });
    } catch (error) {
      await logIntegrationEvent({
        restaurantId: restaurant.id,
        provider: "ifood",
        direction: "OUTBOUND",
        eventType: "status_error",
        externalId: order.external_order_id,
        status: "error",
        requestPayload: { orderId: id, externalOrderId: order.external_order_id, status },
        responsePayload: { error: error instanceof Error ? error.message : String(error) },
      });
    }
  } else if (order?.external_order_id && order.external_platform) {
    await logIntegrationEvent({
      restaurantId: restaurant.id,
      provider: order.external_platform,
      direction: "OUTBOUND",
      eventType: "mock_status_update",
      externalId: order.external_order_id,
      status: "ok",
      requestPayload: { orderId: id, externalOrderId: order.external_order_id, status },
      responsePayload: { ok: true, mocked: true },
    });
  }
  revalidatePath("/dashboard/orders");
  revalidatePath("/pedidos");
  revalidatePath(`/dashboard/orders/${id}`);
  revalidatePath(`/pedidos/${id}`);
}

// Gera (ou troca) o link do motoboy do pedido. Trocar invalida o link anterior —
// é assim que a loja passa a entrega para outro motoboy.
export async function createCourierLink(formData: FormData) {
  const { restaurant, role } = await requireRestaurant();
  const id = text(formData, "id");
  const back = `/pedidos/${id}`;
  if (role === "kitchen") redirectWithFeedback(formData, back, "updated", "Seu perfil não pode gerar link de entrega.");
  try {
    await createTrackingLink(restaurant.id, id, boundedText(formData.get("courier_name"), 60) || null);
  } catch (error) {
    redirectWithFeedback(formData, back, "updated", error instanceof Error ? error.message : "Não foi possível gerar o link.");
  }
  revalidatePath(back);
  redirect(`${back}?status=updated#motoboy`);
}

export async function deleteOrder(formData: FormData) {
  const { restaurant } = await requireManager();
  const service = createServiceClient();
  const id = text(formData, "id");
  if (!id) return;

  const { data: order, error: orderError } = await service
    .from("orders")
    .select("id")
    .eq("id", id)
    .eq("restaurant_id", restaurant.id)
    .maybeSingle();
  if (orderError) throw new Error(orderError.message);
  if (!order) return;

  const { data: items, error: itemsError } = await service
    .from("order_items")
    .select("id")
    .eq("order_id", id)
    .eq("restaurant_id", restaurant.id);
  if (itemsError) throw new Error(itemsError.message);
  const itemIds = (items ?? []).map((item) => item.id);

  if (itemIds.length) {
    const { error: addonsError } = await service.from("order_item_addons").delete().in("order_item_id", itemIds);
    if (addonsError) throw new Error(addonsError.message);
    const { error: orderItemsError } = await service.from("order_items").delete().in("id", itemIds).eq("restaurant_id", restaurant.id);
    if (orderItemsError) throw new Error(orderItemsError.message);
  }

  const { error: deleteError } = await service.from("orders").delete().eq("id", id).eq("restaurant_id", restaurant.id);
  if (deleteError) throw new Error(deleteError.message);
  revalidatePath("/dashboard/orders");
  revalidatePath("/pedidos");
  revalidatePath("/dashboard");
}

export async function createPdvOrder(formData: FormData) {
  const { restaurant, role } = await requireRestaurant();
  if (role === "kitchen") throw new Error("Operação não permitida.");
  const { id } = await saveValidatedOrder(formData, restaurant.id, "pdv");
  queueOrderNotification(id);
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

export async function createPublicOrder(formData: FormData) {
  let destination: string;
  try {
    const order = await saveValidatedOrder(formData, text(formData, "restaurant_id"), "site");
    queueOrderNotification(order.id);
    destination = '/pedido/' + order.code;
  } catch (error) {
    const slug = encodeURIComponent(boundedText(formData.get("slug"),100,true));
    const message = error instanceof PublicError ? error.message : "Não foi possível finalizar. Tente novamente.";
    destination = '/cardapio/' + slug + '/checkout?error=' + encodeURIComponent(message);
  }
  redirect(destination);
}

export async function saveCustomer(formData: FormData) {
  const { supabase, restaurant } = await requireRestaurant();
  const id = text(formData, "id");
  const returnTo = text(formData, "return_to", id ? `/clientes/${id}` : "/clientes");
  const payload: Record<string, string | null> = {
    restaurant_id: restaurant.id,
    name: text(formData, "name"),
    phone: text(formData, "phone") || null,
    whatsapp: text(formData, "whatsapp") || digits(text(formData, "phone")) || null,
    email: text(formData, "email") || null,
    cpf: digits(text(formData, "cpf")) || null,
    birth_date: text(formData, "birth_date") || null,
    address: text(formData, "address") || null,
    address_number: text(formData, "address_number") || null,
    neighborhood: text(formData, "neighborhood") || null,
    complement: text(formData, "complement") || null,
    reference: text(formData, "reference") || null,
    city: text(formData, "city") || null,
    state: text(formData, "state") || null,
    zip_code: text(formData, "zip_code") || null,
    notes: text(formData, "notes") || null,
  };
  const result = id ?
     await supabase.from("customers").update(payload).eq("id", id).eq("restaurant_id", restaurant.id)
    : await supabase.from("customers").insert(payload);
  if (result.error) redirectWithFeedback(formData, returnTo, "saved", result.error.message);
  revalidatePath("/clientes");
  revalidatePath("/dashboard/customers");
  if (id) revalidatePath(`/clientes/${id}`);
  redirectWithFeedback(formData, returnTo, "saved");
}

export async function saveCoupon(formData: FormData) {
  const { supabase, restaurant } = await requireManager();
  const id = text(formData, "id");
  const payload = {
    restaurant_id: restaurant.id,
    code: text(formData, "code").toUpperCase(),
    description: text(formData, "description") || null,
    discount_type: text(formData, "discount_type", "percent"),
    discount_value: num(formData, "discount_value"),
    minimum_order: num(formData, "minimum_order"),
    max_uses: text(formData, "max_uses") ? num(formData, "max_uses") : null,
    starts_at: text(formData, "starts_at") || null,
    ends_at: text(formData, "ends_at") || null,
    active: formData.get("active") === "on",
  };
  if (!payload.code) redirectWithFeedback(formData, "/cupons", "saved", "Informe o código do cupom.");
  if (payload.discount_value <= 0) redirectWithFeedback(formData, "/cupons", "saved", "Informe um desconto maior que zero.");
  const result = id
    ? await supabase.from("coupons").update(payload).eq("id", id).eq("restaurant_id", restaurant.id)
    : await supabase.from("coupons").insert(payload);
  if (result.error) redirectWithFeedback(formData, "/cupons", "saved", result.error.message);
  revalidatePath("/cupons");
  revalidatePath(`/cardapio/${restaurant.slug}`);
  redirectWithFeedback(formData, "/cupons", "saved");
}

export async function deleteCoupon(formData: FormData) {
  const { supabase, restaurant } = await requireManager();
  const result = await supabase.from("coupons").delete().eq("id", text(formData, "id")).eq("restaurant_id", restaurant.id);
  if (result.error) redirectWithFeedback(formData, "/cupons", "deleted", result.error.message);
  revalidatePath("/cupons");
  revalidatePath(`/cardapio/${restaurant.slug}`);
  redirectWithFeedback(formData, "/cupons", "deleted");
}

export async function saveLoyaltyProgram(formData: FormData) {
  const { supabase, restaurant } = await requireManager();
  const campaignStartsAt = text(formData, "campaign_starts_at") || null;
  const campaignEndsAt = text(formData, "campaign_ends_at") || null;
  if (campaignStartsAt && campaignEndsAt && campaignStartsAt > campaignEndsAt) {
    redirectWithFeedback(formData, "/cupons", "saved", "A data final da campanha deve ser maior ou igual à data inicial.");
  }
  const payload = {
    restaurant_id: restaurant.id,
    enabled: formData.get("enabled") === "on",
    points_per_currency: 1,
    points_to_reward: num(formData, "points_to_reward", 10),
    reward_type: text(formData, "reward_type", "percent"),
    reward_value: num(formData, "reward_value", 5),
    description: text(formData, "description") || null,
  };
  const result = await supabase.from("loyalty_programs").upsert(payload, { onConflict: "restaurant_id" });
  if (result.error) redirectWithFeedback(formData, "/cupons", "saved", result.error.message);
  const { data: fresh } = await supabase.from("restaurants").select("opening_hours").eq("id", restaurant.id).maybeSingle();
  const openingHours = ((fresh?.opening_hours ?? restaurant.opening_hours) as Record<string, unknown> | null) ?? {};
  const settingsResult = await supabase
    .from("restaurants")
    .update({
      opening_hours: {
        ...openingHours,
        _loyalty_campaign: {
          starts_at: campaignStartsAt,
          ends_at: campaignEndsAt,
        },
      },
    })
    .eq("id", restaurant.id);
  if (settingsResult.error) redirectWithFeedback(formData, "/cupons", "saved", settingsResult.error.message);
  revalidatePath("/cupons");
  revalidatePath(`/cardapio/${restaurant.slug}`);
  redirectWithFeedback(formData, "/cupons", "saved");
}

export async function deleteCustomer(formData: FormData) {
  const { restaurant } = await requireManager();
  const service = createServiceClient();
  const id = text(formData, "id");
  if (!id) return;
  const { error } = await service.from("customers").delete().eq("id", id).eq("restaurant_id", restaurant.id);
  if (error) throw new Error(error.message);
  revalidatePath("/clientes");
  revalidatePath("/dashboard/customers");
  redirectWithFeedback(formData, text(formData, "return_to", "/clientes"), "deleted");
}

export async function saveIntegration(formData: FormData) {
  const { supabase, restaurant } = await requireManager();
  const provider = text(formData, "provider");
  const enabled = formData.get("enabled") === "on";
  const { data: existingIntegration } = await supabase
    .from("integrations")
    .select("*")
    .eq("restaurant_id", restaurant.id)
    .eq("provider", provider)
    .maybeSingle();
  const keepSecret = (key: string, column: string) => {
    const value = text(formData, column);
    if (value.includes("****************")) {
      return existingIntegration?.[column] ?? existingIntegration?.credentials?.[key] ?? "";
    }
    return value;
  };
  const credentials = {
    clientId: text(formData, "client_id"),
    clientSecret: keepSecret("clientSecret", "client_secret"),
    accessToken: keepSecret("accessToken", "access_token"),
    refreshToken: keepSecret("refreshToken", "refresh_token"),
    apiKey: keepSecret("apiKey", "api_key"),
    webhookSecret: keepSecret("webhookSecret", "webhook_secret"),
    merchantId: text(formData, "external_store_id"),
    externalStoreId: text(formData, "external_store_id"),
  };
  const settings = {
    name: text(formData, "name"),
    externalStoreName: text(formData, "external_store_name"),
    webhookUrl: text(formData, "webhook_url"),
    environment: text(formData, "environment", "production"),
    authType: text(formData, "auth_type", "manual"),
    receiveOrders: formData.get("receive_orders") === "on",
    sendOrderStatus: formData.get("send_order_status") === "on",
    syncMenu: formData.get("sync_menu") === "on",
    syncProducts: formData.get("sync_products") === "on",
    syncPrices: formData.get("sync_prices") === "on",
    autoAcceptOrders: formData.get("auto_accept_orders") === "on",
    whatsappMessages: {
      confirmed: text(formData, "message_confirmed"),
      preparing: text(formData, "message_preparing"),
      dispatched: text(formData, "message_dispatched"),
      ready: text(formData, "message_ready"),
      completed: text(formData, "message_completed"),
    },
  };
  const newPayload = {
    restaurant_id: restaurant.id,
    provider,
    name: text(formData, "name", provider),
    status: enabled ? "pending" : "disabled",
    environment: settings.environment,
    auth_type: settings.authType,
    external_store_id: credentials.externalStoreId || null,
    external_store_name: settings.externalStoreName || null,
    api_base_url: text(formData, "api_base_url") || null,
    client_id: credentials.clientId || null,
    client_secret: credentials.clientSecret || null,
    access_token: credentials.accessToken || null,
    refresh_token: credentials.refreshToken || null,
    api_key: credentials.apiKey || null,
    webhook_secret: credentials.webhookSecret || null,
    webhook_url: settings.webhookUrl || null,
    is_enabled: enabled,
    receive_orders: settings.receiveOrders,
    send_order_status: settings.sendOrderStatus,
    sync_menu: settings.syncMenu,
    sync_products: settings.syncProducts,
    sync_prices: settings.syncPrices,
    auto_accept_orders: settings.autoAcceptOrders,
    config: settings,
    credentials,
    settings,
    enabled,
  };
  const saved = await supabase.from("integrations").upsert(newPayload, { onConflict: "restaurant_id,provider" });
  if (saved.error) {
    const fallback = await supabase.from("integrations").upsert({
      restaurant_id: restaurant.id,
      provider,
      enabled,
      status: enabled ? "pending" : "disconnected",
      credentials,
      settings,
    }, { onConflict: "restaurant_id,provider" });
    if (fallback.error) {
      redirectWithFeedback(formData, provider === "webhook" ? "/integracoes/webhooks" : `/integracoes/${provider}`, "saved", fallback.error.message);
    }
  }
  revalidatePath("/integracoes");
  revalidatePath(`/integracoes/${provider}`);
  revalidatePath("/integracoes/webhooks");
  revalidatePath("/integracoes/whatsapp");
  revalidatePath("/dashboard/integrations");
  redirectWithFeedback(formData, provider === "webhook" ? "/integracoes/webhooks" : `/integracoes/${provider}`, "saved");
}

export async function testIntegration(formData: FormData) {
  const { supabase, restaurant } = await requireManager();
  const provider = text(formData, "provider");
  const { data: integration } = await supabase
    .from("integrations")
    .select("*")
    .eq("restaurant_id", restaurant.id)
    .eq("provider", provider)
    .maybeSingle();
  if (!integration) redirectWithFeedback(formData, provider === "webhook" ? "/integracoes/webhooks" : `/integracoes/${provider}`, "updated", "Salve a integração antes de testar.");
  const credentials = integration.credentials ?? {};
  const hasAuth = Boolean(integration.api_key || integration.access_token || integration.client_secret || credentials.apiKey || credentials.accessToken || credentials.clientSecret || credentials.webhookSecret);
  const enabled = Boolean(integration.is_enabled ?? integration.enabled);
  const externalStoreId = integration.external_store_id ?? credentials.externalStoreId ?? credentials.merchantId;
  const ok = enabled && Boolean(externalStoreId || provider === "whatsapp" || provider === "webhook") && hasAuth;
  await logIntegrationEvent({
    restaurantId: restaurant.id,
    integrationId: integration.id ?? null,
    provider,
    direction: "OUTBOUND",
    eventType: "mock_connection_test",
    status: ok ? "ok" : "error",
    requestPayload: { provider, enabled, externalStoreId: Boolean(externalStoreId), hasAuth },
    responsePayload: { ok, mocked: true },
    errorMessage: ok ? null : "Preencha loja externa, habilite a integração e informe ao menos um método de autenticação.",
  });
  revalidatePath("/integracoes/logs");
  redirectWithFeedback(formData, provider === "webhook" ? "/integracoes/webhooks" : `/integracoes/${provider}`, ok ? "updated" : "updated", ok ? undefined : "Teste mock falhou: revise loja externa, autenticação e status ativo.");
}

export async function saveProductMap(formData: FormData) {
  const { supabase, restaurant } = await requireManager();
  const integrationId = text(formData, "integration_id");
  const result = await supabase.from("integration_product_maps").upsert({
    restaurant_id: restaurant.id,
    integration_id: integrationId,
    external_product_id: text(formData, "external_product_id"),
    external_product_name: text(formData, "external_product_name"),
    product_id: text(formData, "product_id") || null,
    product_variant_id: text(formData, "product_variant_id") || null,
    // NULL não conflita em unique(): sem isso cada salvamento criava uma linha nova.
    external_variant_id: text(formData, "external_variant_id"),
    is_active: formData.get("is_active") === "on",
  }, { onConflict: "integration_id,external_product_id,external_variant_id" });
  if (result.error) redirectWithFeedback(formData, text(formData, "return_to", "/integracoes"), "saved", result.error.message);
  revalidatePath(text(formData, "return_to", "/integracoes"));
  redirectWithFeedback(formData, text(formData, "return_to", "/integracoes"), "saved");
}

export async function savePaymentMap(formData: FormData) {
  const { supabase, restaurant } = await requireManager();
  const integrationId = text(formData, "integration_id");
  const result = await supabase.from("integration_payment_maps").upsert({
    restaurant_id: restaurant.id,
    integration_id: integrationId,
    external_payment_code: text(formData, "external_payment_code"),
    external_payment_name: text(formData, "external_payment_name"),
    internal_payment_method: text(formData, "internal_payment_method", "other"),
    is_active: formData.get("is_active") === "on",
  }, { onConflict: "integration_id,external_payment_code" });
  if (result.error) redirectWithFeedback(formData, text(formData, "return_to", "/integracoes"), "saved", result.error.message);
  revalidatePath(text(formData, "return_to", "/integracoes"));
  redirectWithFeedback(formData, text(formData, "return_to", "/integracoes"), "saved");
}

// Ficha técnica de produção do produto (documento interno da cozinha).
export async function saveRecipe(formData: FormData) {
  const { supabase, restaurant } = await requireRestaurant();
  const productId = text(formData, "product_id");
  if (!productId) return;

  const { linesToList } = await import("@/lib/recipes");
  const payload = {
    restaurant_id: restaurant.id,
    product_id: productId,
    yield_label: text(formData, "yield_label") || null,
    ingredients: linesToList(String(formData.get("ingredients") ?? "")),
    steps: linesToList(String(formData.get("steps") ?? "")),
    visual_standard: text(formData, "visual_standard") || null,
    notes: text(formData, "notes") || null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("product_recipes").upsert(payload, { onConflict: "product_id" });
  if (error) {
    redirectWithFeedback(formData, `/cardapio/fichas/${productId}`, "saved", error.message);
  }

  revalidatePath("/cardapio/fichas");
  revalidatePath(`/cardapio/fichas/${productId}`);
  revalidatePath(`/ficha/${productId}/print`);
  redirect("/cardapio/fichas?status=saved");
}
