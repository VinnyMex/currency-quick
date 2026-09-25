Preparei o arquivo completo **currency-quick-ide-rules.md** para você colocar como regra na sua IDE. Ele instrui a IDE a criar o projeto inteiro, gerar os ícones, configurar a extensão Chrome, criar o PWA, preparar Android/iOS com Capacitor, adicionar cache, testes, configurações e build.

## Ponto importante sobre “tempo real”

O arquivo exige atualização automática da cotação, cache de cinco minutos, botão de atualização e suporte a provedor real com API key. Porém, nenhuma aplicação consegue garantir “câmbio em tempo real” sem uma fonte que forneça dados intraday ou streaming.

A regra foi escrita para:

- Usar um provedor público em modo demonstração.
- Permitir configurar uma API profissional posteriormente.
- Atualizar automaticamente a cotação.
- Mostrar data e hora da consulta.
- Informar quando estiver usando cache.
- Evitar chamadas excessivas.
- Não expor sua chave de API no código.

Provedores gratuitos podem ter atraso, limites ou cotações de referência. Para câmbio realmente intraday, você precisará configurar um serviço com dados em tempo real e chave própria. Serviços como ExchangeRate-API exigem cadastro para obter a chave, enquanto o ExchangeRate.host anuncia dados atuais e limites de uso conforme o plano. [exchangerate](https://exchangerate.host/)

## Como usar na IDE

1. Abra o arquivo **currency-quick-ide-rules.md** no painel de arquivos.
2. Copie todo o conteúdo.
3. Cole no campo de regras/instruções da sua IDE.
4. Peça para a IDE executar a criação do projeto.
5. Após a criação, execute:

```bash
npm run setup
npm run dev
```

6. Para criar a versão de produção:

```bash
npm run build
```

7. Para criar a extensão:

```bash
npm run extension:build
```

8. No Chrome, abra:

```text
chrome://extensions
```

9. Ative **Modo do desenvolvedor**.
10. Clique em **Carregar sem compactação**.
11. Selecione:

```text
dist-extension
```

A extensão usa Manifest V3, o formato atual do Chrome para declarar permissões, scripts, popup, ícones e service worker. [developer.chrome](https://developer.chrome.com/docs/extensions/reference/manifest)

## Capacitor

A regra também deixa o projeto preparado para gerar os aplicativos nativos:

```bash
npx cap add android
npx cap add ios
npx cap copy
npx cap open android
npx cap open ios
```

O Android exige Android Studio. O iOS exige macOS e Xcode. O PWA, entretanto, deve funcionar imediatamente no Windows, Android e iPhone pelo navegador. O Capacitor foi escolhido porque permite reutilizar a base web em Android e iOS. [capacitorjs](https://capacitorjs.com/docs)


# Currency Quick — Regra completa para criação do projeto

## Instrução principal para a IDE

Crie um projeto completo, funcional e executável chamado **Currency Quick**. O projeto deve ser um monorepo com uma extensão para navegadores Chromium e um aplicativo web responsivo instalável como PWA. A estrutura deve permitir futura geração de APK Android e aplicativo iOS com Capacitor.

Não entregue apenas exemplos, pseudocódigo ou arquivos incompletos. Crie todos os arquivos necessários, scripts de instalação, ícones, documentação, testes básicos e configuração de build.

O projeto deve ser criado diretamente no diretório aberto na IDE. Não gere um ZIP falso. Não use links externos para arquivos obrigatórios. Todos os arquivos precisam existir fisicamente no projeto.

---

## Objetivo do produto

Criar um conversor de moedas extremamente rápido para uso durante a navegação na internet.

O usuário deve conseguir:

- Selecionar um preço em qualquer página compatível.
- Clicar com o botão direito e converter o valor.
- Abrir o popup da extensão e converter manualmente.
- Usar BRL, USD e EUR como moedas principais.
- Adicionar outras moedas mundiais.
- Ver a cotação atualizada automaticamente.
- Usar a última cotação salva quando estiver temporariamente sem internet.
- Instalar o aplicativo no Windows como PWA.
- Usar o PWA no Android e iOS pelo navegador.
- Preparar o projeto para empacotamento futuro com Capacitor.

Idioma padrão da interface: português do Brasil.

Nome visual: Currency Quick.

Identificador da extensão: `currencyquick.converter`.

Identificador do aplicativo: `com.currencyquick.app`.

---

## Regra sobre cotação “em tempo real”

A aplicação deve buscar a cotação mais recente disponível automaticamente, atualizar a cotação quando o usuário abrir o popup e permitir atualização manual.

Para não prometer uma precisão que a API não oferece, a interface deve usar a expressão:

> Cotação atualizada

Não utilizar a expressão “câmbio garantido”, “preço final de compra” ou “cotação de mercado em tempo real” sem validação da fonte.

O sistema deve ter uma camada de provedores de cotação, com possibilidade de troca futura.

Criar a seguinte interface lógica:

```javascript
class ExchangeRateProvider {
  async getLatestRates(baseCurrency, quoteCurrencies) {
    throw new Error("Not implemented");
  }
}
```

Implementar inicialmente dois modos:

### Modo DEMO

Usar uma API pública sem chave apenas para desenvolvimento e demonstração. A implementação deve ficar isolada em:

```text
src/shared/providers/demo-provider.js
```

O modo DEMO deve funcionar sem cadastro.

### Modo REAL

Criar suporte para uma API de câmbio com chave configurável por variável de ambiente ou tela de configurações. Nunca inserir uma chave diretamente no código do frontend ou da extensão.

Usar estas variáveis:

```text
VITE_EXCHANGE_API_URL=
VITE_EXCHANGE_API_KEY=
VITE_EXCHANGE_PROVIDER=demo
```

Quando `VITE_EXCHANGE_PROVIDER=demo`, usar o provedor público.

Quando `VITE_EXCHANGE_PROVIDER=real`, usar a API configurada por `VITE_EXCHANGE_API_URL` e `VITE_EXCHANGE_API_KEY`.

A aplicação deve mostrar na interface:

- Nome do provedor.
- Data/hora da atualização.
- Indicador “Atualizado”, “Cache” ou “Sem conexão”.
- Aviso de que taxas podem variar entre provedores, bancos e cartões.

O sistema deve atualizar automaticamente conforme estas regras:

- Ao abrir o popup.
- Ao abrir o aplicativo.
- Ao trocar a moeda de origem.
- Ao trocar a moeda de destino.
- Ao clicar no botão de atualizar.
- No máximo uma vez a cada 5 minutos por combinação de moeda, evitando excesso de chamadas.
- Permitir configuração do intervalo de atualização entre 1 e 60 minutos.

Nunca fazer polling agressivo a cada segundo.

A cotação deve ser armazenada localmente com:

```javascript
{
  base: "BRL",
  rates: {
    USD: 0,
    EUR: 0
  },
  provider: "demo",
  fetchedAt: "ISO_DATE",
  expiresAt: "ISO_DATE"
}
```

Usar a cotação salva em caso de falha temporária, exibindo claramente “Última cotação salva”.

---

## Stack obrigatória

Usar:

- HTML.
- CSS moderno.
- JavaScript modular ou TypeScript.
- Vite para o PWA.
- Manifest V3 para a extensão.
- Service worker.
- Chrome Storage API para configurações e cache da extensão.
- LocalStorage ou IndexedDB para cache do PWA.
- Web Crypto API se algum identificador local precisar ser gerado.
- Capacitor preparado, mas sem obrigar a instalação de Android Studio ou Xcode para executar o MVP web.

Evitar dependências desnecessárias.

A aplicação deve funcionar em Windows, Android e iOS através de navegadores modernos.

---

## Estrutura obrigatória

Criar exatamente uma estrutura equivalente a esta:

```text
currency-quick/
├── README.md
├── LICENSE
├── .gitignore
├── .env.example
├── package.json
├── vite.config.js
├── capacitor.config.ts
├── extension/
│   ├── manifest.json
│   ├── background.js
│   ├── content.js
│   ├── content.css
│   ├── popup.html
│   ├── popup.css
│   ├── popup.js
│   ├── options.html
│   ├── options.css
│   ├── options.js
│   └── icons/
│       ├── icon16.png
│       ├── icon32.png
│       ├── icon48.png
│       ├── icon128.png
│       └── icon512.png
├── public/
│   ├── icons/
│   │   ├── icon-192.png
│   │   ├── icon-512.png
│   │   └── maskable-512.png
│   └── favicon.svg
├── src/
│   ├── main.js
│   ├── styles.css
│   └── shared/
│       ├── currencies.js
│       ├── formatter.js
│       ├── storage.js
│       ├── rate-cache.js
│       ├── converter.js
│       ├── api-client.js
│       └── providers/
│           ├── demo-provider.js
│           └── real-provider.js
├── index.html
├── manifest.webmanifest
├── sw.js
└── tests/
    ├── parser.test.js
    └── converter.test.js
```

Se a IDE preferir TypeScript, pode usar `.ts`, mas deve manter a mesma separação de responsabilidades.

---

## Extensão de navegador

Criar uma extensão Manifest V3 para Chrome, Edge, Brave e outros navegadores Chromium.

O `manifest.json` deve conter:

- `manifest_version: 3`.
- Nome e descrição em português.
- Ícones 16, 32, 48, 128 e 512.
- `action.default_popup` apontando para `popup.html`.
- Service worker apontando para `background.js`.
- Permissões mínimas: `storage`, `contextMenus`, `activeTab`, `scripting`.
- Host permission somente para a API configurada.
- Content script para páginas HTTP e HTTPS.
- Página de opções para configurações.

Não solicitar permissões excessivas.

Criar menu de contexto:

```text
Converter seleção com Currency Quick
```

Ao selecionar valores na página, o content script deve tentar identificar:

- `R$ 129,90` como BRL.
- `US$ 49.99` como USD.
- `$49.99` como USD, com aviso de que o símbolo pode ser ambíguo.
- `€ 39,90` como EUR.
- `£ 20.00` como GBP.
- `¥ 5.000` como JPY quando possível.
- Valores com separador brasileiro.
- Valores com separador americano.

O parser deve evitar converter datas, códigos de produto, números de telefone e valores sem símbolo quando não houver contexto suficiente.

Quando o usuário selecionar um preço:

1. Identificar a moeda.
2. Identificar o valor.
3. Exibir um pequeno widget flutuante próximo à seleção.
4. Mostrar BRL, USD e EUR.
5. Permitir trocar a moeda de destino.
6. Permitir copiar o resultado.
7. Mostrar o horário/data da cotação.
8. Mostrar aviso quando estiver usando cache.

O widget deve:

- Não quebrar o layout do site.
- Ter `z-index` alto.
- Ser responsivo.
- Poder ser fechado.
- Não aparecer repetidamente para a mesma seleção.
- Escapar textos inseridos no DOM.
- Não usar `innerHTML` com dados sem sanitização.

---

## Popup da extensão

Criar popup com:

- Campo numérico para valor.
- Seletor de moeda de origem.
- Seletor de moeda de destino.
- Botão de inverter moedas.
- Botão converter.
- Botão atualizar.
- Resultado grande e legível.
- Taxa aplicada.
- Data/hora da atualização.
- Estado da rede.
- Atalhos BRL, USD e EUR.
- Favoritos configuráveis.
- Link para opções.

Moedas iniciais:

```text
BRL, USD, EUR, GBP, JPY, CAD, AUD, CHF, ARS, CLP, MXN, CNY, KRW, INR, AED, ZAR
```

Usar `Intl.NumberFormat` para cada moeda, respeitando idioma e casas decimais.

Não arredondar internamente antes do cálculo. Arredondar somente na exibição.

---

## PWA

Criar uma interface mobile-first com:

- Cabeçalho Currency Quick.
- Cartão de conversão.
- Resultado destacado.
- Lista de moedas favoritas.
- Histórico local das últimas 10 conversões.
- Botão de copiar.
- Botão de compartilhar usando Web Share API quando disponível.
- Tela de configurações.
- Tema claro e escuro.
- Layout adequado para celular e desktop.
- Área segura para notch em iOS.
- Estados de carregamento, erro e cache.
- Manifest PWA válido.
- Service worker funcionando.
- Instalação no Windows, Android e iOS.

Criar `manifest.webmanifest` com:

- `name`.
- `short_name`.
- `start_url`.
- `display: standalone`.
- `theme_color`.
- `background_color`.
- `lang: pt-BR`.
- Ícones 192x192, 512x512 e maskable.

---

## Ícones e identidade visual

A IDE deve gerar os ícones automaticamente, sem deixar arquivos vazios.

Criar ícones PNG reais com os seguintes tamanhos:

```text
16x16
32x32
48x48
128x128
192x192
512x512
```

Criar também versão SVG editável.

Identidade visual:

- Fundo azul: `#2563EB`.
- Cor secundária: `#1D4ED8`.
- Fundo claro: `#F4F6F8`.
- Texto: `#17202A`.
- Símbolo visual: `⇄` entre moedas ou combinação `R$ ⇄ €`.
- Alto contraste.
- Bordas arredondadas.
- Visual limpo, rápido e confiável.

Se não houver biblioteca de geração de PNG disponível, criar um script Node ou Python que gere os ícones e executá-lo durante a criação do projeto.

O script deve ficar em:

```text
scripts/generate-icons.js
```

Adicionar no `package.json`:

```json
"icons": "node scripts/generate-icons.js"
```

O comando `npm run setup` deve gerar os ícones automaticamente.

---

## Configurações

Criar uma página de opções para:

- Moeda padrão de origem.
- Moeda padrão de destino.
- Casas decimais.
- Moedas favoritas.
- Intervalo de atualização.
- Tema claro, escuro ou automático.
- Provedor demo ou real.
- URL do provedor real.
- Chave do provedor real.
- Ativar/desativar widget automático.
- Ativar/desativar menu de contexto.

Nunca exibir a chave completa depois de salva. Mostrar somente os últimos quatro caracteres.

Nunca registrar a chave no console.

---

## Segurança

Implementar obrigatoriamente:

- Não usar `eval`.
- Não usar scripts remotos.
- Não usar bibliotecas de CDN em produção.
- Não inserir HTML não sanitizado.
- Não expor API key no repositório.
- Validar valores numéricos.
- Limitar valor máximo configurável para evitar entradas absurdas.
- Tratar erro de rede.
- Tratar resposta inválida da API.
- Tratar moeda não suportada.
- Usar timeout de requisição.
- Cancelar requisições antigas quando o usuário fizer nova conversão.
- Não coletar dados pessoais.
- Não enviar histórico para servidores.
- Armazenar histórico somente localmente.

Criar uma função de timeout:

```javascript
async function fetchWithTimeout(url, options = {}, timeoutMs = 10000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeout);
  }
}
```

---

## Cache e offline

Criar cache por combinação de moedas.

Exemplo de chave:

```text
rates:BRL:USD
```

Cada cache deve guardar:

```javascript
{
  base: "BRL",
  quote: "USD",
  rate: 0,
  provider: "demo",
  fetchedAt: "2026-09-13T10:00:00.000Z",
  expiresAt: "2026-09-13T10:05:00.000Z"
}
```

Regras:

- Cache válido por padrão durante 5 minutos.
- Permitir alteração do intervalo.
- Se a API falhar, utilizar cache anterior.
- Informar visualmente que a cotação é antiga.
- Se não houver cache, mostrar erro compreensível.
- Service worker deve manter os arquivos do aplicativo disponíveis offline.

---

## Scripts obrigatórios

Criar estes scripts no `package.json`:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "icons": "node scripts/generate-icons.js",
    "extension:build": "npm run build && node scripts/build-extension.js",
    "setup": "npm install && npm run icons"
  }
}
```

Criar também:

```text
scripts/build-extension.js
scripts/generate-icons.js
```

O script de extensão deve copiar os arquivos necessários para uma pasta final:

```text
dist-extension/
```

O diretório `dist-extension` deve poder ser carregado diretamente em:

```text
chrome://extensions
```

Usar “Carregar sem compactação”.

Também criar, opcionalmente, um ZIP real com o nome:

```text
currency-quick-extension.zip
```

O ZIP deve ser criado por uma biblioteca real de compactação ou pelo módulo nativo adequado. Nunca criar um arquivo de texto com extensão `.zip`.

---

## Capacitor

Preparar `capacitor.config.ts` para o aplicativo web.

Adicionar instruções no README para:

```bash
npm install
npm run setup
npm run dev
npm run build
npx cap add android
npx cap add ios
npx cap copy
npx cap open android
npx cap open ios
```

Não exigir o ambiente nativo para testar a versão web.

A arquitetura deve permitir reutilizar a mesma lógica de conversão no PWA, Android e iOS. O Capacitor fornece um runtime nativo para transformar aplicações web em apps Android e iOS, mantendo uma base de código web. [web:18][web:20]

---

## Testes obrigatórios

Criar testes para:

- Converter BRL para USD.
- Converter USD para BRL.
- Converter EUR para BRL.
- Inverter moedas.
- Formatar números brasileiros.
- Formatar números americanos.
- Identificar `R$ 129,90`.
- Identificar `US$ 49.99`.
- Identificar `€ 39,90`.
- Rejeitar texto sem valor.
- Rejeitar número de telefone.
- Usar cache quando a API falhar.
- Mostrar erro quando não existir cache.
- Validar moeda não suportada.

Executar:

```bash
npm test
```

Todos os testes devem passar antes de finalizar.

---

## README obrigatório

Criar um README em português contendo:

1. O que é o Currency Quick.
2. Requisitos de instalação.
3. Como executar `npm run setup`.
4. Como executar `npm run dev`.
5. Como executar `npm run build`.
6. Como instalar a extensão no Chrome.
7. Como instalar a extensão no Edge e Brave.
8. Como instalar o PWA no Windows.
9. Como instalar no Android.
10. Como adicionar à tela inicial no iPhone.
11. Como configurar provedor real.
12. Limitações de cotações.
13. Como criar APK com Capacitor.
14. Como criar app iOS.
15. Como solucionar erros comuns.

Incluir esta observação:

> A conversão depende da fonte de dados configurada. APIs públicas podem ter atraso, limites de requisição e taxas de referência. Para valores de compra, venda, cartão, remessa ou investimento, conferir a cotação final do provedor financeiro.

---

## Critérios de aceite

A tarefa somente estará concluída quando todos os itens abaixo forem verdadeiros:

- O projeto inicia com `npm run setup`.
- O projeto inicia com `npm run dev`.
- O PWA abre no navegador.
- O PWA converte BRL, USD e EUR.
- O PWA exibe atualização e cache.
- O PWA funciona com a última cotação salva sem internet.
- O PWA possui manifest válido.
- O service worker é registrado sem erro.
- Os ícones existem e não estão vazios.
- A extensão possui `manifest.json` válido.
- A extensão carrega pelo Chrome em modo desenvolvedor.
- O popup converte moedas.
- O menu de contexto funciona em uma página HTTP/HTTPS.
- A seleção de preços abre o widget.
- O widget permite copiar o resultado.
- A página de opções salva configurações.
- Os testes passam.
- Não existem chaves reais hardcoded.
- Não existem arquivos ZIP falsos.
- O README explica todos os comandos.

---

## Instrução final para a IDE

Execute a criação do projeto agora. Gere todos os arquivos. Gere os ícones. Instale as dependências. Execute os testes. Corrija erros de sintaxe, importação, build e permissões. Verifique se a extensão pode ser carregada diretamente pelo Chrome e se o PWA funciona pelo Vite.

Ao terminar, apresente:

- Árvore final de arquivos.
- Comandos executados.
- Resultado dos testes.
- Caminho da pasta da extensão pronta.
- Caminho da pasta do build web.
- Instrução exata para carregar a extensão.
- Eventuais limitações da API de câmbio escolhida.
