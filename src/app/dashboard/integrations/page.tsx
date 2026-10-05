import { redirect } from "next/navigation";

// Tela antiga: gravava a integração com outro formulário e podia zerar as
// credenciais salvas pela tela atual em /integracoes.
export default function IntegrationsRedirectPage() {
  redirect("/integracoes");
}
