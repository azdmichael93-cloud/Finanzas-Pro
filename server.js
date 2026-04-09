const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = process.env.PORT || 10000; // Puerto estándar de Render

// DETECCIÓN INTELIGENTE DEL DISCO PERSISTENTE
// En Render, el disco se monta en /data. Si no existe, usamos la carpeta local ./data
const DATA_DIR = fs.existsSync('/data') ? '/data' : path.join(__dirname, 'data');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const DB_PATH = path.join(DATA_DIR, 'database.sqlite');

console.log('--- CONFIGURACIÓN DE PERSISTENCIA ---');
console.log('Carpeta de datos:', DATA_DIR);
console.log('Ruta de base de datos:', DB_PATH);

// Asegurar que las carpetas existan
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

app.use(cors());
app.use(express.json({ limit: '50mb' })); // Permitir estados grandes
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(__dirname)); // Servir index.html

// --- SEGURIDAD: LOGIN ---
const USERS = {
    "azdelmicha@gmail.com": "SuperAdmin2026!"
};

app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    if (USERS[email] && USERS[email] === password) {
        // En una app real usaríamos JWT, aquí usaremos un token simple para persistencia local
        res.json({ success: true, token: 'session_token_pro_2026' });
    } else {
        res.status(401).json({ success: false, message: 'Credenciales incorrectas' });
    }
});

// --- BASE DE DATOS ---
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) console.error('❌ Error al abrir SQLite:', err);
    else {
        console.log('✅ SQLite conectado correctamente');
        db.run(`CREATE TABLE IF NOT EXISTS app_state (
            id INTEGER PRIMARY KEY,
            key TEXT UNIQUE,
            value TEXT
        )`);
    }
});

// --- CONFIGURACIÓN DE CARGA DE ARCHIVOS ---
const storage = multer.diskStorage({
    destination: UPLOADS_DIR,
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage });

// --- RUTAS DE API ---

// 1. Guardar el estado completo
app.post('/api/state', (req, res) => {
    const state = JSON.stringify(req.body);
    db.run('INSERT OR REPLACE INTO app_state (key, value) VALUES (?, ?)', ['current_state', state], function(err) {
        if (err) {
            console.error('❌ Error al guardar estado:', err.message);
            return res.status(500).json({ error: err.message });
        }
        console.log('💾 Estado guardado exitosamente');
        res.json({ success: true });
    });
});

// 2. Obtener el estado guardado
app.get('/api/state', (req, res) => {
    db.get('SELECT value FROM app_state WHERE key = ?', ['current_state'], (err, row) => {
        if (err) {
            console.error('❌ Error al leer estado:', err.message);
            return res.status(500).json({ error: err.message });
        }
        res.json(row ? JSON.parse(row.value) : null);
    });
});

// 3. Subir un archivo
app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).send('No se subió ningún archivo.');
    console.log('📁 Archivo subido:', req.file.filename);
    res.json({ 
        message: 'Archivo guardado',
        filename: req.file.filename
    });
});

// Ruta de salud
app.get('/healthz', (req, res) => res.sendStatus(200));

app.listen(PORT, () => {
    console.log(`🚀 Servidor Finanzas-Pro corriendo en puerto ${PORT}`);
});
