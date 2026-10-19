// ==UserScript==
// @name         Multicanais HD Cleaner (Dezpila Remover)
// @namespace    https://github.com/jhojhocraazy/ubo-lite-tampermonkey-personal-filter
// @version      1.0
// @description  Remove popup forçado de 4 segundos, botão flutuante piscante, topbar fixa e banners IPTV Dezpila, além de neutralizar popunders ryedebauch no multicanaishd.email.
// @author       Antigravity
// @match        *://multicanaishd.email/*
// @match        *://*.multicanaishd.email/*
// @include      *://*multicanaishd*/*
// @run-at       document-start
// @grant        GM_addStyle
// @updateURL    https://raw.githubusercontent.com/jhojhocraazy/ubo-lite-tampermonkey-personal-filter/main/scripts/multicanais-hd.user.js
// @downloadURL  https://raw.githubusercontent.com/jhojhocraazy/ubo-lite-tampermonkey-personal-filter/main/scripts/multicanais-hd.user.js
// ==/UserScript==

(function() {
    'use strict';

    console.log('[Multicanais HD Cleaner] Ativo em:', window.location.href);

    // 1. BLOQUEIO DE SCRIPTS E REQUISIÇÕES (Popunders Ryedebauch e Rastreadores)
    const BLOCKED_PATTERNS = [
        /ryedebauch\.com/i,
        /waust\.at/i,
        /dezpila\.press/i
    ];

    function isBlockedUrl(url) {
        if (!url || typeof url !== 'string') return false;
        return BLOCKED_PATTERNS.some(pattern => pattern.test(url));
    }

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
                        node.id === 'overlay-banner' ||
                        node.id === 'iptv-float' ||
                        node.id === 'iptv-topbar' ||
                        node.id === 'alert' ||
                        node.classList?.contains('iptv-hero') ||
                        node.classList?.contains('dezpila-ad-section')
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

    // Neutraliza rastreador global Who's Amung Us
    window._wau = [];

    // 2. REGRAS COSMÉTICAS
    const css = `
        #overlay-banner,
        #iptv-float,
        #iptv-topbar,
        .iptv-hero,
        .dezpila-ad-section,
        .dezpila-banner-link,
        .dezpila-banner-img,
        .dezpila-disclaimer,
        .dezpila-popup-link,
        .banner-iptv,
        a[href*="dezpila.press"],
        a[href*="dezpila"],
        #alert {
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
            padding-top: 0 !important;
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

    // 3. LIMPEZA ATIVA DE ELEMENTOS
    function cleanElements() {
        const SELECTORS = [
            '#overlay-banner',
            '#iptv-float',
            '#iptv-topbar',
            '.iptv-hero',
            '.dezpila-ad-section',
            'a[href*="dezpila.press"]',
            '#alert'
        ];

        SELECTORS.forEach(sel => {
            document.querySelectorAll(sel).forEach(el => el.remove());
        });

        if (document.body) {
            document.body.style.paddingTop = '0px';
        }
    }

    cleanElements();
    document.addEventListener('DOMContentLoaded', cleanElements);
    window.addEventListener('load', cleanElements);
})();
