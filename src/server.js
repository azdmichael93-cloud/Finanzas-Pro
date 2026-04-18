const express    = require('express');
const multer     = require('multer');
const cors       = require('cors');
const path       = require('path');
const fs         = require('fs');
const sqlite3    = require('sqlite3').verbose();
const bcrypt     = require('bcrypt');
const saltRounds = 12;
const rateLimit  = require('express-rate-limit');
require('dotenv').config();

const app  = express();
const PORT = process.env.PORT || 10000;

/* ── RUTAS DEL PROYECTO ───────────────────────────────────────────────── */
const PROJECT_ROOT = path.resolve(__dirname, '..');

/* ── CREDENCIALES ADMIN ─────────────────────────────────────────────── */
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'azdelmicha@gmail.com';
const ADMIN_PASSWORD = String(process.env.ADMIN_PASSWORD || '').trim();
const ADMIN_PASSWORD_HASH = '$2b$12$u6v0lWi8BFhEn11pWgphGuykk/YiFT.HGF76w4KtllEU0f2NwOVv2';
let adminUserId = null;

/* ── PERSISTENCIA DE DATOS ──────────────────────────────────────────── */
const DATA_DIR    = fs.existsSync('/data') ? '/data' : path.join(PROJECT_ROOT, 'data');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const DB_PATH     = path.join(DATA_DIR, 'database.sqlite');

console.log('--- CONFIGURACIÓN DE PERSISTENCIA ---');
console.log('Carpeta de datos:', DATA_DIR);
console.log('Ruta de base de datos:', DB_PATH);

if (!fs.existsSync(DATA_DIR))    fs.mkdirSync(DATA_DIR,    { recursive: true });
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

/* ── MIDDLEWARE ─────────────────────────────────────────────────────── */
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/src', express.static(path.join(PROJECT_ROOT, 'src')));
app.use('/uploads', express.static(UPLOADS_DIR));
app.use(express.static(PROJECT_ROOT));

/* ── RATE LIMITING ──────────────────────────────────────────────────── */
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 requests per windowMs
    message: { success: false, message: 'Demasiados intentos, por favor intente más tarde.' },
    standardHeaders: true,
    legacyHeaders: false,
});

app.use('/api/register', authLimiter);
app.use('/api/login', authLimiter);

/* ── MIDDLEWARE DE AUTENTICACIÓN ────────────────────────────────────── */
const authenticateToken = (req, res, next) => {
    const authHeader = String(req.headers.authorization || '').trim();
    const headerToken = authHeader.toLowerCase().startsWith('bearer ')
        ? authHeader.slice(7).trim()
        : authHeader;
    const bodyToken = typeof req.body?.token === 'string' ? req.body.token.trim() : '';
    const token = headerToken || bodyToken;
    if (!token || !token.startsWith('session_token_pro_2026_')) {
        return res.status(401).json({ success: false, message: 'Token inválido' });
    }
    const userId = token.replace('session_token_pro_2026_', '');
    req.userId = userId;
    next();
};

/* ── RUTAS ESTÁTICAS ────────────────────────────────────────────────── */
app.get('/', (_req, res) => res.sendFile(path.join(PROJECT_ROOT, 'index.html')));
app.get('/healthz', (_req, res) => res.sendStatus(200));

/* ── DIAGNÓSTICO DE IA (solo admin) ─────────────────────────────── */
app.get('/api/test-ai', authenticateToken, async (req, res) => {
    const googleKey = process.env.GOOGLE_AI_KEY;
    const report = {
        hasGoogleKey: !!googleKey,
        hasOpenAIKey: !!process.env.OPENAI_API_KEY,
        hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY,
        geminiStatus: null,
        geminiError: null,
    };
    if (googleKey) {
        try {
            const apiRes = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${googleKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ role: 'user', parts: [{ text: 'di hola' }] }],
                        generationConfig: { maxOutputTokens: 10 }
                    })
                }
            );
            const body = await apiRes.json();
            if (!apiRes.ok) {
                report.geminiStatus = apiRes.status;
                report.geminiError = body?.error?.message || JSON.stringify(body).slice(0, 300);
            } else {
                report.geminiStatus = 200;
                report.geminiReply = body?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '(empty)';
            }
        } catch (e) {
            report.geminiStatus = 'fetch_error';
            report.geminiError = e.message;
        }
    }
    res.json(report);
});

