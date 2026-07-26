# Impressão pelo navegador (sem instalar nada)

Este é o modo recomendado para o balcão: a comanda é impressa direto pelo
Chrome, **sem agente, sem `.exe` e sem aviso de antivírus**. Configuração de
uma vez só por máquina.

## Como funciona

O Chrome tem impressão silenciosa embutida (`--kiosk-printing`). Quando o
sistema é aberto por um atalho com essa flag, `window.print()` sai **direto no
papel**, sem a janela de impressão. A comanda já vem no tamanho 80 mm com o
logotipo, então imprime igual ao agente — só que sem instalar nada.

## Passo a passo (uma vez por máquina do balcão)

### 1. Deixe a impressora térmica como padrão
- Windows → **Configurações → Bluetooth e dispositivos → Impressoras**.
- Clique na sua impressora (ex.: `POS80 Printer`) → **Definir como padrão**.
- Em **Preferências de impressão**, confirme a largura do papel **80 mm**.

### 2. Crie o atalho de impressão
Duas opções — escolha uma:

**Opção A — automática (recomendada)**
1. Baixe o arquivo **`PeriniFood-Balcao-Impressao.cmd`**.
2. Clique com o botão direito → **Editar**, e troque `APP_URL` pelo mesmo
   endereço que você digita no navegador para abrir o sistema. Salve.
3. Clique duas vezes no arquivo. Um atalho **“PeriniFood Balcao”** aparece na
   área de trabalho.

**Opção B — manual**
1. Botão direito na área de trabalho → **Novo → Atalho**.
2. No local, cole (troque o endereço pelo seu):
   ```
   "C:\Program Files\Google\Chrome\Application\chrome.exe" --kiosk-printing --app=https://SEU-ENDERECO
   ```
3. Nomeie como **PeriniFood Balcao** e conclua.

### 3. Ligue o modo “Navegador” no sistema
- No sistema: **Configurações → Impressão de pedidos**.
- Em **Método de impressão**, selecione **Navegador / window.print**.
- Marque **Imprimir automaticamente ao finalizar** se quiser que a comanda
  saia sozinha ao fechar o carrinho.
- Salve.

## Uso no dia a dia
Abra o sistema **sempre pelo atalho “PeriniFood Balcao”**. Ao finalizar um
pedido, a comanda é lançada e impressa automaticamente, e a tela volta para os
pedidos. Nenhuma janela de impressão aparece.

## Observações
- Fora do atalho (Chrome comum), a impressão ainda funciona, mas aparece a
  janela de impressão do Windows (um clique a mais). Por isso use o atalho.
- Precisa ser o **Google Chrome** (ou Edge, que também aceita
  `--kiosk-printing`). Firefox não tem impressão silenciosa.
- O agente local com `.exe` continua disponível como alternativa, mas para o
  balcão este modo é mais simples e confiável.
