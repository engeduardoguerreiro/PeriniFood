export const mockPayloadIFood = {
  externalStoreId: "loja-teste-ifood",
  externalOrderId: "IFOOD-123456",
  customer: { name: "Cliente iFood", phone: "11999999999" },
  delivery: { type: "DELIVERY", address: { street: "Rua Exemplo", number: "100", city: "Itapevi", state: "SP" } },
  items: [{ externalProductId: "pizza-mussarela", name: "Pizza Mussarela", quantity: 1, unitPrice: 39.9 }],
  payment: { method: "ONLINE", status: "PAID" },
  totals: { subtotal: 39.9, deliveryFee: 5, discount: 0, total: 44.9 },
};