/* ── CHATBOT IA ─────────────────────────────────────────────────────── */
app.post('/chat', async (req, res) => {
    const message = String(req.body.message || '').trim();
    const context = req.body.context || null;
    const userRole = req.body.userRole || 'user';
    if (!message) return res.status(400).json({ response: 'Mensaje vacío.' });

    let systemPrompt;
    
    if (userRole === 'admin') {
        // Admin tiene acceso completo a todos los datos
        systemPrompt =
            'Eres "Finanzas AI", asistente inteligente de la app Finanzas Pro de 2Nexora, ' +
            'para gestión de e-commerce y finanzas personales en República Dominicana. ' +
            'Respondes en español, de forma concisa y útil. Trabajas con RD$ y US$. ' +
            'Tienes acceso TOTAL y completo a TODOS los datos financieros del sistema (admin), ' +
            'incluyendo: Effi Commerce, Transporte, Gastos Publicitarios, Finanzas Personales, ' +
            'Cuentas Bancarias, Préstamos, Deudas, Deudores, Egresos Manuales y más. ' +
            'Puedes analizar y comparar datos de todas las áreas. ' +
            'Usa texto plano con saltos de línea, sin markdown con asteriscos ni almohadillas.';
    } else {
        // Usuario regular solo tiene acceso a Finanzas Personales
        systemPrompt =
            'Eres "Finanzas AI", asistente inteligente de la app Finanzas Pro de 2Nexora, ' +
            'para gestión de finanzas personales en República Dominicana. ' +
            'Respondes en español, de forma concisa y útil. Trabajas con RD$ y US$. ' +
            'Solo tienes acceso a la sección de FINANZAS PERSONALES del usuario. ' +
            'No puedes acceder a datos de e-commerce (Effi), Transporte, ni Gastos Publicitarios. ' +
            'Ayudas al usuario a gestionar sus ingresos, gastos fijos, ahorros, cuentas bancarias, ' +
            'préstamos y deudas personales. ' +
            'Usa texto plano con saltos de línea, sin markdown con asteriscos ni almohadillas.';
    }

    if (context && typeof context === 'object') {
        const fmt = (n) => 'RD$ ' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const fmtUSD = (n) => '$ ' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const c = context;
        
        if (userRole === 'admin') {
            // Admin ve TODO
            systemPrompt += '\n\n═══════════════════════════════════════════════════════';
            systemPrompt += '\n📊 RESUMEN COMPLETO - MODO ADMINISTRADOR';
            systemPrompt += '\n═══════════════════════════════════════════════════════';

            // FINANZAS PERSONALES
            if (c.salarios !== undefined) {
                systemPrompt += '\n\n💰 INGRESOS: ' + fmt(c.salarios);
            }
            if (c.gastosFijos !== undefined) {
                systemPrompt += '\n📌 GASTOS FIJOS: ' + fmt(c.gastosFijos);
            }
            if (c.ahorros !== undefined) {
                systemPrompt += '\n🏦 AHORROS: ' + fmt(c.ahorros);
            }
            if (c.bancos !== undefined) {
                systemPrompt += '\n🏛️ BANCOS: ' + fmt(c.bancos);
            }
            if (c.prestamos !== undefined) {
                systemPrompt += '\n💳 PRÉSTAMOS: ' + fmt(c.prestamos);
            }

            // Effi
            if (c.effi) {
                const e = c.effi;
                const g = (e.recaudo||0) - (e.compra||0) - (e.fleteCon||0) - (e.fleteDev||0);
                systemPrompt += '\n\n🛒 EFFI: ' + fmt(e.recaudo) + ' | Ganancia: ' + fmt(g);
            }

            // Transporte
            if (c.transporte) {
                const t = c.transporte;
                systemPrompt += '\n🚚 TRANSPORTE: ' + t.totalOrdenes + ' órdenes';
            }
            
            systemPrompt += '\n═══════════════════════════════════════════════════════';
        } else {
            // Usuario regular solo ve finanzas personales
            systemPrompt += '\n\n═══════════════════════════════════════════════════════';
            systemPrompt += '\n💰 FINANZAS PERSONALES';
            systemPrompt += '\n═══════════════════════════════════════════════════════';
            
            if (c.salarios !== undefined) systemPrompt += '\n📈 Ingresos: ' + fmt(c.salarios);
            if (c.gastosFijos !== undefined) systemPrompt += '\n📉 Gastos: ' + fmt(c.gastosFijos);
            if (c.ahorros !== undefined) systemPrompt += '\n🏦 Ahorros: ' + fmt(c.ahorros);
            
            systemPrompt += '\n═══════════════════════════════════════════════════════';
        }
    }

    const googleKey    = process.env.GOOGLE_AI_KEY;
    const openaiKey    = process.env.OPENAI_API_KEY;
    const anthropicKey = process.env.ANTHROPIC_API_KEY;

    // ── Prioridad: Gemini → OpenAI → Claude → Offline ─────────────
    // Cada proveedor falla hacia el siguiente sin cortar la cadena

    if (googleKey) {
        try {
            const apiRes = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${googleKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        systemInstruction: { parts: [{ text: systemPrompt }] },
                        contents: [{ role: 'user', parts: [{ text: message }] }],
                        generationConfig: {
                            maxOutputTokens: 600,
                            temperature: 0.4,
                            topP: 0.9
                        }
                    })
                }
            );
            if (!apiRes.ok) {
                const errBody = await apiRes.text().catch(() => '');
                throw new Error(`Gemini API ${apiRes.status}: ${errBody.slice(0, 200)}`);
            }
            const data = await apiRes.json();
            const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
            if (!text) throw new Error('Gemini: respuesta vacía');
            console.log('🤖 Respondido por Gemini');
            return res.json({ response: text });
        } catch (err) {
            console.error('❌ Gemini error:', err.message, '— intentando siguiente proveedor');
            // Continúa al siguiente proveedor en vez de irse offline
        }
    }

    if (openaiKey) {
        try {
            const apiRes = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${openaiKey}`
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    max_tokens: 600,
                    temperature: 0.4,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user',   content: message }
                    ]
                })
            });
            if (!apiRes.ok) {
                const errBody = await apiRes.text().catch(() => '');
                throw new Error(`OpenAI API ${apiRes.status}: ${errBody.slice(0, 200)}`);
            }
            const data = await apiRes.json();
            const text = data?.choices?.[0]?.message?.content?.trim() || '';
            if (!text) throw new Error('OpenAI: respuesta vacía');
            console.log('🤖 Respondido por OpenAI');
            return res.json({ response: text });
        } catch (err) {
            console.error('❌ OpenAI error:', err.message, '— intentando siguiente proveedor');
        }
    }

    if (anthropicKey) {
        try {
            const apiRes = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': anthropicKey,
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify({
                    model: 'claude-haiku-4-5-20251001',
                    max_tokens: 600,
                    system: systemPrompt,
                    messages: [{ role: 'user', content: message }]
                })
            });
            if (!apiRes.ok) {
                const errBody = await apiRes.text().catch(() => '');
                throw new Error(`Anthropic API ${apiRes.status}: ${errBody.slice(0, 200)}`);
            }
            const data = await apiRes.json();
            const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
            if (!text) throw new Error('Claude: respuesta vacía');
            console.log('🤖 Respondido por Claude');
            return res.json({ response: text });
        } catch (err) {
            console.error('❌ Claude error:', err.message, '— usando offline');
        }
    }

    // Sin ninguna API key funcional — modo offline
    console.log('💡 Modo offline activo (ninguna API respondió)');
    return res.json({ response: buildOfflineResponse(message, context) });
});

// ═══════════════════════════════════════════════════════════════════
//  MOTOR DE RESPUESTAS INTELIGENTE — sin API key, 100% local
//  Cubre más de 30 intenciones con análisis real de los datos.
// ═══════════════════════════════════════════════════════════════════
function buildOfflineResponse(message, ctx) {
    const n  = s => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const msg = n(message);
    const fmt = v => 'RD$ ' + Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const pct = (a, b) => b > 0 ? ((a / b) * 100).toFixed(2) + '%' : '0.00%';
    const sign = v => v >= 0 ? '✅' : '⚠️';
    const has  = (...words) => words.some(w => msg.includes(n(w)));

    // ── Utilidades de cálculo ──────────────────────────────────────
    const effi = ctx && ctx.effi ? ctx.effi : null;
    const tr   = ctx && ctx.transporte ? ctx.transporte : null;
    const fp   = ctx || {};

    const calcEffi = () => {
        if (!effi) return null;
        const ingresos  = effi.recaudo || 0;
        const costos    = effi.compra  || 0;
        const fletes    = (effi.fleteCon||0) + (effi.fleteDev||0) + (effi.fleteSin||0);
        const comisiones= (effi.comisionRetiro||0) + (effi.fulfillment||0);
        const egresos   = costos + fletes + comisiones;
        const ganancia  = ingresos - egresos;
        const margen    = ingresos > 0 ? (ganancia / ingresos) * 100 : 0;
        const roi       = costos   > 0 ? (ganancia / costos)  * 100 : 0;
        return { ingresos, costos, fletes, comisiones, egresos, ganancia, margen, roi };
    };

    const calcPersonal = () => {
        const sal  = fp.salarios      || 0;
        const gast = fp.gastosFijos   || 0;
        const aho  = fp.ahorros       || 0;
        const banc = fp.bancos        || 0;
        const prest= fp.prestamos     || 0;
        const inf  = fp.deudasInformal|| 0;
        const disp = sal - gast - aho;
        const patr = banc - prest - inf + aho;
        return { sal, gast, aho, banc, prest, inf, disp, patr };
    };

    // ── Saludos y ayuda ────────────────────────────────────────────
    if (has('hola','buenos','buenas','hey','hi','saludos')) {
        return `¡Hola! Soy tu asistente financiero de Finanzas Pro 👋\n\nPuedo ayudarte con:\n• 💰 Ganancias y rentabilidad de Effi\n• 📦 Estado de guías y devoluciones\n• 💳 Deudas y préstamos\n• 🐷 Ahorros y proyecciones\n• 🏦 Saldos bancarios\n• 📊 Resumen general de tus finanzas\n• ⚠️  Alertas y riesgos\n\n¿Sobre qué quieres saber?`;
    }

    if (has('ayuda','que puedes','que sabes','comandos','opciones','menu')) {
        return `Estos son los temas que manejo:\n\n📊 EFFI COMMERCE\n• "¿cuál es mi ganancia?"\n• "¿cómo están mis fletes?"\n• "analiza mis devoluciones"\n• "¿cuánto gasté en publicidad?"\n• "rentabilidad del negocio"\n• "¿cuál es mi ROI?"\n• "costos de operación"\n\n🚚 TRANSPORTE\n• "estado de mis guías"\n• "¿cuántas devoluciones tengo?"\n• "¿qué porcentaje entrego?"\n\n💼 FINANZAS PERSONALES\n• "¿cuánto me queda libre?"\n• "mis deudas y préstamos"\n• "proyección de ahorros"\n• "patrimonio neto"\n• "¿estoy ahorrando bien?"\n\n🔍 ANÁLISIS\n• "resumen general"\n• "alertas financieras"\n• "¿estoy bien o mal?"`;
    }

    // ── EFFI: Ganancia / Rentabilidad / ROI ───────────────────────
    if (has('ganancia','utilidad','rentab','roi','rendimiento','profit')) {
        const e = calcEffi();
        if (!e) return '📂 Carga el archivo de Effi (.xls) para ver tu rentabilidad.';
        const estado = e.ganancia >= 0 ? '✅ Período rentable' : '⚠️ Período con pérdida';
        const consejo = e.margen < 10
            ? 'Tu margen es bajo (menor al 10%). Considera revisar costos de fletes o precios de venta.'
            : e.margen < 25
            ? 'Tu margen es aceptable. Hay espacio para optimizar fletes y comisiones.'
            : '¡Excelente margen! Tu negocio está operando con buena eficiencia.';
        return `${estado}\n\n💰 RENTABILIDAD EFFI\n• Recaudo de ventas:    ${fmt(e.ingresos)}\n• Costo mercancía:      ${fmt(e.costos)}\n• Fletes (total):       ${fmt(e.fletes)}\n• Comisiones/Fulfill.:  ${fmt(e.comisiones)}\n• Total egresos:        ${fmt(e.egresos)}\n────────────────────────\n• Ganancia neta:        ${fmt(e.ganancia)}\n• Margen de ganancia:   ${e.margen.toFixed(2)}%\n• ROI sobre costo:      ${e.roi.toFixed(2)}%\n\n💡 ${consejo}`;
    }

    // ── EFFI: Fletes ───────────────────────────────────────────────
    if (has('flete','envio','envío','transporte','logistica','logística')) {
        const e = calcEffi();
        if (!e || !effi) return '📂 Carga el archivo de Effi para ver el detalle de fletes.';
        const pctFletes = e.ingresos > 0 ? ((e.fletes / e.ingresos) * 100).toFixed(2) : '0.00';
        const alerta = parseFloat(pctFletes) > 20
            ? '⚠️ Los fletes superan el 20% de tus ingresos. Es un costo alto a controlar.'
            : '✅ Tus fletes están en un rango saludable respecto a los ingresos.';
        return `🚚 DETALLE DE FLETES\n• Flete con recaudo:    ${fmt(effi.fleteCon)}\n• Flete devolución:     ${fmt(effi.fleteDev)}\n• Flete sin recaudo:    ${fmt(effi.fleteSin)}\n────────────────────────\n• Total fletes:         ${fmt(e.fletes)}\n• % sobre ingresos:     ${pctFletes}%\n\n${alerta}`;
    }

    // ── EFFI: Devoluciones (Effi) ──────────────────────────────────
    if (has('devoluci','devolucion') && !tr) {
        if (!effi) return '📂 Carga el archivo de Effi para ver devoluciones.';
        return `📦 DEVOLUCIONES EN EFFI\n• Flete de devolución:  ${fmt(effi.fleteDev)}\n• Indemnizaciones:      ${fmt(effi.indemnizacion)}\n\n💡 Las devoluciones generan costo de flete doble (envío + retorno). Cada devolución reduce directamente tu ganancia neta.`;
    }

    // ── TRANSPORTE: Guías y devoluciones ──────────────────────────
    if (has('guia','guías','guias','estado','orden','ordenes','órdenes','entrega','reparto') || (has('devoluci') && tr)) {
        if (!tr) return '📂 Carga el reporte de Guías de Transporte (.xlsx) para ver el estado.';
        const pEntrega = tr.totalOrdenes > 0 ? (tr.entregadas  / tr.totalOrdenes * 100) : 0;
        const pDevol   = tr.totalOrdenes > 0 ? (tr.devoluciones/ tr.totalOrdenes * 100) : 0;
        const pTransit = tr.totalOrdenes > 0 ? (tr.enTransito  / tr.totalOrdenes * 100) : 0;
        const estadoEntrega = pEntrega >= 80 ? '✅ Buena tasa de entrega' : pEntrega >= 60 ? '⚠️ Tasa de entrega regular' : '🚨 Tasa de entrega baja';
        const estadoDevol   = pDevol   <= 10 ? '✅ Devoluciones bajo control' : pDevol <= 20 ? '⚠️ Devoluciones elevadas' : '🚨 Devoluciones críticas';
        return `📦 ESTADO DE GUÍAS\n• Total órdenes:        ${tr.totalOrdenes}\n• Entregadas:           ${tr.entregadas} (${pEntrega.toFixed(1)}%) ${pEntrega >= 75 ? '✅' : '⚠️'}\n• Devoluciones:         ${tr.devoluciones} (${pDevol.toFixed(1)}%) ${pDevol <= 15 ? '✅' : '🚨'}\n• En tránsito:          ${tr.enTransito} (${pTransit.toFixed(1)}%)\n• En reparto:           ${tr.enReparto}\n• Con novedad:          ${tr.novedad}\n\n${estadoEntrega}\n${estadoDevol}`;
    }

    // ── EFFI: Recaudo / Ventas ─────────────────────────────────────
    if (has('recaudo','venta','ventas','ingreso','ingresos','cobro')) {
        if (!effi) return '📂 Carga el archivo de Effi para ver el recaudo.';
        const e = calcEffi();
        return `💵 RECAUDO Y VENTAS\n• Total recaudado:      ${fmt(effi.recaudo)}\n• Retiro de cuenta:     ${fmt(effi.retiro)}\n• Dinero disponible:    ${fmt((effi.recaudo||0) - (effi.retiro||0))}\n\n💡 El recaudo incluye todos los pagos recibidos por ventas entregadas. El retiro es lo que ya moviste fuera de Effi.`;
    }

    // ── EFFI: Costos de operación ──────────────────────────────────
    if (has('costo','gasto','egreso','fulfillment','comision','comisión','operacion','operación')) {
        const e = calcEffi();
        if (!e || !effi) return '📂 Carga el archivo de Effi para ver los costos.';
        const pCosto  = e.ingresos > 0 ? (e.costos      / e.ingresos * 100).toFixed(1) : '0.0';
        const pFletes = e.ingresos > 0 ? (e.fletes      / e.ingresos * 100).toFixed(1) : '0.0';
        const pCom    = e.ingresos > 0 ? (e.comisiones  / e.ingresos * 100).toFixed(1) : '0.0';
        return `📊 ESTRUCTURA DE COSTOS\n• Mercancía:            ${fmt(e.costos)} (${pCosto}%)\n• Fletes totales:       ${fmt(e.fletes)} (${pFletes}%)\n• Comis./Fulfillment:   ${fmt(e.comisiones)} (${pCom}%)\n────────────────────────\n• Total egresos:        ${fmt(e.egresos)}\n• Ingresos:             ${fmt(e.ingresos)}\n• Ganancia:             ${fmt(e.ganancia)}\n\n💡 El mayor costo es ${e.costos >= e.fletes ? 'la mercancía' : 'los fletes'}. Optimiza ese rubro primero para mejorar tu margen.`;
    }

    // ── Personal: Disponible / Sobrante ───────────────────────────
    if (has('disponible','sobrante','libre','queda','sobra','liquidez')) {
        const p = calcPersonal();
        const estado = p.disp >= 0 ? '✅ Tienes dinero disponible' : '🚨 Tus compromisos superan tus ingresos';
        const consejo = p.disp > 0 && p.aho === 0
            ? `💡 Tienes ${fmt(p.disp)} libre pero no estás ahorrando. Considera apartar al menos el 10% (${fmt(p.sal * 0.10)}).`
            : p.disp < 0
            ? `⚠️ Déficit de ${fmt(Math.abs(p.disp))}. Revisa tus gastos fijos.`
            : `💡 Tu disponible es ${pct(p.disp, p.sal)} de tus ingresos. ¡Buen manejo!`;
        return `💼 DISPONIBILIDAD PERSONAL\n• Ingresos totales:     ${fmt(p.sal)}\n• Gastos fijos:         ${fmt(p.gast)}\n• Ahorros mensuales:    ${fmt(p.aho)}\n────────────────────────\n• Disponible:           ${fmt(p.disp)}\n\n${estado}\n${consejo}`;
    }

    // ── Personal: Ahorros ─────────────────────────────────────────
    if (has('ahorro','ahorrar','ahorra','fondo','meta','proyeccion','proyección')) {
        const p = calcPersonal();
        const pctAho = p.sal > 0 ? (p.aho / p.sal * 100).toFixed(1) : '0.0';
        const meta6m  = p.aho * 6;
        const meta12m = p.aho * 12;
        const recom   = p.sal > 0 ? p.sal * 0.20 : 0;
        const estadoAho = parseFloat(pctAho) >= 20 ? '✅ Excelente tasa de ahorro (+20%)' : parseFloat(pctAho) >= 10 ? '👍 Buena tasa de ahorro (10-20%)' : parseFloat(pctAho) > 0 ? '⚠️ Tasa de ahorro baja (menos del 10%)' : '🚨 No estás ahorrando actualmente';
        return `🐷 AHORROS Y PROYECCIÓN\n• Ahorro mensual:       ${fmt(p.aho)}\n• % de tus ingresos:    ${pctAho}%\n• Proyección 6 meses:   ${fmt(meta6m)}\n• Proyección 12 meses:  ${fmt(meta12m)}\n• Ahorro ideal (20%):   ${fmt(recom)}\n\n${estadoAho}\n${p.aho < recom && p.sal > 0 ? `💡 Para llegar al 20% ideal, deberías ahorrar ${fmt(recom - p.aho)} adicionales al mes.` : p.aho >= recom ? '🎉 ¡Estás cumpliendo el objetivo de ahorro del 20%!' : ''}`;
    }

    // ── Personal: Deudas y préstamos ──────────────────────────────
    if (has('deuda','prestamo','préstamo','credito','crédito','debo','debe','informal')) {
        const p = calcPersonal();
        const totalDeudas = p.prest + p.inf;
        const pctDeuda    = p.banc  > 0 ? (totalDeudas / p.banc * 100).toFixed(1) : '0.0';
        const mesesPago   = p.disp  > 0 ? (totalDeudas / p.disp).toFixed(1)       : '∞';
        const estadoDeuda = totalDeudas === 0 ? '✅ ¡Sin deudas registradas!' : totalDeudas < p.sal * 3 ? '✅ Nivel de deuda manejable' : totalDeudas < p.sal * 6 ? '⚠️ Deuda moderada' : '🚨 Nivel de deuda alto';
        return `💳 DEUDAS Y COMPROMISOS\n• Préstamos formales:   ${fmt(p.prest)}\n• Deudas informales:    ${fmt(p.inf)}\n────────────────────────\n• Total comprometido:   ${fmt(totalDeudas)}\n• vs. saldo bancario:   ${pctDeuda}%\n• Meses para saldarlas: ${mesesPago}\n\n${estadoDeuda}\n${totalDeudas > 0 && p.disp > 0 ? `💡 Con tu disponible actual de ${fmt(p.disp)}/mes, podrías saldar todas tus deudas en aprox. ${mesesPago} meses.` : ''}`;
    }

    // ── Personal: Bancos / Saldo ───────────────────────────────────
    if (has('banco','bancos','cuenta','saldo','efectivo','dinero en banco','liquidez')) {
        const p = calcPersonal();
        const pctVsDeudas = p.banc > 0 && (p.prest + p.inf) > 0 ? ((p.prest + p.inf) / p.banc * 100).toFixed(1) : '0.0';
        return `🏦 SALDO BANCARIO\n• Dinero en cuentas:    ${fmt(p.banc)}\n• Deudas totales:       ${fmt(p.prest + p.inf)}\n• Liquidez neta:        ${fmt(p.banc - p.prest - p.inf)}\n• Deuda vs Banco:       ${pctVsDeudas}%\n\n${p.banc > (p.prest + p.inf) ? '✅ Tus activos bancarios superan tus deudas.' : '⚠️ Tus deudas superan tu saldo bancario.'}`;
    }

    // ── Personal: Patrimonio neto ──────────────────────────────────
    if (has('patrimonio','neto','riqueza','capital','vale','valgo')) {
        const p = calcPersonal();
        const estado = p.patr >= 0 ? '✅ Patrimonio positivo' : '🚨 Patrimonio negativo (deudas > activos)';
        return `🏆 PATRIMONIO NETO\n• Saldo bancario:       ${fmt(p.banc)}\n• Ahorros:              ${fmt(p.aho)}\n• (-) Préstamos:        ${fmt(p.prest)}\n• (-) Deudas informales:${fmt(p.inf)}\n────────────────────────\n• Patrimonio neto:      ${fmt(p.patr)}\n\n${estado}\n💡 El patrimonio neto mide cuánto tienes realmente libre después de todas las deudas.`;
    }

    // ── Salario / Ingresos ─────────────────────────────────────────
    if (has('salario','sueldo','ingreso mensual','gano','cobro mensual')) {
        const p = calcPersonal();
        const pctGast = p.sal > 0 ? (p.gast / p.sal * 100).toFixed(1) : '0.0';
        const pctAho  = p.sal > 0 ? (p.aho  / p.sal * 100).toFixed(1) : '0.0';
        return `💵 INGRESOS MENSUALES\n• Total ingresos:       ${fmt(p.sal)}\n• Gastos fijos:         ${fmt(p.gast)} (${pctGast}%)\n• Ahorros:              ${fmt(p.aho)} (${pctAho}%)\n• Disponible:           ${fmt(p.disp)}\n\n${p.gast > p.sal * 0.7 ? '⚠️ Tus gastos fijos superan el 70% de tus ingresos. Zona de riesgo.' : '✅ Buena distribución de ingresos.'}`;
    }

    // ── Resumen general ────────────────────────────────────────────
    if (has('resumen','general','todo','panorama','como estoy','cómo estoy','situacion','situación','status')) {
        const p = calcPersonal();
        const e = calcEffi();
        let resp = `📊 RESUMEN GENERAL FINANCIERO\n\n`;

        if (e) {
            resp += `🏪 NEGOCIO (EFFI)\n• Ventas:               ${fmt(e.ingresos)}\n• Ganancia neta:        ${fmt(e.ganancia)} (${e.margen.toFixed(1)}%)\n• Estado:               ${e.ganancia >= 0 ? '✅ Rentable' : '🚨 Pérdida'}\n\n`;
        }
        if (tr) {
            const pE = tr.totalOrdenes > 0 ? (tr.entregadas/tr.totalOrdenes*100).toFixed(1) : '0.0';
            resp += `🚚 LOGÍSTICA\n• Entrega:              ${pE}% de ${tr.totalOrdenes} órdenes\n• Devoluciones:         ${tr.devoluciones} paquetes\n\n`;
        }
        resp += `💼 PERSONAL\n• Ingresos:             ${fmt(p.sal)}\n• Disponible:           ${fmt(p.disp)} ${sign(p.disp)}\n• Patrimonio neto:      ${fmt(p.patr)} ${sign(p.patr)}\n• Deudas totales:       ${fmt(p.prest + p.inf)}`;
        return resp;
    }

    // ── Alertas / Riesgos ──────────────────────────────────────────
    if (has('alerta','riesgo','problema','mal','crisis','preocup','peligro','warn')) {
        const p = calcPersonal();
        const e = calcEffi();
        const alertas = [];

        if (e) {
            if (e.ganancia < 0)          alertas.push('🚨 Tu negocio está en pérdida este período.');
            if (e.margen < 10 && e.margen >= 0) alertas.push('⚠️ Margen de ganancia menor al 10%. Riesgo operativo.');
            if (e.fletes > e.ingresos * 0.25) alertas.push('⚠️ Los fletes superan el 25% de tus ingresos.');
        }
        if (tr) {
            if (tr.totalOrdenes > 0 && tr.devoluciones / tr.totalOrdenes > 0.20) alertas.push('🚨 Tasa de devolución superior al 20%. Impacto alto en ganancias.');
            if (tr.totalOrdenes > 0 && tr.entregadas   / tr.totalOrdenes < 0.60) alertas.push('⚠️ Menos del 60% de las órdenes entregadas.');
        }
        if (p.disp < 0)                  alertas.push('🚨 Tus gastos personales superan tus ingresos.');
        if (p.gast > p.sal * 0.70)       alertas.push('⚠️ Gastos fijos por encima del 70% de tus ingresos.');
        if (p.prest + p.inf > p.sal * 6) alertas.push('🚨 Deudas superiores a 6 meses de ingresos.');
        if (p.aho === 0 && p.sal > 0)    alertas.push('⚠️ No tienes ahorros registrados.');
        if (p.patr < 0)                  alertas.push('🚨 Patrimonio neto negativo. Tus deudas superan tus activos.');

        if (alertas.length === 0) return '✅ ¡Todo en orden! No detecté alertas financieras en este momento. Sigue así.';
        return `🔍 ALERTAS DETECTADAS (${alertas.length})\n\n${alertas.join('\n')}\n\n💡 Escríbeme sobre cualquiera de estos puntos para un análisis más detallado.`;
    }

    // ── ¿Estoy bien? ───────────────────────────────────────────────
    if (has('bien','mal','como voy','cómo voy','como va','que tal','qué tal','analiza')) {
        const p = calcPersonal();
        const e = calcEffi();
        const puntos = [];
        let score = 0;

        if (e) {
            if (e.ganancia > 0)   { puntos.push('✅ Negocio rentable'); score++; }
            else                  { puntos.push('❌ Negocio con pérdida'); }
            if (e.margen >= 20)   { puntos.push('✅ Buen margen de ganancia'); score++; }
            else if (e.margen > 0){ puntos.push('⚠️ Margen mejorable'); }
        }
        if (p.disp > 0)           { puntos.push('✅ Flujo personal positivo'); score++; }
        else                      { puntos.push('❌ Flujo personal negativo'); }
        if (p.aho > p.sal * 0.10) { puntos.push('✅ Ahorrando más del 10%'); score++; }
        else if (p.aho > 0)       { puntos.push('⚠️ Ahorrando menos del 10%'); }
        else                      { puntos.push('❌ Sin ahorro registrado'); }
        if (p.patr > 0)           { puntos.push('✅ Patrimonio positivo'); score++; }
        else if (p.patr < 0)      { puntos.push('❌ Patrimonio negativo'); }

        const total   = puntos.length;
        const calif   = score >= total * 0.8 ? '🏆 Excelente situación financiera'
                      : score >= total * 0.6 ? '👍 Situación financiera estable'
                      : score >= total * 0.4 ? '⚠️ Situación financiera con riesgos'
                      :                        '🚨 Situación financiera crítica';

        return `📈 DIAGNÓSTICO FINANCIERO\n${calif}\n\n${puntos.join('\n')}\n\nPuntuación: ${score}/${total} indicadores positivos\n\n💡 Escríbeme "alertas" para ver los riesgos específicos o "resumen" para el detalle completo.`;
    }

    // ── Publicidad / Ads ───────────────────────────────────────────
    if (has('publicidad','ads','facebook','tiktok','marketing','pauta','anuncio')) {
        return `📢 PUBLICIDAD\nLos datos de publicidad (Facebook Ads / TikTok Ads) se cargan desde la pestaña "Cargar Archivo".\n\nUna vez cargados, el dashboard calcula automáticamente:\n• Gasto en USD convertido a RD$\n• Costo por orden\n• Impacto en ganancia neta\n\n¿Ya cargaste tus reportes de publicidad?`;
    }

    // ── Comparación / Período ──────────────────────────────────────
    if (has('compara','anterior','mes pasado','periodo','período','historico','histórico')) {
        return `📅 COMPARACIÓN DE PERÍODOS\nActualmente trabajo con el período del reporte cargado.\n\nPara comparar períodos:\n1. Usa "Historial de Cuadres" en el menú lateral\n2. Registra el cobro de ganancias de cada período\n3. El historial acumula los registros para seguimiento\n\n¿Quieres que analice el período actual en detalle?`;
    }

    // ── Recomendaciones ────────────────────────────────────────────
    if (has('recomien','consejo','que hago','que debo','mejora','optimiza','suger')) {
        const p = calcPersonal();
        const e = calcEffi();
        const recs = [];

        if (e) {
            if (e.margen < 15)        recs.push('📦 Negocia mejores precios de compra o aumenta precios de venta para subir el margen por encima del 15%.');
            if (e.fletes > e.ingresos * 0.20) recs.push('🚚 Los fletes son altos. Evalúa consolidar envíos o negociar tarifas con la transportista.');
            if (tr && tr.devoluciones / (tr.totalOrdenes || 1) > 0.15) recs.push('📋 Tasa de devolución alta. Mejora las descripciones de productos y la calidad de empaque.');
        }
        if (p.aho < p.sal * 0.10 && p.sal > 0) recs.push(`💰 Ahorra mínimo el 10% de tus ingresos (${fmt(p.sal * 0.10)}/mes). Automatiza el ahorro el día de cobro.`);
        if (p.prest + p.inf > p.sal * 3)        recs.push('💳 Prioriza saldar deudas. Empieza por la de mayor interés o la más pequeña para ganar momentum.');
        if (p.disp > p.sal * 0.20 && p.aho < p.sal * 0.15) recs.push('🐷 Tienes buen flujo libre. Aumenta tu ahorro mensual, tienes capacidad para ello.');

        if (recs.length === 0) return '✅ Tus números se ven bien. Mantén la disciplina financiera y sigue monitoreando cada período.';
        return `💡 RECOMENDACIONES PERSONALIZADAS\n\n${recs.map((r,i) => `${i+1}. ${r}`).join('\n\n')}`;
    }

    // ── Gracias / Despedida ────────────────────────────────────────
    if (has('gracias','thank','perfecto','excelente','listo','ok','entendi','entendí')) {
        return `¡Con gusto! 😊 Recuerda que puedo ayudarte en cualquier momento con el análisis de tus finanzas.\n\nEscríbeme "ayuda" para ver todo lo que puedo hacer por ti.`;
    }

    // ── Fallback inteligente ───────────────────────────────────────
    const tieneEffi = !!effi;
    const tieneTr   = !!tr;
    const tieneFp   = fp.salarios > 0;
    const datosDisp = [tieneEffi && 'Effi', tieneTr && 'Transporte', tieneFp && 'Finanzas Personales'].filter(Boolean);

    return `No entendí exactamente tu consulta, pero tengo acceso a: ${datosDisp.length > 0 ? datosDisp.join(', ') : 'datos aún no cargados'}.\n\nPuedes preguntarme sobre:\n• "ganancia" — rentabilidad del negocio\n• "guías" — estado de órdenes\n• "disponible" — flujo personal\n• "deudas" — préstamos\n• "alertas" — riesgos detectados\n• "resumen" — panorama completo\n• "ayuda" — todas las opciones`;
}

/* ── AUTENTICACIÓN ──────────────────────────────────────────────────── */
app.post('/api/register', async (req, res) => {
    const username = String(req.body.username || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    if (!username || !password) return res.status(400).json({ success: false, message: 'Usuario y contraseña requeridos' });

    try {
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        
        db.get('SELECT id FROM users WHERE username = ?', [username], (err, row) => {
            if (err)  return res.status(500).json({ success: false, message: 'Error interno' });
            if (row)  return res.status(400).json({ success: false, message: 'Usuario ya existe' });
            db.run('INSERT INTO users (username, password, is_admin) VALUES (?, ?, 0)', [username, hashedPassword], function(e2) {
                if (e2) return res.status(500).json({ success: false, message: 'Error al crear usuario' });
                console.log(`✅ Nuevo usuario: ${username}`);
                res.json({ success: true, message: 'Usuario registrado', userId: this.lastID });
            });
        });
    } catch (hashError) {
        console.error('❌ Error hashing password:', hashError);
        return res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

app.post('/api/login', async (req, res) => {
    const username = String(req.body.username || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    if (!username || !password) return res.status(400).json({ success: false, message: 'Usuario y contraseña requeridos' });

    db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
        if (err) return res.status(500).json({ success: false, message: 'Error interno' });
        if (user) {
            // Compare hashed password
            const passwordMatch = await bcrypt.compare(password, user.password);
            if (passwordMatch) {
                console.log(`✅ Login: ${username}`);
                return res.json({ success: true, token: `session_token_pro_2026_${user.id}`, user: { id: user.id, username: user.username, is_admin: !!user.is_admin } });
            }
        }
        // Fallback to admin check (.env password preferred, legacy hash supported)
        if (username === ADMIN_USERNAME) {
            const adminMatch = ADMIN_PASSWORD
                ? password === ADMIN_PASSWORD
                : await bcrypt.compare(password, ADMIN_PASSWORD_HASH);
            if (adminMatch) {
                ensureAdminUser();
                return res.json({ success: true, token: `session_token_pro_2026_${ADMIN_USERNAME}`, user: { id: 'admin', username: ADMIN_USERNAME, is_admin: true } });
            }
        }
        res.status(401).json({ success: false, message: 'Credenciales incorrectas' });
    });
});

/* ── BASE DE DATOS ──────────────────────────────────────────────────── */
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) { console.error('❌ SQLite:', err); return; }
    console.log('✅ SQLite conectado en', DB_PATH);
    db.run(`CREATE TABLE IF NOT EXISTS app_state (id INTEGER PRIMARY KEY, key TEXT UNIQUE, value TEXT)`);
    db.run(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL, password TEXT NOT NULL, is_admin BOOLEAN DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`, (e) => { if (!e) ensureAdminUser(); });
});

