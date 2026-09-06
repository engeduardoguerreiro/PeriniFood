import { safeCustomerProfile, verifyCustomerPassword } from "@/lib/customer-auth";
import { createServiceClient } from "@/lib/supabase/service";
import { authRateLimit, startCustomerSession } from "@/lib/customer-session";
import { assertSameOrigin, boundedText, emailAddress, privateJson, publicFailure, PublicError, readObject, uuid } from "@/lib/security";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const body = await readObject(request);
    const restaurantId = uuid(body.restaurantId);
    const email = emailAddress(body.email);
    const password = boundedText(body.password, 128, true);
    await authRateLimit(request, restaurantId, email);
    const { data: customer, error } = await createServiceClient().from("customers")
      .select("id, name, phone, whatsapp, email, cpf, birth_date, address, address_number, neighborhood, complement, reference, city, state, zip_code, password_hash")
      .eq("restaurant_id", restaurantId).eq("email", email).maybeSingle();
    if (error) throw error;
    const hash = customer?.password_hash ?? `scrypt$${"0".repeat(32)}$${"0".repeat(128)}`;
    const valid = await verifyCustomerPassword(password, hash);
    if (!customer || !valid) throw new PublicError("E-mail ou senha inválidos.", 401);
    await startCustomerSession(restaurantId, customer.id);
    return privateJson({ ok: true, customer: safeCustomerProfile(customer) });
  } catch (error) { return publicFailure(error); }
}
