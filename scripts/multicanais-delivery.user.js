// ==UserScript==
// @name         Multicanais Delivery Cleaner
// @namespace    https://github.com/jhojhocraazy/ubo-lite-tampermonkey-personal-filter
// @version      1.0
// @description  Remove popups FUTEBLOX, botão magnético, falso botão de play (#ad-gate), QR Code Sporturbo e neutraliza popunders (AdCash) e anti-devtools no multicanais.delivery.
// @author       Antigravity
// @match        *://multicanais.delivery/*
// @match        *://*.multicanais.delivery/*
// @match        *://sporturbo.link/*
// @match        *://*.sporturbo.link/*
// @include      *://*multicanais*/*
// @include      *://*sporturbo*/*
// @run-at       document-start
// @grant        GM_addStyle
// @updateURL    https://raw.githubusercontent.com/jhojhocraazy/ubo-lite-tampermonkey-personal-filter/main/scripts/multicanais-delivery.user.js
// @downloadURL  https://raw.githubusercontent.com/jhojhocraazy/ubo-lite-tampermonkey-personal-filter/main/scripts/multicanais-delivery.user.js
// ==/UserScript==

(function() {
    'use strict';

    console.log('[Multicanais Delivery Cleaner] Ativo em:', window.location.href);

    // 1. BLOQUEIO DE SCRIPTS E REQUISIÇÕES (Rede / Popunders / Telemetria)
    const BLOCKED_PATTERNS = [
        /sporturbo\.link\/(tcv-lt|lt\.min)\.js/i,
        /futeblox\.com/i,
        /devtools(-detector)?\.js/i,
        /disable-devtool/i,
        /acscdn\.com/i,
        /xtudoplay\.com/i,
        /keepon\.(js|php)/i,
        /pagead2\.googlesyndication\.com/i
    ];

    function isBlockedUrl(url) {
        if (!url || typeof url !== 'string') return false;
        return BLOCKED_PATTERNS.some(pattern => pattern.test(url));
    }

    // A) Bloqueia criação dinâmica de scripts (script.src = ...)
    try {
        const scriptDescriptor = Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype, 'src');
        if (scriptDescriptor && scriptDescriptor.set) {
            const originalSetSrc = scriptDescriptor.set;
            Object.defineProperty(HTMLScriptElement.prototype, 'src', {
                set: function(val) {
                    if (isBlockedUrl(val)) {
                        this.type = 'javascript/blocked';
                        return;
                    }
                    return originalSetSrc.call(this, val);
                },
                get: scriptDescriptor.get,
                configurable: true
            });
        }
    } catch (e) {}

    // B) Intercepta nós <script> e elementos invasivos no DOM
    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
                if (node.nodeType === 1) {
                    if (node.tagName === 'SCRIPT') {
                        const src = node.src || node.getAttribute('src');
                        if (isBlockedUrl(src)) {
                            node.type = 'javascript/blocked';
                            node.remove();
                        }
                    }
                    if (
                        node.id === 'fbxd-mount' ||
                        node.id === 'fbxd-tpl' ||
                        node.id === 'ad-gate' ||
                        node.id === 'fbx-rec' ||
                        node.id === 'fmcta' ||
                        node.classList?.contains('doodle') ||
                        node.classList?.contains('agx-root')
                    ) {
                        node.remove();
                    }
                }
            }
        }
    });

    if (document.documentElement) {
        observer.observe(document.documentElement, { childList: true, subtree: true });
    } else {
        document.addEventListener('DOMContentLoaded', () => {
            observer.observe(document.documentElement, { childList: true, subtree: true });
        });
    }

    // C) Bloqueia requisições fetch, XMLHttpRequest e sendBeacon
    try {
        if (window.fetch) {
            const originalFetch = window.fetch;
            window.fetch = function(...args) {
                const url = typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url);
                if (isBlockedUrl(url)) {
                    return Promise.reject(new Error('[Tampermonkey] Bloqueado: ' + url));
                }
                return originalFetch.apply(this, args);
            };
        }

        if (window.XMLHttpRequest) {
            const originalOpen = XMLHttpRequest.prototype.open;
            XMLHttpRequest.prototype.open = function(method, url, ...rest) {
                if (isBlockedUrl(url)) return;
                return originalOpen.call(this, method, url, ...rest);
            };
        }

        if (navigator.sendBeacon) {
            const originalBeacon = navigator.sendBeacon;
            navigator.sendBeacon = function(url, data) {
                if (isBlockedUrl(url)) return true;
                return originalBeacon.call(this, url, data);
            };
        }
    } catch (e) {}

    // D) Neutraliza objetos globais de Anti-DevTools, Anti-Adblock e Popunder
    try {
        window.__acpop = 1;
        window.__fmcta = 1;
        window.__adgate = 1;
        window._paq = { push: () => {} };
        window.DisableDevtool = () => {};
        Object.defineProperty(window, 'disableDevtool', {
            get: () => (() => {}),
            set: () => {},
            configurable: false
        });
    } catch (e) {}

    // 2. REGRAS COSMÉTICAS (CSS Imediato)
    const css = `
        #ad-gate,
        #tvlt,
        .embed-button,
        [class*="tvlt-"],
        [id*="tvlt"],
        div.fbxp-ov.on,
        .fbxp-ov,
        .agx-root,
        #fbx-rec,
        #fmcta,
        .doodle,
        #doodle,
        #fbxd-mount,
        #fbxd-tpl,
        #downloadFloat,
        .download-float,
        .download-float-header,
        .calendar-float,
        #mcBanner,
        #hntvBanner,
        #fbx-promo,
        #fbxn,
        #fbxSg,
        #fbxCp,
        #fbxParticles,
        span.wrap {
            display: none !important;
            opacity: 0 !important;
            visibility: hidden !important;
            pointer-events: none !important;
            position: absolute !important;
            z-index: -99999 !important;
            width: 0 !important;
            height: 0 !important;
            overflow: hidden !important;
        }

        html, body {
            overflow: auto !important;
        }
    `;

    try {
        if (typeof GM_addStyle !== 'undefined') {
            GM_addStyle(css);
        } else {
            const style = document.createElement('style');
            style.textContent = css;
            (document.head || document.documentElement).appendChild(style);
        }
    } catch (e) {}

    // 3. LIMPEZA ATIVA DE ELEMENTOS DINÂMICOS
    function cleanElements() {
        const SELECTORS = [
            '#ad-gate',
            '#fbxd-mount',
            '#fbxd-tpl',
            '#fbx-rec',
            '#fmcta',
            '#mcBanner',
            '#downloadFloat',
            '.fbxp-ov',
            '#tvlt',
            '.doodle'
        ];

        SELECTORS.forEach(sel => {
            document.querySelectorAll(sel).forEach(el => el.remove());
        });
    }

    cleanElements();
    document.addEventListener('DOMContentLoaded', cleanElements);
    window.addEventListener('load', cleanElements);
})();