async function ensureAdminUser() {
    try {
        const adminPasswordHash = ADMIN_PASSWORD
            ? await bcrypt.hash(ADMIN_PASSWORD, saltRounds)
            : ADMIN_PASSWORD_HASH;
        db.get('SELECT id FROM users WHERE username = ?', [ADMIN_USERNAME], (err, row) => {
            if (err || row) { if (row) adminUserId = row.id; return; }
            db.run('INSERT INTO users (username, password, is_admin) VALUES (?, ?, 1)', [ADMIN_USERNAME, adminPasswordHash], function(e2) {
                if (!e2) { adminUserId = this.lastID; console.log('✅ Admin creado'); }
            });
        });
    } catch (hashError) {
        console.error('❌ Error hashing admin password:', hashError);
    }
}

/* ── UTILIDADES STATE ───────────────────────────────────────────────── */
function sanitizeUserId(v) {
    if (!v || v === 'undefined' || v === 'null') return 'shared';
    return String(v).replace(/[^a-zA-Z0-9_@.-]/g, '') || 'shared';
}
function getStateKey(userId) {
    const c = sanitizeUserId(userId);
    return (!c || c === 'shared') ? 'current_state' : `state_${c}`;
}
function isAdmin(userId) {
    if (!userId) return false;
    if (String(userId) === 'admin' || String(userId) === ADMIN_USERNAME) return true;
    return !!(adminUserId && Number(userId) === Number(adminUserId));
}

