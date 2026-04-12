const express    = require('express');
const multer     = require('multer');
const cors       = require('cors');
const path       = require('path');
const fs         = require('fs');
const sqlite3    = require('sqlite3').verbose();

const app  = express();
const PORT = process.env.PORT || 10000;

/* ── CREDENCIALES ADMIN ─────────────────────────────────────────────── */
const ADMIN_USERNAME = 'azdelmicha@gmail.com';
const ADMIN_PASSWORD = 'SuperAdmin2026!';
let adminUserId = null;

/* ── PERSISTENCIA DE DATOS ──────────────────────────────────────────── */
const DATA_DIR    = fs.existsSync('/data') ? '/data' : path.join(__dirname, 'data');
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
app.use('/src', express.static(path.join(__dirname, 'src')));
app.use(express.static(__dirname));

/* ── RUTAS ESTÁTICAS ────────────────────────────────────────────────── */
app.get('/', (_req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/healthz', (_req, res) => res.sendStatus(200));

/* ── CHATBOT IA ─────────────────────────────────────────────────────── */
app.post('/chat', async (req, res) => {
    const message = String(req.body.message || '').trim();
    const context = req.body.context || null;
    if (!message) return res.status(400).json({ response: 'Mensaje vacío.' });

    let systemPrompt =
        'Eres "Finanzas AI", asistente inteligente de la app Finanzas Pro de 2Nexora, ' +
        'para gestión de e-commerce y finanzas personales en República Dominicana. ' +
        'Respondes en español, de forma concisa y útil. Trabajas con RD$ y US$. ' +
        'Cuando el usuario pregunta por análisis, calcula con los datos disponibles. ' +
        'Usa texto plano con saltos de línea, sin markdown con asteriscos ni almohadillas.';

    if (context && typeof context === 'object') {
        const fmt = (n) => 'RD$ ' + Number(n || 0).toLocaleString('es-DO', { minimumFractionDigits: 2 });
        const c = context;
        systemPrompt += '\n\n--- DATOS FINANCIEROS ACTUALES ---';
        if (c.salarios !== undefined) {
            systemPrompt += `\nFinanzas Personales:\n- Ingresos: ${fmt(c.salarios)}\n- Gastos fijos: ${fmt(c.gastosFijos)}\n- Ahorros: ${fmt(c.ahorros)}\n- Bancos: ${fmt(c.bancos)}\n- Préstamos: ${fmt(c.prestamos)}\n- Deudas informales: ${fmt(c.deudasInformal)}\n- Disponible: ${fmt((c.salarios||0)-(c.gastosFijos||0)-(c.ahorros||0))}`;
        }
        if (c.effi) {
            const e = c.effi;
            const g = (e.recaudo||0) - (e.compra||0) - (e.fleteCon||0) - (e.fleteDev||0) - (e.fleteSin||0) - (e.comisionRetiro||0) - (e.fulfillment||0);
            systemPrompt += `\nEffi Commerce:\n- Recaudo ventas: ${fmt(e.recaudo)}\n- Compra mercancía: ${fmt(e.compra)}\n- Flete con recaudo: ${fmt(e.fleteCon)}\n- Flete devolución: ${fmt(e.fleteDev)}\n- Flete sin recaudo: ${fmt(e.fleteSin)}\n- Retiro: ${fmt(e.retiro)}\n- Comisión retiro: ${fmt(e.comisionRetiro)}\n- Fulfillment: ${fmt(e.fulfillment)}\n- Ganancia estimada: ${fmt(g)}`;
        }
        if (c.transporte) {
            const t = c.transporte;
            const pE = t.totalOrdenes > 0 ? ((t.entregadas/t.totalOrdenes)*100).toFixed(2) : '0.00';
            const pD = t.totalOrdenes > 0 ? ((t.devoluciones/t.totalOrdenes)*100).toFixed(2) : '0.00';
            systemPrompt += `\nGuías Transporte (${t.totalOrdenes} total):\n- Entregadas: ${t.entregadas} (${pE}%)\n- Devoluciones: ${t.devoluciones} (${pD}%)\n- En tránsito: ${t.enTransito}\n- En reparto: ${t.enReparto}`;
        }
        systemPrompt += '\n--- FIN DATOS ---';
    }

    try {
        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) return res.json({ response: buildOfflineResponse(message, context) });

        const apiRes = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-opus-4-5',
                max_tokens: 600,
                system: systemPrompt,
                messages: [{ role: 'user', content: message }]
            })
        });

        if (!apiRes.ok) throw new Error('Anthropic API ' + apiRes.status);
        const data = await apiRes.json();
        const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
        res.json({ response: text || 'Sin respuesta del modelo.' });

    } catch (err) {
        console.error('❌ /chat error:', err.message);
        res.json({ response: buildOfflineResponse(message, context) });
    }
});

