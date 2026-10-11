import { hashCustomerPassword, safeCustomerProfile } from "@/lib/customer-auth";
import { authRateLimit, startCustomerSession } from "@/lib/customer-session";
import { createServiceClient } from "@/lib/supabase/service";
import { assertSameOrigin, boundedText, emailAddress, privateJson, publicFailure, PublicError, readObject } from "@/lib/security";

// "Crie uma senha" na página do pedido: cria a conta com os dados que o cliente
// já informou no checkout e põe este pedido no histórico dela. O código do pedido
// (48 hex, só quem fez o pedido recebe) é a prova de posse; só pedidos do site
// ainda sem cliente podem ser vinculados.
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const body = await readObject(request);
    const code = boundedText(body.code, 48, true);
    if (!/^[a-f0-9]{48}$/.test(code)) throw new PublicError("Pedido não encontrado.", 404);
    const email = emailAddress(body.email);
    const password = boundedText(body.password, 128, true);
    if (password.length < 12) throw new PublicError("Use uma senha com pelo menos 12 caracteres.");

    const service = createServiceClient();
    const { data: order, error: orderError } = await service.from("orders")
      .select("id, restaurant_id, source, customer_id, customer_name, customer_phone").eq("code", code).maybeSingle();
    if (orderError) throw new PublicError("Serviço temporariamente indisponível.", 503);
    if (!order || order.source !== "site") throw new PublicError("Pedido não encontrado.", 404);
    if (order.customer_id) throw new PublicError("Este pedido já está ligado a uma conta. Entre para ver seus pedidos.", 409);
    await authRateLimit(request, order.restaurant_id, email);

    const phone = String(order.customer_phone ?? "").replace(/\D/g, "");
    if (!/^\d{10,13}$/.test(phone)) throw new PublicError("O telefone do pedido é inválido. Crie a conta em Minha conta.");
    // INSERT only, como no cadastro: conflito nunca sobrescreve conta existente.
    const { data: customer, error } = await service.from("customers").insert({
      restaurant_id: order.restaurant_id, name: boundedText(order.customer_name, 120, true), phone, whatsapp: phone, email,
      password_hash: await hashCustomerPassword(password),
    }).select("id, name, phone, whatsapp, email").single();
    if (error) {
      if (error.code === "23505") throw new PublicError("Já existe cadastro com este e-mail ou telefone nesta loja. Entre em Minha conta.", 409);
      throw error;
    }
    const { error: linkError } = await service.from("orders").update({ customer_id: customer.id })
      .eq("id", order.id).eq("restaurant_id", order.restaurant_id).is("customer_id", null);
    if (linkError) console.error("[claim] conta criada mas pedido não vinculado", order.id, linkError.message);
    await startCustomerSession(order.restaurant_id, customer.id);
    return privateJson({ ok: true, customer: safeCustomerProfile(customer) }, 201);
  } catch (error) { return publicFailure(error); }
}
