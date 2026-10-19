# 🛡️ uBO Lite & Tampermonkey Personal Filter

Repositório pessoal e integrado de **Userscripts (Tampermonkey)** e **Filtros Unificados (uBlock Origin Lite)** para limpeza de sites de streaming, mídia e utilitários esportivos.

> 🤝 **Filosofia do Projeto:**  
> - **Tampermonkey:** 1 Userscript modular e independente para cada site/domínio.
> - **uBlock Origin Lite:** 1 lista de filtros unificada e consolidada para todos os sites.
> - **Sincronia:** Sempre que um novo site ou armadilha for identificado, o Userscript e a lista do uBO Lite são atualizados juntos.

---

## ⚡ Instalação Direta no Tampermonkey (1 Clique)

Com o Tampermonkey instalado no navegador, clique em qualquer um dos links abaixo para instalar:

| Script | Sites Atendidos | Link de Instalação (Raw) |
| :--- | :--- | :--- |
| **1. Multicanais Delivery** | `multicanais.delivery`, `sporturbo.link` | [Instalar multicanais-delivery.user.js](https://raw.githubusercontent.com/jhojhocraazy/ubo-lite-tampermonkey-personal-filter/main/scripts/multicanais-delivery.user.js) |
| **2. Multicanais HD** | `multicanaishd.email` e clones Dezpila | [Instalar multicanais-hd.user.js](https://raw.githubusercontent.com/jhojhocraazy/ubo-lite-tampermonkey-personal-filter/main/scripts/multicanais-hd.user.js) |
| **3. Flashscore Toggle** | `flashscore.com.br`, `flashscore.*` | [Instalar flashscore-toggle.user.js](https://raw.githubusercontent.com/jhojhocraazy/ubo-lite-tampermonkey-personal-filter/main/scripts/flashscore-toggle.user.js) |

> 🔄 **Atualizações Automáticas:**  
> Graças às diretivas `@updateURL` e `@downloadURL`, o Tampermonkey busca e instala atualizações automaticamente sempre que novos commits forem enviados ao GitHub!

---

## 🛡️ Filtros Unificados para o uBlock Origin Lite

A lista completa e consolidada de regras cosméticas (`##`) e de rede (`||...^`) está localizada em:

* **Arquivo Local:** [`filters/ubo-lite-filters.txt`](filters/ubo-lite-filters.txt)
* **Link Raw do GitHub:**  
  `https://raw.githubusercontent.com/jhojhocraazy/ubo-lite-tampermonkey-personal-filter/main/filters/ubo-lite-filters.txt`

### Como Importar no uBlock Origin Lite:
1. Abra o menu da extensão **uBlock Origin Lite**.
2. Vá em **Configurações / Opções** $\rightarrow$ aba **Regras personalizadas** (ou Minhas Regras).
3. Cole o conteúdo de [ubo-lite-filters.txt](filters/ubo-lite-filters.txt) e clique em **Salvar**.

---

## 📁 Estrutura do Repositório

```text
ubo-lite-tampermonkey-personal-filter/
├── .gitignore                         # Arquivos ignorados
├── AGENTS.md                          # Protocolo permanente de engenharia reversa para agentes de IA
├── README.md                          # Este guia completo
├── docs/
│   └── METHODOLOGY.md                 # Documentação técnica e catálogo de armadilhas
├── filters/
│   └── ubo-lite-filters.txt           # Regras estáticas unificadas para o uBlock Origin Lite
├── scripts/
│   ├── multicanais-delivery.user.js   # Script 1: Multicanais Delivery + Sporturbo
│   ├── multicanais-hd.user.js         # Script 2: Multicanais HD (Dezpila Remover)
│   └── flashscore-toggle.user.js      # Script 3: Flashscore Controle Global (Expandir/Recolher)
└── tools/
    └── audit.js                       # CLI para auditar e extrair regras de novos links
```

---

## 🔍 Como Auditar Novos Sites

Para auditar um novo link e extrair automaticamente as armadilhas e regras:

```bash
node tools/audit.js https://site-desejado.com/
```
