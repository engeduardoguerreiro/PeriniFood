import { createServiceClient } from "@/lib/supabase/service";
import { rateLimit } from "@/lib/customer-session";
import { deliveryRulesFromRestaurant } from "@/lib/delivery-fee-rules";
import { shippingAddress, shippingFee } from "@/lib/shipping";
import { assertSameOrigin, privateJson, publicFailure, PublicError, readObject, uuid } from "@/lib/security";
import type { Restaurant, DeliveryFeeRule } from "@/lib/types";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const body=await readObject(request);
    const restaurantId=uuid(body.restaurantId);
    const ip=process.env.VERCEL ? request.headers.get("x-vercel-forwarded-for") ?? "unknown" : "local";
    await rateLimit("shipping",restaurantId+":"+ip,30,600);
    if (!body.address || typeof body.address!=="object" || Array.isArray(body.address)) throw new PublicError("Endereço inválido.");
    const address=shippingAddress(body.address as Record<string,unknown>);
    const service=createServiceClient();
    const [{data:restaurant,error},{data:rules,error:rulesError}]=await Promise.all([
      service.from("restaurants").select("*").eq("id",restaurantId).single(),
      service.from("delivery_fee_rules").select("*").eq("restaurant_id",restaurantId).eq("active",true),
    ]);
    if(error || rulesError || !restaurant) throw new Error("Shipping unavailable");
    const quote=await shippingFee(restaurant as Restaurant,(rules?.length ? rules : deliveryRulesFromRestaurant(restaurant as Restaurant)) as DeliveryFeeRule[],address);
    return privateJson({ok:true,...quote});
  } catch(error) { return publicFailure(error); }
}
