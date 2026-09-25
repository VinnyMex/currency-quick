# Currency Quick

Conversor de moedas rápido disponível como **extensão Chrome (Manifest V3)** e **PWA (Progressive Web App)** com suporte offline.

## Funcionalidades

- Conversão entre 16 moedas: BRL, USD, EUR, GBP, JPY, CAD, AUD, CHF, ARS, CLP, MXN, CNY, KRW, INR, AED, ZAR
- Widget de conversão automática ao selecionar texto monetário em qualquer página
- Menu de contexto para converter seleções rapidamente
- Modo offline com cache de cotações (TTL configurável)
- PWA instalável no Windows, Android e iOS
- Histórico das últimas 10 conversões
- Copiar resultado e Web Share API
- Tema escuro por padrão, com alternância para claro
- Atalhos rápidos de pares de moedas

## Pré-requisitos

- Node.js 18 ou superior
- npm 9 ou superior

---

## Instalação rápida

```bash
npm run setup
```

Este comando instala as dependências e gera os ícones automaticamente.

---

## Comandos

| Comando | Descrição |
|---|---|
| `npm run dev` | Inicia o servidor de desenvolvimento da PWA |
| `npm run build` | Gera o build de produção da PWA em `dist/` |
| `npm run preview` | Pré-visualiza o build de produção |
| `npm test` | Executa os testes unitários (vitest) |
| `npm run test:watch` | Testes em modo watch |
| `npm run icons` | Gera todos os ícones PNG e SVG |
| `npm run extension:build` | Gera a extensão em `dist-extension/` e cria o ZIP |

---

## Extensão Chrome

### Desenvolvimento

1. Gere a extensão:
   ```bash
   npm run extension:build
   ```
2. Abra `chrome://extensions` no Chrome
3. Ative **Modo desenvolvedor** (canto superior direito)
4. Clique em **Carregar sem compactação**
5. Selecione a pasta `dist-extension/`

### Publicação

O arquivo `currency-quick-extension.zip` gerado pelo comando acima pode ser enviado diretamente ao [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole).

---

## PWA

### Rodar localmente

```bash
npm run dev
# Acesse: http://localhost:5173
```

### Build de produção

```bash
npm run build
npm run preview
```

### Instalar no Windows

1. Abra o Chrome e acesse o endereço da PWA (local ou publicada)
2. Na barra de endereços, clique no ícone de instalação (computador com seta para baixo)
3. Clique em **Instalar**
4. O app aparecerá no menu Iniciar e na área de trabalho

### Instalar no Android

1. Abra o Chrome no Android e acesse a URL da PWA
2. Toque no banner "Adicionar à tela inicial" ou vá em Menu > Instalar app
3. Confirme a instalação

### Instalar no iPhone (iOS)

1. Abra o Safari e acesse a URL da PWA
2. Toque no botão Compartilhar (retângulo com seta para cima)
3. Selecione **Adicionar à Tela de Início**
4. Confirme

---

## Configuração de Provedor de Cotação

Por padrão, o app usa a API gratuita [Frankfurter](https://www.frankfurter.app) (sem necessidade de chave).

### Usando um provedor real (ex: Open Exchange Rates)

1. Crie o arquivo `.env` baseado no `.env.example`:
   ```
   VITE_EXCHANGE_PROVIDER=real
   VITE_EXCHANGE_API_URL=https://openexchangerates.org/api/latest.json
   VITE_EXCHANGE_API_KEY=sua_chave_aqui
   ```
2. Reconstrua a PWA: `npm run build`

Para a extensão, configure as opções via `⚙ Configurações` no popup.

### Limitações da API Frankfurter (demo)

- Não suporta BRL como moeda base — a conversão é feita via intermediário (EUR ou USD)
- Atualiza uma vez por dia nos dias úteis
- Não disponível offline (depende de cache)

---

## Capacitor (Android/iOS nativo)

Para gerar apps nativos com Capacitor:

```bash
npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios
npx cap add android
npx cap add ios
npm run build
npx cap sync
npx cap open android  # abre o Android Studio
npx cap open ios      # abre o Xcode
```

---

## Testes

```bash
npm test           # executa uma vez
npm run test:watch # modo watch (desenvolvimento)
```

Os testes cobrem:
- `tests/converter.test.js` — lógica de conversão e inversão de moedas
- `tests/parser.test.js` — parser de strings monetárias (BRL, USD, EUR, GBP, JPY, $)

---

## Estrutura do Projeto

```
CoinConverter/
├── extension/          # Extensão Chrome (Manifest V3)
│   ├── manifest.json
│   ├── background.js   # Service Worker da extensão
│   ├── content.js      # Script injetado nas páginas
│   ├── popup.*         # Interface do popup
│   └── options.*       # Página de configurações
├── src/
│   ├── main.js         # Lógica da PWA
│   ├── styles.css      # Estilos (tema escuro/claro)
│   └── shared/         # Código compartilhado
│       ├── currencies.js
│       ├── converter.js
│       ├── formatter.js
│       ├── storage.js
│       ├── rate-cache.js
│       ├── api-client.js
│       └── providers/
│           ├── demo-provider.js   # Frankfurter (gratuito)
│           └── real-provider.js   # API personalizada
├── scripts/
│   ├── generate-icons.js
│   └── build-extension.js
├── tests/
│   ├── converter.test.js
│   └── parser.test.js
├── public/             # Assets estáticos da PWA
├── index.html
├── manifest.webmanifest
├── sw.js               # Service Worker da PWA
└── vite.config.js
```

---

## Licença

MIT — veja [LICENSE](LICENSE).