function buildOfflineResponse(message, ctx) {
    if (!ctx) return 'No tengo acceso a tus datos. Carga los archivos Excel primero.';
    const msg = message.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const fmt = (n) => 'RD$ ' + Number(n || 0).toLocaleString('es-DO', { minimumFractionDigits: 2 });

    if (msg.includes('ganancia') || msg.includes('utilidad') || msg.includes('rentab')) {
        if (ctx.effi) {
            const e = ctx.effi;
            const ingresos = e.recaudo || 0;
            const egresos  = (e.compra||0)+(e.fleteCon||0)+(e.fleteDev||0)+(e.fleteSin||0)+(e.comisionRetiro||0)+(e.fulfillment||0);
            const ganancia = ingresos - egresos;
            const margen   = ingresos > 0 ? ((ganancia/ingresos)*100).toFixed(2) : '0.00';
            return `Resumen de rentabilidad Effi:\n• Recaudo de ventas: ${fmt(ingresos)}\n• Total egresos: ${fmt(egresos)}\n• Ganancia neta: ${fmt(ganancia)}\n• Margen: ${margen}%`;
        }
        return 'Carga el archivo de Effi para calcular tu ganancia.';
    }
    if (msg.includes('deuda') || msg.includes('prestamo') || msg.includes('credito')) {
        const total = (ctx.prestamos||0) + (ctx.deudasInformal||0);
        return `Resumen de deudas:\n• Préstamos: ${fmt(ctx.prestamos)}\n• Deudas informales: ${fmt(ctx.deudasInformal)}\n• Total: ${fmt(total)}`;
    }
    if (msg.includes('ahorro')) {
        const pct = (ctx.salarios||0) > 0 ? (((ctx.ahorros||0)/ctx.salarios)*100).toFixed(2) : '0.00';
        return `Ahorros mensuales: ${fmt(ctx.ahorros)} (${pct}% de tus ingresos de ${fmt(ctx.salarios)}).`;
    }
    if (msg.includes('devoluci') || msg.includes('effi') || msg.includes('flete')) {
        if (ctx.transporte) {
            const t = ctx.transporte;
            const pctD = t.totalOrdenes > 0 ? ((t.devoluciones/t.totalOrdenes)*100).toFixed(2) : '0.00';
            return `Estado guías (${t.totalOrdenes} total):\n• Entregadas: ${t.entregadas}\n• Devoluciones: ${t.devoluciones} (${pctD}%)\n• En tránsito: ${t.enTransito}\n• En reparto: ${t.enReparto}`;
        }
        return 'Carga el reporte de guías de transporte primero.';
    }
    if (msg.includes('disponible') || msg.includes('sobrante')) {
        const disponible = (ctx.salarios||0)-(ctx.gastosFijos||0)-(ctx.ahorros||0);
        return `Resumen personal:\n• Ingresos: ${fmt(ctx.salarios)}\n• Gastos fijos: ${fmt(ctx.gastosFijos)}\n• Ahorros: ${fmt(ctx.ahorros)}\n• Disponible: ${fmt(disponible)}`;
    }
    return 'Puedo ayudarte con: ganancias, deudas, ahorros, devoluciones de Effi o tu disponible personal. ¿Qué necesitas?';
}

/* ── AUTENTICACIÓN ──────────────────────────────────────────────────── */
app.post('/api/register', (req, res) => {
    const username = String(req.body.username || '').trim();
    const password = String(req.body.password || '');
    if (!username || !password) return res.status(400).json({ success: false, message: 'Usuario y contraseña requeridos' });

    db.get('SELECT id FROM users WHERE username = ?', [username], (err, row) => {
        if (err)  return res.status(500).json({ success: false, message: 'Error interno' });
        if (row)  return res.status(400).json({ success: false, message: 'Usuario ya existe' });
        db.run('INSERT INTO users (username, password, is_admin) VALUES (?, ?, 0)', [username, password], function(e2) {
            if (e2) return res.status(500).json({ success: false, message: 'Error al crear usuario' });
            console.log(`✅ Nuevo usuario: ${username}`);
            res.json({ success: true, message: 'Usuario registrado', userId: this.lastID });
        });
    });
});

app.post('/api/login', (req, res) => {
    const username = String(req.body.username || '').trim();
    const password = String(req.body.password || '');
    if (!username || !password) return res.status(400).json({ success: false, message: 'Usuario y contraseña requeridos' });

    db.get('SELECT * FROM users WHERE username = ? AND password = ?', [username, password], (err, user) => {
        if (err) return res.status(500).json({ success: false, message: 'Error interno' });
        if (user) {
            console.log(`✅ Login: ${username}`);
            return res.json({ success: true, token: `session_token_pro_2026_${user.id}`, user: { id: user.id, username: user.username, is_admin: !!user.is_admin } });
        }
        if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
            ensureAdminUser();
            return res.json({ success: true, token: `session_token_pro_2026_${ADMIN_USERNAME}`, user: { id: 'admin', username: ADMIN_USERNAME, is_admin: true } });
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

function ensureAdminUser() {
    db.get('SELECT id FROM users WHERE username = ?', [ADMIN_USERNAME], (err, row) => {
        if (err || row) { if (row) adminUserId = row.id; return; }
        db.run('INSERT INTO users (username, password, is_admin) VALUES (?, ?, 1)', [ADMIN_USERNAME, ADMIN_PASSWORD], function(e2) {
            if (!e2) { adminUserId = this.lastID; console.log('✅ Admin creado'); }
        });
    });
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

app.post('/api/state', (req, res) => {
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

app.get('/api/state', (req, res) => {
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
    filename: (_req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No se recibió archivo.' });
    console.log('📁 Archivo guardado:', req.file.filename);
    res.json({ message: 'Archivo guardado', filename: req.file.filename });
});

// Listar archivos subidos — usado por autoLoadFile del cliente
app.get('/api/files/list', (_req, res) => {
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
app.listen(PORT, () => console.log(`🚀 Finanzas Pro corriendo en puerto ${PORT}`));
