/**
 * Finanzas Pro – Floating AI Chatbot
 * Incrustado en la esquina inferior derecha de la ventana.
 * Se comunica con /chat en el servidor, que usa la API de Anthropic
 * y recibe contexto financiero del appState del cliente.
 */
(function () {
    'use strict';

    /* ── ESTILOS ─────────────────────────────────────────────────────── */
    const style = document.createElement('style');
    style.textContent = `
        /* FAB */
        #chatbot-fab {
            position: fixed;
            bottom: 28px;
            right: 28px;
            width: 56px;
            height: 56px;
            border-radius: 50%;
            background: linear-gradient(135deg, #39d7ff, #0066cc);
            border: none;
            cursor: pointer;
            z-index: 9999;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 22px rgba(57, 215, 255, 0.55);
            transition: transform 0.25s ease, box-shadow 0.25s ease;
            color: #fff;
            font-size: 22px;
        }
        #chatbot-fab:hover {
            transform: scale(1.12);
            box-shadow: 0 6px 30px rgba(57, 215, 255, 0.75);
        }
        #chatbot-fab.has-unread::after {
            content: '';
            position: absolute;
            top: -3px;
            right: -3px;
            width: 14px;
            height: 14px;
            background: #ff5d5d;
            border-radius: 50%;
            border: 2px solid #061226;
        }

        /* VENTANA */
        #chatbot-window {
            position: fixed;
            bottom: 96px;
            right: 28px;
            width: 370px;
            max-height: 560px;
            background: linear-gradient(180deg, #0d1a33 0%, #061226 100%);
            border: 1px solid rgba(57, 215, 255, 0.28);
            border-radius: 18px;
            box-shadow: 0 22px 64px rgba(0, 0, 0, 0.75),
                        0 0 0 1px rgba(57, 215, 255, 0.08);
            display: flex;
            flex-direction: column;
            z-index: 9998;
            /* Estado cerrado */
            transform: scale(0.88) translateY(18px);
            opacity: 0;
            pointer-events: none;
            transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1),
                        opacity 0.25s ease;
            overflow: hidden;
        }
        #chatbot-window.open {
            transform: scale(1) translateY(0);
            opacity: 1;
            pointer-events: all;
        }

        /* HEADER */
        #chatbot-header {
            padding: 14px 16px;
            background: linear-gradient(90deg,
                rgba(57, 215, 255, 0.13),
                rgba(0, 100, 200, 0.05));
            border-bottom: 1px solid rgba(57, 215, 255, 0.12);
            display: flex;
            align-items: center;
            gap: 11px;
            flex-shrink: 0;
        }
        #chatbot-header .cb-avatar {
            width: 36px;
            height: 36px;
            border-radius: 50%;
            background: linear-gradient(135deg, #39d7ff, #0066cc);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
            flex-shrink: 0;
            box-shadow: 0 0 12px rgba(57, 215, 255, 0.4);
        }
        #chatbot-header .cb-info { flex: 1; min-width: 0; }
        #chatbot-header .cb-name {
            font-size: 14px;
            font-weight: 800;
            color: #ffffff;
            margin: 0 0 2px;
        }
        #chatbot-header .cb-status {
            font-size: 11px;
            color: #7dffb8;
            display: flex;
            align-items: center;
            gap: 5px;
        }
        #chatbot-header .cb-status::before {
            content: '';
            width: 6px;
            height: 6px;
            background: #7dffb8;
            border-radius: 50%;
            display: inline-block;
            animation: cbPulse 2s infinite;
        }
        @keyframes cbPulse {
            0%, 100% { opacity: 1; }
            50%       { opacity: 0.4; }
        }
        #chatbot-clear {
            background: transparent;
            border: 1px solid rgba(255,255,255,0.1);
            color: #9fc2ff;
            cursor: pointer;
            font-size: 12px;
            padding: 4px 8px;
            border-radius: 6px;
            transition: all 0.2s;
            margin-right: 4px;
        }
        #chatbot-clear:hover { background: rgba(255,255,255,0.08); color: #fff; }
        #chatbot-close-btn {
            background: transparent;
            border: none;
            color: #9fc2ff;
            cursor: pointer;
            font-size: 16px;
            padding: 5px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 6px;
            transition: all 0.2s;
        }
        #chatbot-close-btn:hover { background: rgba(255,93,93,0.15); color: #ff8f8f; }

        /* MENSAJES */
        #chatbot-messages {
            flex: 1;
            overflow-y: auto;
            padding: 14px;
            display: flex;
            flex-direction: column;
            gap: 10px;
            max-height: 360px;
            min-height: 160px;
            scrollbar-width: thin;
            scrollbar-color: rgba(57, 215, 255, 0.18) transparent;
        }
        #chatbot-messages::-webkit-scrollbar { width: 3px; }
        #chatbot-messages::-webkit-scrollbar-thumb {
            background: rgba(57, 215, 255, 0.18);
            border-radius: 3px;
        }
        .cb-msg {
            max-width: 86%;
            padding: 10px 14px;
            border-radius: 14px;
            font-size: 13px;
            line-height: 1.55;
            word-break: break-word;
            white-space: pre-wrap;
        }
        .cb-msg.bot {
            background: rgba(57, 215, 255, 0.07);
            border: 1px solid rgba(57, 215, 255, 0.14);
            color: #cfe3ff;
            align-self: flex-start;
            border-bottom-left-radius: 4px;
        }
        .cb-msg.user {
            background: linear-gradient(135deg,
                rgba(57, 215, 255, 0.22),
                rgba(0, 102, 204, 0.18));
            border: 1px solid rgba(57, 215, 255, 0.28);
            color: #ffffff;
            align-self: flex-end;
            border-bottom-right-radius: 4px;
        }
        /* Indicador de escritura */
        .cb-msg.typing {
            display: flex;
            gap: 5px;
            align-items: center;
            padding: 12px 14px;
        }
        .cb-msg.typing span {
            width: 7px;
            height: 7px;
            background: #39d7ff;
            border-radius: 50%;
            animation: cbBounce 1.2s infinite;
        }
        .cb-msg.typing span:nth-child(2) { animation-delay: 0.2s; }
        .cb-msg.typing span:nth-child(3) { animation-delay: 0.4s; }
        @keyframes cbBounce {
            0%, 80%, 100% { transform: translateY(0); opacity: 0.45; }
            40%            { transform: translateY(-7px); opacity: 1; }
        }

        /* INPUT */
        #chatbot-input-area {
            padding: 10px 12px;
            border-top: 1px solid rgba(57, 215, 255, 0.08);
            display: flex;
            gap: 8px;
            align-items: flex-end;
            flex-shrink: 0;
        }
        #chatbot-input {
            flex: 1;
            background: rgba(10, 26, 54, 0.85);
            border: 1px solid rgba(159, 194, 255, 0.18);
            color: #ffffff;
            padding: 9px 13px;
            border-radius: 12px;
            font-size: 13px;
            outline: none;
            resize: none;
            max-height: 96px;
            min-height: 38px;
            transition: border-color 0.2s;
            font-family: inherit;
            line-height: 1.4;
        }
        #chatbot-input:focus { border-color: #39d7ff; }
        #chatbot-input::placeholder { color: rgba(159, 194, 255, 0.38); }
        #chatbot-send {
            width: 38px;
            height: 38px;
            border-radius: 50%;
            background: linear-gradient(135deg, #39d7ff, #0066cc);
            border: none;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            transition: transform 0.2s, box-shadow 0.2s;
            color: #fff;
            font-size: 13px;
            box-shadow: 0 3px 12px rgba(57, 215, 255, 0.35);
        }
        #chatbot-send:hover { transform: scale(1.1); }
        #chatbot-send:disabled {
            opacity: 0.4;
            cursor: not-allowed;
            transform: none;
            box-shadow: none;
        }
        /* Sugerencias rápidas */
        #chatbot-suggestions {
            display: flex;
            gap: 6px;
            padding: 0 12px 8px;
            flex-wrap: wrap;
            flex-shrink: 0;
        }
        .cb-suggestion {
            background: rgba(57, 215, 255, 0.07);
            border: 1px solid rgba(57, 215, 255, 0.18);
            color: #39d7ff;
            border-radius: 99px;
            padding: 5px 11px;
            font-size: 11px;
            font-weight: 700;
            cursor: pointer;
            white-space: nowrap;
            transition: all 0.2s;
        }
        .cb-suggestion:hover {
            background: rgba(57, 215, 255, 0.18);
            color: #fff;
        }

        /* Responsive */
        @media (max-width: 480px) {
            #chatbot-window {
                width: calc(100vw - 24px);
                right: 12px;
                bottom: 78px;
                max-height: 70vh;
            }
            #chatbot-fab { bottom: 14px; right: 14px; }
        }
    `;
    document.head.appendChild(style);

    /* ── HTML ─────────────────────────────────────────────────────────── */
    const wrap = document.createElement('div');
    wrap.innerHTML = `
        <button id="chatbot-fab" title="Asistente Financiero IA">
            <i class="fa-solid fa-robot"></i>
        </button>

        <div id="chatbot-window" role="dialog" aria-label="Chat Financiero IA">
            <div id="chatbot-header">
                <div class="cb-avatar">🤖</div>
                <div class="cb-info">
                    <p class="cb-name">Finanzas AI</p>
                    <span class="cb-status">En línea</span>
                </div>
                <button id="chatbot-clear" title="Limpiar chat">
                    <i class="fa-solid fa-eraser"></i>
                </button>
                <button id="chatbot-close-btn" title="Cerrar">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>

            <div id="chatbot-messages"></div>

            <div id="chatbot-suggestions">
                <!-- Las sugerencias se cargan dinámicamente según el rol -->
            </div>

            <div id="chatbot-input-area">
                <textarea
                    id="chatbot-input"
                    placeholder="Pregúntame sobre tus finanzas..."
                    rows="1"
                    aria-label="Mensaje al asistente"
                ></textarea>
                <button id="chatbot-send" title="Enviar">
                    <i class="fa-solid fa-paper-plane"></i>
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(wrap);

    /* ── REFERENCIAS DOM ─────────────────────────────────────────────── */
    const fab       = document.getElementById('chatbot-fab');
    const win       = document.getElementById('chatbot-window');
    const closeBtn  = document.getElementById('chatbot-close-btn');
    const clearBtn  = document.getElementById('chatbot-clear');
    const msgBox    = document.getElementById('chatbot-messages');
    const input     = document.getElementById('chatbot-input');
    const sendBtn   = document.getElementById('chatbot-send');
    const suggWrap  = document.getElementById('chatbot-suggestions');

    /* ── ESTADO ──────────────────────────────────────────────────────── */
    let isOpen    = false;
    let isLoading = false;

    /* ── SUGERENCIAS SEGÚN ROL ─────────────────────────────────────────── */
    function loadSuggestions() {
        const isAdmin = sessionStorage.getItem('is_admin') === 'true';
        const suggContainer = document.getElementById('chatbot-suggestions');
        
        if (isAdmin) {
            // Admin tiene todas las sugerencias
            suggContainer.innerHTML = `
                <button class="cb-suggestion" data-q="¿Cuál es mi ganancia este período?">💰 Ganancia</button>
                <button class="cb-suggestion" data-q="¿Cuánto debo en préstamos?">💳 Deudas</button>
                <button class="cb-suggestion" data-q="¿Cómo están mis ahorros?">🐷 Ahorros</button>
                <button class="cb-suggestion" data-q="Analiza mis devoluciones de Effi">📦 Effi</button>
                <button class="cb-suggestion" data-q="Estado de mis guías de transporte">🚚 Transporte</button>
                <button class="cb-suggestion" data-g="Resumen completo de finanzas">📊 Resumen Total</button>
            `;
        } else {
            // Usuario regular solo ve finanzas personales
            suggContainer.innerHTML = `
                <button class="cb-suggestion" data-q="¿Cuál es mi balance mensual?">💰 Mi Balance</button>
                <button class="cb-suggestion" data-q="¿Cuánto debo en préstamos?">💳 Mis Deudas</button>
                <button class="cb-suggestion" data-q="¿Cómo están mis ahorros?">🐷 Mis Ahorros</button>
                <button class="cb-suggestion" data-q="Resumen de mis finanzas personales">📊 Mi Resumen</button>
            `;
        }
        
        // Re-attach event listeners
        suggContainer.querySelectorAll('.cb-suggestion').forEach(btn => {
            btn.addEventListener('click', () => {
                input.value = btn.dataset.q;
                sendMessage();
            });
        });
    }

    /* ── SALUDO INICIAL ──────────────────────────────────────────────── */
    addMessage('bot',
        '¡Hola! Soy tu asistente financiero IA 💡\n' +
        'Puedo analizar tus números de Effi, calcular ganancias, ' +
        'revisar gastos personales y más.\n¿En qué te ayudo hoy?'
    );

    /* ── TOGGLE ──────────────────────────────────────────────────────── */
    fab.addEventListener('click', () => toggle(true));
    closeBtn.addEventListener('click', () => toggle(false));

    function toggle(open) {
        isOpen = open;
        win.classList.toggle('open', open);
        fab.classList.remove('has-unread');
        if (open) {
            input.focus();
            msgBox.scrollTop = msgBox.scrollHeight;
        }
    }

    /* ── LIMPIAR CHAT ────────────────────────────────────────────────── */
    clearBtn.addEventListener('click', () => {
        msgBox.innerHTML = '';
        addMessage('bot', 'Chat reiniciado. ¿En qué te puedo ayudar?');
    });

    /* ── SUGERENCIAS ─────────────────────────────────────────────────── */
    suggWrap.querySelectorAll('.cb-suggestion').forEach(btn => {
        btn.addEventListener('click', () => {
            input.value = btn.dataset.q;
            sendMessage();
        });
    });

    /* ── ENVIAR ──────────────────────────────────────────────────────── */
    sendBtn.addEventListener('click', sendMessage);
    input.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    /* Auto-resize textarea */
    input.addEventListener('input', () => {
        input.style.height = 'auto';
        input.style.height = Math.min(input.scrollHeight, 96) + 'px';
    });

    async function sendMessage() {
        const text = input.value.trim();
        if (!text || isLoading) return;

        addMessage('user', text);
        input.value = '';
        input.style.height = 'auto';
        isLoading = true;
        sendBtn.disabled = true;

        const typingId = addTyping();

        try {
            const context = buildFinancialContext();
            
            // Obtener el rol del usuario
            const isAdmin = sessionStorage.getItem('is_admin') === 'true';
            const userRole = isAdmin ? 'admin' : 'user';
            
            const res = await fetch('/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: text, context, userRole })
            });

            if (!res.ok) throw new Error('HTTP ' + res.status);
            const data = await res.json();
            removeById(typingId);
            addMessage('bot', data.response || 'Sin respuesta del servidor.');

        } catch (err) {
            removeById(typingId);
            addMessage('bot',
                '❌ No pude conectarme al servidor.\n' +
                'Verifica que la app esté activa e intenta de nuevo.'
            );
            console.error('[Chatbot]', err);
        } finally {
            isLoading = false;
            sendBtn.disabled = false;
        }
    }

    /* ── CONTEXTO FINANCIERO ─────────────────────────────────────────── */
    function buildFinancialContext() {
        /* appState, effiTotals y transporteTotals son globales del index.html */
        const ctx = {};

        if (typeof appState !== 'undefined') {
            const fp = appState.finanzasPersonales || {};
            
            // Totales
            ctx.salarios        = sum(fp.salarios, 'monto');
            ctx.gastosFijos     = sum(fp.gastosFijos, 'monto');
            ctx.ahorros         = sum(fp.ahorros, 'monto');
            ctx.bancos          = sum(fp.cuentasBancarias, 'balance');
            ctx.prestamos       = sum(fp.prestamos, 'owed');
            ctx.deudasInformal  = sum(fp.deudasInformales, 'monto');
            
            // Detalles completos para el chatbot
            ctx.salariosDetails        = fp.salarios || [];
            ctx.gastosFijosDetails     = fp.gastosFijos || [];
            ctx.ahorrosDetails         = fp.ahorros || [];
            ctx.bancosDetails          = fp.cuentasBancarias || [];
            ctx.prestamosDetails       = fp.prestamos || [];
            ctx.deudasInformalDetails  = fp.deudasInformales || [];
        }

        // Egresos manuales
        if (typeof appState !== 'undefined' && appState.egresosManuales) {
            ctx.egresosManuales = sum(appState.egresosManuales, 'monto');
            ctx.egresosManualesDetails = appState.egresosManuales;
        }

        // Gastos personales
        if (typeof appState !== 'undefined' && appState.gastosPersonales) {
            ctx.gastosPersonales = sum(appState.gastosPersonales, 'monto');
            ctx.gastosPersonalesDetails = appState.gastosPersonales;
        }

        // Deudores
        if (typeof appState !== 'undefined' && appState.deudores) {
            ctx.deudores = sum(appState.deudores, 'monto');
            ctx.deudoresDetails = appState.deudores;
        }

        // Ads
        if (typeof adsTotals !== 'undefined' && adsTotals) {
            ctx.ads = {
                facebookUSD: adsTotals.facebookUSD || 0,
                tiktokUSD: adsTotals.tiktokUSD || 0,
                totalRD: adsTotals.totalRD || 0,
                rate: adsTotals.rate || 57
            };
        }
        
        // Ads manuales
        if (typeof appState !== 'undefined' && appState.manualAds) {
            ctx.ads = ctx.ads || {};
            ctx.ads.manualAdsDetails = appState.manualAds;
            ctx.ads.totalRD = (ctx.ads.totalRD || 0) + sum(appState.manualAds, 'monto');
        }

        if (typeof effiTotals !== 'undefined' && effiTotals) {
            ctx.effi = {
                compra:         effiTotals.compra         || 0,
                recaudo:        effiTotals.recaudo        || 0,
                fleteCon:       effiTotals.fleteCon       || 0,
                fleteDev:       effiTotals.fleteDev        || 0,
                fleteSin:       effiTotals.fleteSin       || 0,
                retiro:         effiTotals.retiro         || 0,
                comisionRetiro: effiTotals.comisionRetiro || 0,
                fulfillment:    effiTotals.fulfillment    || 0,
                indemnizacion:  effiTotals.indemnizacion  || 0,
                debitoRevertido: effiTotals.debitoRevertido || 0,
            };
        }

        if (typeof transporteTotals !== 'undefined' && transporteTotals) {
            ctx.transporte = {
                totalOrdenes: transporteTotals.totalOrdenes || 0,
                entregadas:   transporteTotals.entregada    || 0,
                devoluciones: transporteTotals.devolucion   || 0,
                enTransito:   transporteTotals.transito     || 0,
                enReparto:    transporteTotals.reparto      || 0,
                novedad:      transporteTotals.novedad      || 0,
            };
        }

        return ctx;
    }

    function sum(arr, key) {
        return (arr || []).reduce((a, x) => a + Number(x[key] || 0), 0);
    }

    /* ── HELPERS DOM ─────────────────────────────────────────────────── */
    function addMessage(role, text) {
        const id  = 'cbm_' + Date.now() + '_' + Math.random().toString(36).slice(2);
        const div = document.createElement('div');
        div.id        = id;
        div.className = 'cb-msg ' + role;
        // Convertir saltos de línea pero NO interpretar HTML del servidor
        div.textContent = text;
        msgBox.appendChild(div);
        msgBox.scrollTop = msgBox.scrollHeight;

        // Notificación si el chat está cerrado y es un mensaje del bot
        if (!isOpen && role === 'bot') {
            fab.classList.add('has-unread');
        }

        return id;
    }

    function addTyping() {
        const id  = 'cbt_' + Date.now();
        const div = document.createElement('div');
        div.id        = id;
        div.className = 'cb-msg bot typing';
        div.innerHTML = '<span></span><span></span><span></span>';
        msgBox.appendChild(div);
        msgBox.scrollTop = msgBox.scrollHeight;
        return id;
    }

    function removeById(id) {
        const el = document.getElementById(id);
        if (el) el.remove();
    }

    /* ── API PÚBLICA ─────────────────────────────────────────────────── */
    /**
     * Abre el chat con un mensaje preescrito (usado desde tarjetas de ahorro, etc.)
     * @param {string} preText - Texto inicial opcional
     */
    window.openChat = function (preText) {
        toggle(true);
        if (preText) {
            input.value = preText;
            input.dispatchEvent(new Event('input')); // resize
        }
    };

}());