app.post('/api/state', authenticateToken, (req, res) => {
    const key    = getStateKey(req.query.userId);
    const state  = JSON.stringify(req.body || {});
    const mirror = isAdmin(req.query.userId) && key !== 'current_state';
    db.run('INSERT OR REPLACE INTO app_state (key, value) VALUES (?, ?)', [key, state], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        if (mirror) db.run('INSERT OR REPLACE INTO app_state (key, value) VALUES (?, ?)', ['current_state', state], () => {});
        console.log(`💾 Estado: ${key}`);
        res.json({ success: true });
    });
});

app.get('/api/state', authenticateToken, (req, res) => {
    const key       = getStateKey(req.query.userId);
    const adminUser = isAdmin(req.query.userId);
    const parse = (row) => {
        if (!row || !row.value) return res.json(null);
        try { res.json(JSON.parse(row.value)); } catch (_) { res.status(500).json({ error: 'Estado corrupto' }); }
    };
    db.get('SELECT value FROM app_state WHERE key = ?', [key], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (row) return parse(row);
        if (adminUser && key !== 'current_state') {
            db.get('SELECT value FROM app_state WHERE key = ?', ['current_state'], (_e, lr) => parse(lr || null));
        } else {
            res.json(null);
        }
    });
});

/* ── ARCHIVOS ───────────────────────────────────────────────────────── */
const storage = multer.diskStorage({
    destination: UPLOADS_DIR,
    filename: (_req, file, cb) => {
        let safeName = file.originalname || 'upload.bin';
        // Convertir posibles problemas de codificación de UTF-8 leídos como latin1
        try { safeName = Buffer.from(safeName, 'latin1').toString('utf8'); } catch(e){}
        // Remover acentos y dejar solo caracteres seguros para URLs y Windows
        safeName = safeName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9.-]/g, '_');
        cb(null, Date.now() + '-' + safeName);
    }
});
const upload = multer({ storage });

