# Playbook de Engenharia Reversa e Limpeza de Sites (AdBlock & Userscripts)

Este repositório é dedicado à auditoria, desofuscação e criação de filtros de alta precisão para remoção de anúncios agressivos, popunders, bloqueadores de DevTools, anti-adblockers e elementos intrusivos em sites de streaming, mídia e utilitários.

---

## 🏛️ Filosofia e Arquitetura do Repositório

1. **Tampermonkey (Scripts Modulares):**
   - **1 script dedicado para cada site/família de domínios** na pasta `scripts/`.
   - Exemplo: `scripts/multicanais-delivery.user.js`, `scripts/multicanais-hd.user.js`, `scripts/flashscore-toggle.user.js`.
   - Cada script possui suas próprias diretivas `@match`, `@include`, `@updateURL` e `@downloadURL` apontando para o raw do GitHub (`jhojhocraazy/ubo-lite-tampermonkey-personal-filter`).

2. **uBlock Origin Lite (Filtros Unificados):**
   - **1 arquivo único e consolidado** em `filters/ubo-lite-filters.txt`.
   - Todas as regras cosméticas (`##`) e de rede (`||...^`) de todos os sites ficam agrupadas e organizadas por seções nesse único arquivo.

3. **Sincronia Obrigatória:**
   - **Filtros e scripts andam SEMPRE juntos.** Ao identificar um novo site ou uma nova armadilha, crie/atualize o Userscript específico em `scripts/` e adicione simultaneamente as regras correspondentes no `filters/ubo-lite-filters.txt`.

---

## 🎯 Protocolo Padrão ao Receber um Novo Link

### 1. Coleta e Reconhecimento Técnico
1. **Baixar o HTML Real:** Sites de streaming frequentemente usam payloads ofuscados (`atob`, XOR, `document.write`). Use a ferramenta `node tools/audit.js <URL>` para descompactar e auditar em tempo de execução.
2. **Inspeção de Scripts Externos e Redes de Anúncios:**
   - Redes de popunder conhecidas (`acscdn.com`, `adcash`, `ryedebauch`, `adsterra`, `popcash`, etc.).
   - Scripts anti-devtools (`disable-devtool`, `devtools-detector`).
   - Rotinas anti-adblock (`keepon.js`, `adgate`, iscas com classe `ad-banner`).
   - Telemetrias ocultas (`matomo`, `waust.at`, trackers de clique).
3. **Inspeção de Elementos Visuais e Armadilhas:**
   - **Falsos botões de play:** Camadas com alto `z-index` cobrindo o player de vídeo (ex: `#ad-gate`).
   - **Shadow DOM:** Botões flutuantes encapsulados em `attachShadow` (ex: `#fbxd-mount` / `.doodle`). Oculte e remova o hospedeiro pai.
   - **Botões perseguidores:** Scripts com listeners de `mousemove` / `requestAnimationFrame` (ex: `#fmcta`).
   - **Popups de conversão forçados:** Modais disparados por `setTimeout` ou `setInterval` (ex: `#overlay-banner`, `.fbxp-ov`).
   - **Overlays do player:** Popups de QR code embutidos no iframe do player (ex: `#tvlt` no Sporturbo).

---

### 2. Padrão de Implementação: Tampermonkey Userscript

Ao gerar ou atualizar um Userscript Tampermonkey, respeite as seguintes regras de arquitetura:

1. **Cabeçalho de Metadados Válido:**
   - **NUNCA use curinga no TLD de `@match`** (ex: `*://*.dominio.*/*` é INVÁLIDO no Chromium).
   - Use domínios explícitos no `@match` (`*://dominio.com/*`, `*://*.dominio.com/*`) e use `@include *://*dominio*/*` para cobrir espelhos/mirrors.
   - Sempre utilize `@run-at document-start` para interceptar scripts antes que eles comecem a rodar.
   - Solicite `@grant GM_addStyle` para injeção síncrona de CSS.
   - Inclua sempre `@updateURL` e `@downloadURL` apontando para o raw do repositório no GitHub.

2. **Interceptação de Scripts e Rede (Equivalente ao bloqueio de rede):**
   - Sobrescreva o setter `HTMLScriptElement.prototype.src` para bloquear scripts de anúncio antes que sejam requisitados pelo navegador.
   - Intercepte `window.fetch`, `XMLHttpRequest.prototype.open` e `navigator.sendBeacon`.
   - Use um `MutationObserver` no `document.documentElement` para remover tags `<script>` e nós invasivos antes da renderização.
   - Neutralize variáveis globais ativadas por scripts de anúncios (ex: `window.__acpop = 1`, `window.DisableDevtool = () => {}`).

3. **Injeção de CSS Imediata:**
   - Injete regras com `display: none !important; opacity: 0 !important; pointer-events: none !important; position: absolute !important; z-index: -99999 !important;`.
   - Adicione sempre `html, body { overflow: auto !important; }` para evitar que modais travem a rolagem da página.
