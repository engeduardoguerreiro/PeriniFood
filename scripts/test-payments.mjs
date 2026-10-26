// Testes das formas de pagamento do site e do código Pix (src/lib/payments.ts).
// Uso: node --test scripts/test-payments.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { crc16, normalizePixKey, orderPayment, paymentDetailNote, pixBrCode, sitePayments } from "../src/lib/payments.ts";

// Lê o código EMV em pares id/valor para conferir os campos.
function parse(code) {
  const fields = {};
  for (let i = 0; i < code.length;) {
    const id = code.slice(i, i + 2);
    const length = Number(code.slice(i + 2, i + 4));
    fields[id] = code.slice(i + 4, i + 4 + length);
    i += 4 + length;
  }
  return fields;
}

test("CRC16 confere com o exemplo do manual do Banco Central", () => {
  const example = "00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-4266554400005204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***6304";
  assert.equal(crc16(example), "1D3D");
});

test("código Pix com valor, nome/cidade sem acento e referência do pedido", () => {
  const code = pixBrCode({ key: "(11) 98765-4321", keyType: "phone", name: "Pizzaria Forno Nordestino Ltda", city: "São Paulo", amount: 72.5, txid: "LJ-0042" });
  const fields = parse(code);
  assert.equal(fields["00"], "01");
  assert.deepEqual(parse(fields["26"]), { "00": "br.gov.bcb.pix", "01": "+5511987654321" });
  assert.equal(fields["53"], "986");
  assert.equal(fields["54"], "72.50");
  assert.equal(fields["58"], "BR");
  assert.equal(fields["59"], "PIZZARIA FORNO NORDESTINO");
  assert.equal(fields["60"], "SAO PAULO");
  assert.deepEqual(parse(fields["62"]), { "05": "LJ0042" });
  assert.equal(code.slice(-4), crc16(code.slice(0, -4)));
});

test("chave Pix validada pelo tipo escolhido", () => {
  assert.equal(normalizePixKey("529.982.247-25", "cpf"), "52998224725");
  assert.equal(normalizePixKey("529.982.247-26", "cpf"), null, "dígito errado");
  assert.equal(normalizePixKey("11.222.333/0001-81", "cnpj"), "11222333000181");
  assert.equal(normalizePixKey("+55 11 98765-4321", "phone"), "+5511987654321");
  assert.equal(normalizePixKey("11987654321", "phone"), "+5511987654321");
  assert.equal(normalizePixKey("Loja@Email.com", "email"), "loja@email.com");
  assert.equal(normalizePixKey("123E4567-E12B-12D1-A456-426655440000", "random"), "123e4567-e12b-12d1-a456-426655440000");
  assert.equal(normalizePixKey("11987654321", null), null, "sem tipo não arrisca");
  assert.throws(() => pixBrCode({ key: "abc", keyType: "cpf", name: "x", city: "y", amount: 10 }));
  assert.throws(() => pixBrCode({ key: "52998224725", keyType: "cpf", name: "x", city: "y", amount: 0 }));
});

test("formas do site: 'pix' antigo vira Pix na entrega; Pix agora exige chave", () => {
  assert.deepEqual(sitePayments(["pix", "cash"], null, null), ["pix_delivery", "cash"]);
  assert.deepEqual(sitePayments(["pix_online", "credit_card"], null, null), ["credit_card"]);
  assert.deepEqual(sitePayments(["pix_online", "credit_card"], "52998224725", "cpf"), ["pix_online", "credit_card"]);
  assert.deepEqual(sitePayments([], null, null), ["pix_delivery", "cash", "credit_card", "debit_card"]);
  assert.deepEqual(sitePayments(["bitcoin"], null, null), []);
});

test("pedido grava o método do banco e o detalhe para a operação", () => {
  assert.deepEqual(orderPayment("pix_online"), { method: "pix", detail: "pix_online" });
  assert.deepEqual(orderPayment("pix_delivery"), { method: "pix", detail: "pix_entrega" });
  assert.deepEqual(orderPayment("credit_card"), { method: "credit_card", detail: "maquininha" });
  assert.match(paymentDetailNote("maquininha"), /maquininha/);
  assert.match(paymentDetailNote("pix_online"), /confira o recebimento/);
});
