// ==UserScript==
// @name         Flashscore Global Toggle
// @namespace    https://github.com/jhojhocraazy/ubo-lite-tampermonkey-personal-filter
// @version      2.0
// @description  Controle global para expandir e recolher todas as competições no Flashscore de uma só vez, com painel arrastável, atalhos de teclado (Alt+C/Alt+E) e suporte a SPA.
// @author       Antigravity
// @match        *://*.flashscore.com/*
// @match        *://*.flashscore.com.br/*
// @match        *://*.flashscore.pt/*
// @match        *://*.flashscore.es/*
// @match        *://*.flashscore.it/*
// @match        *://*.flashscore.de/*
// @grant        none
// @run-at       document-idle
// @updateURL    https://raw.githubusercontent.com/jhojhocraazy/ubo-lite-tampermonkey-personal-filter/main/scripts/flashscore-toggle.user.js
// @downloadURL  https://raw.githubusercontent.com/jhojhocraazy/ubo-lite-tampermonkey-personal-filter/main/scripts/flashscore-toggle.user.js
// ==/UserScript==

(function() {
    'use strict';

    // 1. SELETORES MULTILÍNGUES ROBUSTOS
    const EXPAND_SELECTORS = [
        'button[aria-label*="Exibir todos os jogos" i]',
        'button[aria-label*="Mostrar todos" i]',
        'button[aria-label*="Show all" i]',
        'button[aria-label*="Desplegar" i]',
        'button[aria-label*="Mostra tutte" i]',
        'button[aria-label*="Alle Spiele anzeigen" i]',
        '.event__header--collapsed .event__headerToggle',
        '.headerRow--collapsed .accordionToggle'
    ];

    const COLLAPSE_SELECTORS = [
        'button[aria-label*="Ocultar todos os jogos" i]',
        'button[aria-label*="Recolher todos" i]',
        'button[aria-label*="Hide all" i]',
        'button[aria-label*="Plegar" i]',
        'button[aria-label*="Nascondi tutte" i]',
        'button[aria-label*="Alle Spiele ausblenden" i]',
        '.event__header:not(.event__header--collapsed) .event__headerToggle',
        '.headerRow:not(.headerRow--collapsed) .accordionToggle'
    ];

    // 2. LÓGICA DE AÇÃO
    function executarAcao(acao) {
        const seletores = (acao === 'expandir') ? EXPAND_SELECTORS : COLLAPSE_SELECTORS;
        let botoesEncontrados = [];

        for (const sel of seletores) {
            try {
                const elementos = document.querySelectorAll(sel);
                if (elementos && elementos.length > 0) {
                    botoesEncontrados = Array.from(elementos);
                    break;
                }
            } catch (e) {}
        }

        const botoesValidos = botoesEncontrados.filter(b => b && (b.offsetHeight > 0 || b.offsetWidth > 0));

        if (botoesValidos.length === 0) {
            mostrarToast(acao === 'expandir' ? 'Todas já estão expandidas!' : 'Todas já estão recolhidas!');
            return;
        }

        let contagem = 0;
        botoesValidos.forEach(btn => {
            try {
                btn.click();
                contagem++;
            } catch (e) {}
        });

        const mensagem = acao === 'expandir' 
            ? `🔽 ${contagem} competições expandidas!` 
            : `▲ ${contagem} competições recolhidas!`;

        mostrarToast(mensagem);
    }

    // 3. NOTIFICAÇÃO VISUAL (TOAST)
    let toastTimeout = null;
    function mostrarToast(texto) {
        let toast = document.getElementById('fs-toggle-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'fs-toggle-toast';
            toast.style.cssText = `
                position: fixed;
                bottom: 24px;
                left: 50%;
                transform: translateX(-50%) translateY(20px);
                background: rgba(14, 30, 40, 0.95);
                color: #ffffff;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                font-size: 13px;
                font-weight: 700;
                padding: 9px 18px;
                border-radius: 999px;
                border: 1px solid rgba(0, 217, 255, 0.35);
                box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6), 0 0 16px rgba(0, 217, 255, 0.2);
                z-index: 100000;
                opacity: 0;
                transition: transform 0.25s ease, opacity 0.25s ease;
                pointer-events: none;
            `;
            document.body.appendChild(toast);
        }

        toast.textContent = texto;
        clearTimeout(toastTimeout);

        requestAnimationFrame(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateX(-50%) translateY(0)';
        });

        toastTimeout = setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(-50%) translateY(20px)';
        }, 2200);
    }

    // 4. CRIAÇÃO DO PAINEL ARRASTÁVEL
    function criarPainelControle() {
        if (document.getElementById('flashscore-controle-jogos')) return;

        const painel = document.createElement('div');
        painel.id = 'flashscore-controle-jogos';
        painel.setAttribute('title', 'Controle Global Flashscore\nAtalhos: Alt+C (Recolher) | Alt+E (Expandir)');

        const posSalva = localStorage.getItem('fs_toggle_pos');
        let posCSS = 'top: 68px; right: 20px;';
        if (posSalva) {
            try {
                const { top, left } = JSON.parse(posSalva);
                posCSS = `top: ${top}px; left: ${left}px; right: auto;`;
            } catch (e) {}
        }

        painel.style.cssText = `
            position: fixed;
            ${posCSS}
            z-index: 99999;
            background: rgba(14, 30, 40, 0.94);
            border: 1px solid rgba(255, 255, 255, 0.12);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            border-radius: 8px;
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.5), 0 0 1px rgba(255, 255, 255, 0.2);
            padding: 4px;
            display: flex;
            align-items: center;
            gap: 4px;
            user-select: none;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            transition: border-color 0.2s ease, box-shadow 0.2s ease;
        `;

        painel.onmouseenter = () => {
            painel.style.borderColor = 'rgba(0, 217, 255, 0.4)';
            painel.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.6), 0 0 12px rgba(0, 217, 255, 0.25)';
        };
        painel.onmouseleave = () => {
            painel.style.borderColor = 'rgba(255, 255, 255, 0.12)';
            painel.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.5), 0 0 1px rgba(255, 255, 255, 0.2)';
        };

        const handle = document.createElement('div');
        handle.innerHTML = '⋮⋮';
        handle.style.cssText = `
            color: #738392;
            cursor: grab;
            padding: 4px 5px;
            font-size: 14px;
            line-height: 1;
            font-weight: 900;
        `;
        handle.title = 'Segure para arrastar o controle para onde preferir';

        const baseBtnStyle = `
            background: #1a2a36;
            color: #d1dde6;
            border: 1px solid rgba(255, 255, 255, 0.08);
            padding: 6px 12px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 11.5px;
            font-weight: 700;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            letter-spacing: 0.02em;
            transition: all 0.15s ease;
            outline: none;
        `;

        const btnRecolher = document.createElement('button');
        btnRecolher.type = 'button';
        btnRecolher.innerHTML = '<span style="font-size: 10px;">▲</span> Recolher';
        btnRecolher.style.cssText = baseBtnStyle;
        btnRecolher.title = 'Oculta todas as competições (Alt+C)';
        btnRecolher.onclick = () => executarAcao('recolher');
        btnRecolher.onmouseenter = () => {
            btnRecolher.style.background = '#ff2e43';
            btnRecolher.style.color = '#ffffff';
            btnRecolher.style.borderColor = '#ff2e43';
        };
        btnRecolher.onmouseleave = () => {
            btnRecolher.style.background = '#1a2a36';
            btnRecolher.style.color = '#d1dde6';
            btnRecolher.style.borderColor = 'rgba(255, 255, 255, 0.08)';
        };

        const btnExpandir = document.createElement('button');
        btnExpandir.type = 'button';
        btnExpandir.innerHTML = '<span style="font-size: 10px;">▼</span> Expandir';
        btnExpandir.style.cssText = baseBtnStyle;
        btnExpandir.title = 'Exibe todas as competições (Alt+E)';
        btnExpandir.onclick = () => executarAcao('expandir');
        btnExpandir.onmouseenter = () => {
            btnExpandir.style.background = '#00d9ff';
            btnExpandir.style.color = '#040d14';
            btnExpandir.style.borderColor = '#00d9ff';
        };
        btnExpandir.onmouseleave = () => {
            btnExpandir.style.background = '#1a2a36';
            btnExpandir.style.color = '#d1dde6';
            btnExpandir.style.borderColor = 'rgba(255, 255, 255, 0.08)';
        };

        painel.appendChild(handle);
        painel.appendChild(btnRecolher);
        painel.appendChild(btnExpandir);
        document.body.appendChild(painel);

        tornarArrastavel(painel, handle);
    }

    function tornarArrastavel(el, handle) {
        let isDragging = false;
        let startX, startY, initialLeft, initialTop;

        handle.addEventListener('mousedown', (e) => {
            isDragging = true;
            handle.style.cursor = 'grabbing';
            const rect = el.getBoundingClientRect();
            startX = e.clientX;
            startY = e.clientY;
            initialLeft = rect.left;
            initialTop = rect.top;

            function onMouseMove(ev) {
                if (!isDragging) return;
                const deltaX = ev.clientX - startX;
                const deltaY = ev.clientY - startY;
                const newLeft = Math.max(10, Math.min(window.innerWidth - el.offsetWidth - 10, initialLeft + deltaX));
                const newTop = Math.max(10, Math.min(window.innerHeight - el.offsetHeight - 10, initialTop + deltaY));
                
                el.style.left = `${newLeft}px`;
                el.style.top = `${newTop}px`;
                el.style.right = 'auto';
            }

            function onMouseUp() {
                if (isDragging) {
                    isDragging = false;
                    handle.style.cursor = 'grab';
                    document.removeEventListener('mousemove', onMouseMove);
                    document.removeEventListener('mouseup', onMouseUp);

                    const rect = el.getBoundingClientRect();
                    localStorage.setItem('fs_toggle_pos', JSON.stringify({ top: rect.top, left: rect.left }));
                }
            }

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });
    }

    // 5. ATALHOS DE TECLADO (Alt+C e Alt+E)
    document.addEventListener('keydown', (e) => {
        const tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : '';
        if (tag === 'input' || tag === 'textarea' || e.target.isContentEditable) return;

        if (e.altKey && (e.key === 'c' || e.key === 'C')) {
            e.preventDefault();
            executarAcao('recolher');
        } else if (e.altKey && (e.key === 'e' || e.key === 'E')) {
            e.preventDefault();
            executarAcao('expandir');
        }
    });

    // 6. OBSERVER PARA NAVEGAÇÃO SPA
    setInterval(() => {
        if (!document.getElementById('flashscore-controle-jogos')) {
            criarPainelControle();
        }
    }, 1500);

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', criarPainelControle);
    } else {
        criarPainelControle();
    }
})();
