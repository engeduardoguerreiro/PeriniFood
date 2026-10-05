// URLs de imagem gravadas no banco (logo, capa, foto de produto) vêm de texto livre
// do formulário. Só aceitamos o bucket público do nosso Supabase ou arquivos locais
// em /uploads e /brand — nunca caminhos com "..", outros esquemas ou hosts.

const LOCAL_IMAGE = /^\/(uploads|brand)\/[\w-]+(\/[\w-]+)*\.(png|jpe?g|webp)$/i;

export function storagePublicPrefix() {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "");
  return base ? `${base}/storage/v1/object/public/` : null;
}

export function isStorageImageUrl(url: string) {
  const prefix = storagePublicPrefix();
  return Boolean(prefix && url.startsWith(prefix) && !url.includes(".."));
}

export function isLocalImagePath(url: string) {
  return LOCAL_IMAGE.test(url);
}

export function isAllowedImageUrl(url: string | null | undefined) {
  return Boolean(url && (isStorageImageUrl(url) || isLocalImagePath(url)));
}

// Valor digitado no formulário: devolve a URL quando permitida, senão null
// (quem chama mantém o valor anterior do banco).
export function submittedImageUrl(value: string | null | undefined) {
  const url = (value ?? "").trim();
  return isAllowedImageUrl(url) ? url : null;
}
