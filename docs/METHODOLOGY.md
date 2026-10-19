# Metodologia Completa de Engenharia Reversa e Limpeza de Sites

Este documento explica em detalhes técnicos todas as etapas, conceitos e soluções desenvolvidas durante a análise do Multicanais, Sporturbo e Flashscore.

---

## 1. Por que Bloqueadores Comuns Falham em Sites de Streaming?

Sites de streaming pirata ou não-oficiais utilizam estratégias avançadas para burlar extensões tradicionais de bloqueio de anúncios:

1. **Ofuscação de Código em Tempo de Execução:** O HTML entregue pelo servidor não contém o conteúdo real, mas sim um payload codificado em Base64 ou XOR. O script decodifica e injeta o DOM real via `document.write()`. Extensões que dependem apenas de regras estáticas muitas vezes não conseguem inspecionar o conteúdo antes de ele ser injetado.
2. **Encapsulamento em Shadow DOM:** Ao anexar elementos a uma `shadowRoot` (modo `open` ou `closed`), regras convencionais de CSS injetadas no documento pai (`document.head`) não conseguem estilizar nem ocultar os nós internos devido ao isolamento de escopo nativo da web.
3. **Sequestro de Eventos de Clique na Fase de Captura:** Scripts como `acpop.js` adicionam listeners globais de `pointerdown` e `mousedown` com o parâmetro `useCapture: true`. Isso significa que o script do anúncio recebe o clique **antes** do botão real do player ou da página.
4. **Armadilhas de Play Falso (`#ad-gate`):** Uma camada transparente ou semitransparente sobreposta ao player de vídeo (`z-index` superior) que captura o primeiro clique do usuário exclusivamente para abrir um popunder, se autodestruindo em seguida.
5. **Anti-DevTools Ativo:** Bibliotecas como `disable-devtool` bloqueiam teclas de atalho (F12, Ctrl+Shift+I), limpam o console com `console.clear()` em loop e congelam a aba usando `debugger` infinito se a ferramenta de desenvolvedor for detectada.

---

## 2. A Anatomia das Armadilhas Encontradas

### A) O Falso Botão de Play (`#ad-gate`)
* **Código Identificado:**
  ```javascript
  function gate() {
    var g = document.createElement('div');
    g.id = 'ad-gate';
    g.style.cssText = 'position:absolute;inset:0;z-index:7;...';
    g.innerHTML = '<div>Clique para assistir</div>';
    g.addEventListener('click', function() { g.remove(); }, { once: true });
    wrap.appendChild(g);
    armWhenReady(); // Arma o popunder AdCash antes do clique
  }
  ```
* **Diagnóstico:** O player real já está carregado por baixo, mas a div `#ad-gate` atua como um escudo opaco forçando o primeiro clique a disparar um anúncio em nova aba.
* **Solução:** Remover `#ad-gate` via CSS imediato (`display: none !important`) e via script (`node.remove()`), permitindo clique direto nos controles nativos do player.

### B) O Botão Magnético Perseguidor (`#fmcta` / `fmcta.js`)
* **Código Identificado:**
  ```javascript
  document.addEventListener('mousemove', function(e) {
    var bx = r.left + r.width / 2, by = r.top + r.height / 2;
    var dx = e.clientX - bx, dy = e.clientY - by, dist = Math.hypot(dx, dy);
    if (dist < 160) { tx = dx * 0.34; ty = dy * 0.34; }
  });
  ```
* **Diagnóstico:** O botão calcula a distância do cursor e se move em direção ao mouse para provocar cliques involuntários. Além disso, executa um loop ininterrupto de `requestAnimationFrame`.
* **Solução:** Impedir a inicialização setando `window.__fmcta = 1` antecipadamente e removendo `#fmcta` do DOM.

### C) O Botão Escondido em Shadow DOM (`#fbxd-mount` / `.doodle`)
* **Código Identificado:**
  ```html
  <div id="fbxd-mount"></div>
  <script>
    var mount = document.getElementById('fbxd-mount');
    var sh = mount.attachShadow({ mode: 'open' });
    // O botão .doodle é injetado dentro da shadowRoot
  </script>
  ```
* **Diagnóstico:** A regra CSS `.doodle { display: none !important; }` falha porque o CSS do documento não penetra a barreira do Shadow DOM.
* **Solução:** Ocultar e destruir o elemento hospedeiro `#fbxd-mount` e seu template `#fbxd-tpl`. Sem o elemento hospedeiro, o script do site aborta via `if (!mount) return;`.

### D) O Muro Anti-Adblock (`keepon.js` / `.agx-root`)
* **Código Identificado:**
  O script tenta carregar intencionalmente `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js` e checa elementos com classes `ad ads adsbox`. Se bloqueado, exibe um modal `.agx-root` e reporta para `/api/keepon.php`.
* **Solução:** Bloquear as requisições na rede e definir `window.__adgate = 1` no escopo global para que a biblioteca acredite que já foi inicializada.

---

## 3. Guia de Implementação no Tampermonkey

### A) Por que `@match *://*.dominio.*/*` Falha?
No padrão Chromium / Tampermonkey, a sintaxe de `@match` segue:
`<scheme>://<host>/<path>`
Onde `<host>` permite curinga **apenas no início** (`*://*.dominio.com/*`), mas **NUNCA no final/TLD** (`.*`).
* ❌ `*://*.multicanais.*/*` $\rightarrow$ **Inválido** (o Tampermonkey descarta o script silenciosamente).
* ✔️ `*://multicanais.delivery/*` $\rightarrow$ **Válido** (específico).
* ✔️ `@include *://*multicanais*/*` $\rightarrow$ **Válido** (a diretiva `@include` aceita curingas em qualquer posição).

### B) Interceptação Antecipada (`@run-at document-start`)
Ao configurar o script para rodar em `document-start`, o Tampermonkey executa o código **antes** que qualquer script da página comece a ser avaliado. Isso permite:
1. **Sobrescrever setters:**
   ```javascript
   const originalSetSrc = Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype, 'src').set;
   Object.defineProperty(HTMLScriptElement.prototype, 'src', {
     set: function(url) {
       if (isBlocked(url)) {
         this.type = 'javascript/blocked';
         return;
       }
       return originalSetSrc.call(this, url);
     }
   });
   ```
2. **Definir travas globais:**
   ```javascript
   window.__acpop = 1;
   window.DisableDevtool = () => {};
   ```
3. **Injetar CSS síncrono:**
   Garante que nenhum banner ou popup apareça na tela antes de ser escondido (elimina o efeito de "piscar" / *FOUC*).

---

## 4. Guia de Implementação no uBlock Origin Lite

O uBlock Origin Lite opera sob o Manifest V3 (MV3) utilizando regras estáticas (`declarativeNetRequest`) e filtros cosméticos:

* **Bloqueio de Scripts e Conexões de Rede:**
  ```adblock
  ||sporturbo.link/tcv-lt.js*
  ||futeblox.com^
  ||ryedebauch.com^
  ||acscdn.com^
  ```
* **Ocultação Cosmética:**
  ```adblock
  multicanais.*###ad-gate
  multicanais.*###fbxd-mount
  multicanaishd.*###overlay-banner
  sporturbo.link###tvlt
  ```
