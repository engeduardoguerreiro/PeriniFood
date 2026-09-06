import { endCustomerSession } from "@/lib/customer-session";
import { assertSameOrigin, privateJson, publicFailure, readObject, uuid } from "@/lib/security";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const body = await readObject(request);
    await endCustomerSession(uuid(body.restaurantId));
    return privateJson({ ok: true });
  } catch (error) { return publicFailure(error); }
}
