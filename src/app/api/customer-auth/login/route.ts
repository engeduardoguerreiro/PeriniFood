import { NextResponse } from "next/server";
import { safeCustomerProfile, verifyCustomerPassword } from "@/lib/customer-auth";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { restaurantId: string; email: string; password: string };
    const restaurantId = String(body.restaurantId ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");

    if (!restaurantId || !email || !password) {
      return NextResponse.json({ ok: false, message: "Informe e-mail e senha." }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { data: customer, error } = await supabase
      .from("customers")
      .select("id, name, phone, whatsapp, email, cpf, birth_date, address, neighborhood, city, state, zip_code, password_hash")
      .eq("restaurant_id", restaurantId)
      .eq("email", email)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
    }
    if (!customer || !verifyCustomerPassword(password, customer.password_hash)) {
      return NextResponse.json({ ok: false, message: "E-mail ou senha inválidos." }, { status: 401 });
    }

    await supabase.from("customers").update({ last_login_at: new Date().toISOString() }).eq("id", customer.id);

    return NextResponse.json({ ok: true, customer: safeCustomerProfile(customer) });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Não foi possível entrar." }, { status: 500 });
  }
}
