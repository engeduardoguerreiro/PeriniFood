export const mockPayload99Food = {
  externalStoreId: "loja-teste-99food",
  externalOrderId: "99-123456",
  customer: { name: "Cliente 99Food", phone: "11999999999" },
  delivery: { type: "DELIVERY", address: { street: "Rua Exemplo", number: "100", city: "Itapevi", state: "SP" } },
  items: [{ externalProductId: "pizza-calabresa", name: "Pizza Calabresa", quantity: 1, unitPrice: 39.9 }],
  payment: { method: "PIX", status: "PENDING" },
  totals: { subtotal: 39.9, deliveryFee: 5, discount: 0, total: 44.9 },
};
