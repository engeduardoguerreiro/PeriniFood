import { hashCustomerPassword, safeCustomerProfile } from "@/lib/customer-auth";
import { authRateLimit, startCustomerSession } from "@/lib/customer-session";
import { createServiceClient } from "@/lib/supabase/service";
import { assertSameOrigin, boundedText, emailAddress, privateJson, publicFailure, PublicError, readObject, uuid } from "@/lib/security";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const body = await readObject(request);
    const restaurantId = uuid(body.restaurantId);
    const email = emailAddress(body.email);
    const password = boundedText(body.password, 128, true);
    const name = boundedText(body.name, 120, true);
    const phone = boundedText(body.phone, 25, true).replace(/\D/g, "");
    if (password.length < 12) throw new PublicError("Use uma senha com pelo menos 12 caracteres.");
    if (!/^\d{10,13}$/.test(phone)) throw new PublicError("Informe um telefone válido.");
    await authRateLimit(request, restaurantId, email);
    // INSERT only: conflicts must never overwrite another account or password.
    const { data: customer, error } = await createServiceClient().from("customers").insert({
      restaurant_id: restaurantId, name, phone, whatsapp: phone, email,
      password_hash: await hashCustomerPassword(password),
    }).select("id, name, phone, whatsapp, email").single();
    if (error) {
      if (error.code === "23505") throw new PublicError("Não foi possível cadastrar esses dados. Se já possui conta, entre ou contate a loja.", 409);
      throw error;
    }
    await startCustomerSession(restaurantId, customer.id);
    return privateJson({ ok: true, customer: safeCustomerProfile(customer) }, 201);
  } catch (error) { return publicFailure(error); }
}
