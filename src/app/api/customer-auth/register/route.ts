import { NextResponse } from "next/server";
import { hashCustomerPassword, safeCustomerProfile } from "@/lib/customer-auth";
import { createServiceClient } from "@/lib/supabase/service";
import { digits } from "@/lib/utils";

const customerFields = "id, name, phone, whatsapp, email, cpf, birth_date, address, neighborhood, city, state, zip_code";

export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, string | undefined>;
    const restaurantId = String(body.restaurantId ?? "").trim();
    const name = String(body.name ?? "").trim();
    const phone = digits(String(body.phone ?? ""));
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");

    if (!restaurantId || !name || !phone || !email || !password) {
      return NextResponse.json({ ok: false, message: "Preencha nome, celular, e-mail e senha." }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ ok: false, message: "A senha precisa ter pelo menos 6 caracteres." }, { status: 400 });
    }

    const supabase = createServiceClient();
    const payload = {
      restaurant_id: restaurantId,
      name,
      phone,
      whatsapp: phone,
      email,
      cpf: digits(String(body.cpf ?? "")) || null,
      birth_date: body.birthDate || null,
      address: body.address || null,
      neighborhood: body.neighborhood || null,
      city: body.city || null,
      state: body.state || null,
      zip_code: digits(String(body.zipCode ?? "")) || null,
      password_hash: hashCustomerPassword(password),
    };

    const { data: existing, error: findError } = await supabase
      .from("customers")
      .select("id")
      .eq("restaurant_id", restaurantId)
      .eq("email", email)
      .maybeSingle();

    if (findError) {
      return NextResponse.json({ ok: false, message: findError.message }, { status: 500 });
    }

    const result = existing?.id ?
       await supabase.from("customers").update(payload).eq("id", existing.id).select(customerFields).single()
      : await supabase.from("customers").insert(payload).select(customerFields).single();

    if (result.error) {
      return NextResponse.json({ ok: false, message: result.error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, customer: safeCustomerProfile(result.data) });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Não foi possível criar a conta." }, { status: 500 });
  }
}
