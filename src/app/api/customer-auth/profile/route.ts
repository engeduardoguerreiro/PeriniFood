import { safeCustomerProfile } from "@/lib/customer-auth";
import { requireCustomer, rateLimit } from "@/lib/customer-session";
import { loyaltySummary, withLoyaltyCampaign } from "@/lib/loyalty";
import { createServiceClient } from "@/lib/supabase/service";
import { assertSameOrigin, boundedText, privateJson, publicFailure, PublicError, readObject, uuid } from "@/lib/security";

const fields = "id, name, phone, whatsapp, email, cpf, birth_date, address, address_number, neighborhood, complement, reference, city, state, zip_code";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const restaurantId = uuid(url.searchParams.get("restaurantId"));
    const { customer_id: customerId } = await requireCustomer(restaurantId, url.searchParams.get("customerId"));
    const supabase = createServiceClient();
    const [{ data: customer, error }, ordersResult, loyaltyResult, restaurantResult] = await Promise.all([
      supabase.from("customers").select(fields).eq("restaurant_id", restaurantId).eq("id", customerId).single(),
      supabase.from("orders").select("id, order_number, code, status, payment_status, type, total, delivery_fee, discount, created_at")
        .eq("restaurant_id", restaurantId).eq("customer_id", customerId).order("created_at", { ascending: false }).limit(100),
      supabase.from("loyalty_programs").select("*").eq("restaurant_id", restaurantId).maybeSingle(),
      supabase.from("restaurants").select("opening_hours").eq("id", restaurantId).single(),
    ]);
    if (error || ordersResult.error || loyaltyResult.error || restaurantResult.error) throw new Error("Profile unavailable");
    const orders = ordersResult.data ?? [];
    return privateJson({ ok: true, customer: safeCustomerProfile(customer), orders,
      loyalty: loyaltySummary(withLoyaltyCampaign(loyaltyResult.data, restaurantResult.data?.opening_hours), orders) });
  } catch (error) { return publicFailure(error); }
}

export async function PATCH(request: Request) {
  try {
    assertSameOrigin(request);
    const body = await readObject(request);
    const restaurantId = uuid(body.restaurantId);
    const { customer_id: customerId } = await requireCustomer(restaurantId, body.customerId);
    await rateLimit("profile-write", customerId, 30);
    const phone = boundedText(body.phone, 25, true).replace(/\D/g, "");
    if (!/^\d{10,13}$/.test(phone)) throw new PublicError("Informe um telefone válido.");
    // Email changes require a separate proof-of-ownership flow.
    const payload = {
      name: boundedText(body.name, 120, true), phone, whatsapp: phone,
      address: boundedText(body.address, 200) || null, address_number: boundedText(body.addressNumber, 20) || null,
      neighborhood: boundedText(body.neighborhood, 100) || null, complement: boundedText(body.complement, 150) || null,
      reference: boundedText(body.reference, 150) || null, city: boundedText(body.city, 100) || null,
      state: boundedText(body.state, 2).toUpperCase() || null, zip_code: boundedText(body.zipCode, 10).replace(/\D/g, "") || null,
    };
    const { data, error } = await createServiceClient().from("customers").update(payload)
      .eq("restaurant_id", restaurantId).eq("id", customerId).select(fields).single();
    if (error) throw error;
    return privateJson({ ok: true, customer: safeCustomerProfile(data) });
  } catch (error) { return publicFailure(error); }
}
