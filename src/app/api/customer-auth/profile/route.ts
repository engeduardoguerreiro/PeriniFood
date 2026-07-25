import { NextResponse } from "next/server";
import { safeCustomerProfile } from "@/lib/customer-auth";
import { loyaltySummary, withLoyaltyCampaign } from "@/lib/loyalty";
import { createServiceClient } from "@/lib/supabase/service";
import { digits } from "@/lib/utils";

const customerFields = "id, name, phone, whatsapp, email, cpf, birth_date, address, address_number, neighborhood, complement, reference, city, state, zip_code";
const fallbackCustomerFields = "id, name, phone, whatsapp, email, cpf, birth_date, address, neighborhood, city, state, zip_code";
const orderFields = "id, order_number, code, status, payment_status, type, total, delivery_fee, discount, created_at";

async function readCustomer(supabase: ReturnType<typeof createServiceClient>, restaurantId: string, customerId: string) {
  const full = await supabase.from("customers").select(customerFields).eq("restaurant_id", restaurantId).eq("id", customerId).maybeSingle();
  if (!full.error) return full;
  if (["address_number", "complement", "reference"].some((field) => full.error.message.includes(field))) {
    return supabase.from("customers").select(fallbackCustomerFields).eq("restaurant_id", restaurantId).eq("id", customerId).maybeSingle();
  }
  return full;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const restaurantId = url.searchParams.get("restaurantId") ?? "";
    const customerId = url.searchParams.get("customerId") ?? "";

    if (!restaurantId || !customerId) {
      return NextResponse.json({ ok: false, message: "Cliente não informado." }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { data: customer, error } = await readCustomer(supabase, restaurantId, customerId);
    if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
    if (!customer) return NextResponse.json({ ok: false, message: "Cliente não encontrado." }, { status: 404 });

    const { data: ordersByCustomer } = await supabase
      .from("orders")
      .select(orderFields)
      .eq("restaurant_id", restaurantId)
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false })
      .limit(30);

    const phone = String(customer.phone ?? customer.whatsapp ?? "");
    const { data: ordersByPhone } = phone
      ? await supabase
        .from("orders")
        .select(orderFields)
        .eq("restaurant_id", restaurantId)
        .eq("customer_phone", phone)
        .order("created_at", { ascending: false })
        .limit(30)
      : { data: [] };

    const ordersMap = new Map([...(ordersByCustomer ?? []), ...(ordersByPhone ?? [])].map((order) => [order.id, order]));
    const orders = [...ordersMap.values()].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
    const [{ data: loyalty }, { data: restaurant }] = await Promise.all([
      supabase.from("loyalty_programs").select("*").eq("restaurant_id", restaurantId).maybeSingle(),
      supabase.from("restaurants").select("opening_hours").eq("id", restaurantId).maybeSingle(),
    ]);

    return NextResponse.json({
      ok: true,
      customer: safeCustomerProfile(customer),
      orders,
      loyalty: loyaltySummary(withLoyaltyCampaign(loyalty, restaurant?.opening_hours as Record<string, unknown> | null), orders),
    });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Não foi possível carregar a conta." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json() as Record<string, string | undefined>;
    const restaurantId = String(body.restaurantId ?? "").trim();
    const customerId = String(body.customerId ?? "").trim();

    if (!restaurantId || !customerId) {
      return NextResponse.json({ ok: false, message: "Cliente não informado." }, { status: 400 });
    }

    const supabase = createServiceClient();
    const payload: Record<string, string | null> = {
      name: String(body.name ?? "").trim(),
      phone: digits(String(body.phone ?? "")) || null,
      whatsapp: digits(String(body.phone ?? "")) || null,
      email: String(body.email ?? "").trim().toLowerCase() || null,
      cpf: digits(String(body.cpf ?? "")) || null,
      birth_date: body.birthDate || null,
      address: String(body.address ?? "").trim() || null,
      address_number: String(body.addressNumber ?? "").trim() || null,
      neighborhood: String(body.neighborhood ?? "").trim() || null,
      complement: String(body.complement ?? "").trim() || null,
      reference: String(body.reference ?? "").trim() || null,
      city: String(body.city ?? "").trim() || null,
      state: String(body.state ?? "").trim().toUpperCase() || null,
      zip_code: digits(String(body.zipCode ?? "")) || null,
    };

    let result = await supabase.from("customers").update(payload).eq("restaurant_id", restaurantId).eq("id", customerId).select(customerFields).single();
    if (result.error && ["address_number", "complement", "reference"].some((field) => result.error?.message.includes(field))) {
      delete payload.address_number;
      delete payload.complement;
      delete payload.reference;
      result = await supabase.from("customers").update(payload).eq("restaurant_id", restaurantId).eq("id", customerId).select(fallbackCustomerFields).single();
    }
    if (result.error) return NextResponse.json({ ok: false, message: result.error.message }, { status: 500 });

    return NextResponse.json({ ok: true, customer: safeCustomerProfile(result.data) });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Não foi possível salvar a conta." }, { status: 500 });
  }
}