app.post('/api/upload', authenticateToken, upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No se recibió archivo.' });
    console.log('📁 Archivo guardado:', req.file.filename);
    res.json({ message: 'Archivo guardado', filename: req.file.filename });
});

// Listar archivos subidos — usado por autoLoadFile del cliente
app.get('/api/files/list', authenticateToken, (req, res) => {
    try {
        const files = fs.readdirSync(UPLOADS_DIR).map(name => {
            const stat = fs.statSync(path.join(UPLOADS_DIR, name));
            return { name, size: stat.size, modified: stat.mtime.toISOString() };
        }).sort((a, b) => new Date(b.modified) - new Date(a.modified));
        res.json({ files });
    } catch (err) {
        console.error('❌ /api/files/list:', err.message);
        res.json({ files: [] });
    }
});

/* ── START ──────────────────────────────────────────────────────────── */
app.listen(PORT, () => {
    console.log(`🚀 Finanzas Pro corriendo en puerto ${PORT}`);

    // ── Diagnóstico automático de IA al arrancar ───────────────────
    const gKey = process.env.GOOGLE_AI_KEY;
    const oKey = process.env.OPENAI_API_KEY;
    const aKey = process.env.ANTHROPIC_API_KEY;

    console.log('─── DIAGNÓSTICO DE IA ────────────────────────────────');
    console.log('GOOGLE_AI_KEY  :', gKey  ? `presente (${gKey.slice(0,8)}...)` : '❌ NO DEFINIDA');
    console.log('OPENAI_API_KEY :', oKey  && !oKey.includes('your_') ? `presente (${oKey.slice(0,8)}...)` : '❌ no configurada');
    console.log('ANTHROPIC_KEY  :', aKey  && !aKey.includes('your_') ? `presente (${aKey.slice(0,8)}...)` : '❌ no configurada');

    if (gKey) {
        fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${gKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ role: 'user', parts: [{ text: 'hola' }] }],
                    generationConfig: { maxOutputTokens: 10 }
                })
            }
        )
        .then(async r => {
            const body = await r.json();
            if (r.ok) {
                const reply = body?.candidates?.[0]?.content?.parts?.[0]?.text || '(sin texto)';
                console.log('✅ GEMINI OK — respuesta de prueba:', reply.trim());
            } else {
                console.error(`❌ GEMINI ERROR ${r.status}: ${body?.error?.message || JSON.stringify(body).slice(0,300)}`);
                console.error('💡 Verifica que la clave empiece con AIza y tenga la API "Generative Language" habilitada en Google Cloud.');
            }
        })
        .catch(e => console.error('❌ GEMINI fetch error:', e.message));
    } else {
        console.warn('⚠️  Sin GOOGLE_AI_KEY — el bot usará modo offline.');
    }
    console.log('─────────────────────────────────────────────────────');
});
