#!/usr/bin/env node

/**
 * Ferramenta Automatizada de Auditoria e Diagnóstico de Sites
 * Uso: node tools/audit.js <URL>
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

const targetUrl = process.argv[2];

if (!targetUrl) {
    console.log('Uso: node tools/audit.js <URL>');
    console.log('Exemplo: node tools/audit.js https://multicanais.delivery/');
    process.exit(1);
}

console.log(`\n🔍 [AUDITOR] Iniciando inspeção em: ${targetUrl}`);

function fetchUrl(target, maxRedirects = 5) {
    return new Promise((resolve, reject) => {
        if (maxRedirects <= 0) return reject(new Error('Muitos redirecionamentos'));

        const parsed = new URL(target);
        const client = parsed.protocol === 'https:' ? https : http;

        const req = client.get(target, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7'
            }
        }, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                const nextUrl = new URL(res.headers.location, target).href;
                console.log(`↪ Redirecionado para: ${nextUrl}`);
                return resolve(fetchUrl(nextUrl, maxRedirects - 1));
            }

            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({ body: data, finalUrl: target }));
        });

        req.on('error', reject);
    });
}

function analyzeHtml(html, pageUrl) {
    console.log('\n======================================================');
    console.log('                 RELATÓRIO DE AUDITORIA               ');
    console.log('======================================================\n');

    let processedHtml = html;
    let isObfuscated = false;

    // 1. Verificação de Ofuscação por XOR / Base64 / document.write
    const keyMatch = html.match(/var\s+([a-zA-Z0-9_]+)=\[([0-9,]+)\]/);
    const b64Match = html.match(/([a-zA-Z0-9_]+)=atob\("([^"]+)"\)/);

    if (keyMatch && b64Match) {
        try {
            const key = JSON.parse('[' + keyMatch[2] + ']');
            const b64 = b64Match[2];
            const bin = Buffer.from(b64, 'base64').toString('binary');
            let r = '';
            for (let i = 0; i < bin.length; i++) {
                r += String.fromCharCode(bin.charCodeAt(i) ^ key[i % key.length]);
            }
            processedHtml = decodeURIComponent(escape(r));
            isObfuscated = true;
            console.log('⚠️ [ALERTA] Payload ofuscado com XOR + Base64 detectado e decodificado com sucesso!');
            console.log(`   Tamanho do HTML real decodificado: ${(processedHtml.length / 1024).toFixed(1)} KB\n`);
        } catch (e) {
            console.log('⚠️ [AVISO] Tentativa de desofuscação XOR encontrou erro:', e.message);
        }
    }

    // 2. Detecção de Scripts Externos
    const scriptMatches = [...processedHtml.matchAll(/<script[^>]*src=["']([^"']+)["']/gi)].map(m => m[1]);
    const uniqueScripts = Array.from(new Set(scriptMatches));

    console.log(`📦 Scripts externos encontrados (${uniqueScripts.length}):`);
    const threats = {
        popunders: [],
        antiDevtools: [],
        antiAdblock: [],
        telemetry: [],
        others: []
    };

    uniqueScripts.forEach(src => {
        if (/acscdn|adcash|ryedebauch|adsterra|popcash|propeller|clickadu/i.test(src)) {
            threats.popunders.push(src);
        } else if (/disable-devtool|devtools-detector/i.test(src)) {
            threats.antiDevtools.push(src);
        } else if (/keepon|adgate|antiadblock/i.test(src)) {
            threats.antiAdblock.push(src);
        } else if (/matomo|_paq|waust|google-analytics|clarity/i.test(src)) {
            threats.telemetry.push(src);
        } else {
            threats.others.push(src);
        }
    });

    if (threats.popunders.length) console.log('  🚨 Popunders/Malvertising:', threats.popunders);
    if (threats.antiDevtools.length) console.log('  🛡️ Anti-DevTools:', threats.antiDevtools);
    if (threats.antiAdblock.length) console.log('  🧱 Anti-AdBlock:', threats.antiAdblock);
    if (threats.telemetry.length) console.log('  📊 Telemetria/Trackers:', threats.telemetry);

    // 3. Detecção de Shadow DOM
    const hasShadowDom = /attachShadow\s*\(|\.shadowRoot/i.test(processedHtml);
    if (hasShadowDom) {
        console.log('\n👻 [ALERTA SHADOW DOM] Elementos encapsulados em Shadow DOM detectados!');
        console.log('   Recomendação: Para remover botões encapsulados (ex: .doodle), oculte/remova o elemento hospedeiro no DOM pai.');
    }

    // 4. Detecção de Falsos Botões de Play e Armadilhas
    const hasFakePlay = /ad-gate|play-gate|fake-player|click to play|clique para assistir/i.test(processedHtml);
    if (hasFakePlay) {
        console.log('\n🛑 [ALERTA PLAYER] Possível botão de play falso ou armadilha de primeiro clique detectada!');
    }

    // 5. Extração de Seletores Suspeitos (IDs e Classes)
    const idMatches = [...processedHtml.matchAll(/id=["']([^"']+)["']/gi)].map(m => m[1]);
    const classMatches = [...processedHtml.matchAll(/class=["']([^"']+)["']/gi)].map(m => m[1].split(/\s+/)).flat();

    const adIds = Array.from(new Set(idMatches.filter(id => 
        /ad|banner|float|promo|pop|embed|bet|fake|overlay|tvlt|hntv|player-overlay|rec/i.test(id)
    )));

    const adClasses = Array.from(new Set(classMatches.filter(c => 
        /ad|banner|float|promo|pop|embed|bet|fake|overlay|badge|hero/i.test(c)
    )));

    console.log('\n🎯 IDs de anúncios e elementos flutuantes recomendados para bloqueio:');
    console.log(adIds.slice(0, 25));

    console.log('\n🎯 Classes suspeitas para bloqueio:');
    console.log(adClasses.slice(0, 25));

    // 6. Geração de Sugestão de Regras
    const parsedUrl = new URL(pageUrl);
    const domain = parsedUrl.hostname.replace(/^www\./, '');

    console.log('\n======================================================');
    console.log('            SUGESTÃO DE FILTROS UBLOCK LITE           ');
    console.log('======================================================\n');
    adIds.slice(0, 10).forEach(id => console.log(`${domain}###${id}`));
    adClasses.slice(0, 10).forEach(cls => console.log(`${domain}##.${cls}`));

    console.log('\n======================================================');
    console.log('         SUGESTÃO DE METADADOS TAMPERMONKEY           ');
    console.log('======================================================\n');
    console.log(`// @match        *://${domain}/*`);
    console.log(`// @match        *://*.${domain}/*`);
    console.log(`// @include      *://*${domain.split('.')[0]}*/*`);
    console.log(`// @run-at       document-start`);
    console.log(`// @grant        GM_addStyle`);
}

fetchUrl(targetUrl)
    .then(({ body, finalUrl }) => analyzeHtml(body, finalUrl))
    .catch(err => console.error('❌ Erro durante a auditoria:', err.message));
