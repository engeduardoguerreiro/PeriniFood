export const mockPayloadKeeta = {
  externalStoreId: "loja-teste-keeta",
  externalOrderId: "KEETA-123456",
  customer: { name: "Cliente Keeta", phone: "11999999999" },
  delivery: { type: "DELIVERY", address: { street: "Rua Exemplo", number: "100", city: "Itapevi", state: "SP" } },
  items: [{ externalProductId: "esfiha-carne", name: "Esfiha de Carne", quantity: 2, unitPrice: 5 }],
  payment: { method: "PIX", status: "PENDING" },
  totals: { subtotal: 10, deliveryFee: 5, discount: 0, total: 15 },
};
