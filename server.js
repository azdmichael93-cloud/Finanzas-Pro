const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de rutas para el Disco Persistente de Render
// En Render el disco se montará en /data. En local usaremos ./data
const DATA_DIR = process.env.RENDER ? '/data' : path.join(__dirname, 'data');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const DB_PATH = path.join(DATA_DIR, 'database.sqlite');

// Asegurar que las carpetas existan
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR);

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // Servir el frontend (index.html, etc.)

// --- BASE DE DATOS ---
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) console.error('Error al abrir DB:', err);
    else {
        console.log('SQLite conectado en:', DB_PATH);
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
        cb(null, file.originalname);
    }
});
const upload = multer({ storage });

// --- RUTAS DE API ---

// 1. Guardar el estado completo (lo que antes iba a localStorage)
app.post('/api/state', (req, res) => {
    const state = JSON.stringify(req.body);
    db.run('INSERT OR REPLACE INTO app_state (key, value) VALUES (?, ?)', ['current_state', state], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// 2. Obtener el estado guardado
app.get('/api/state', (req, res) => {
    db.get('SELECT value FROM app_state WHERE key = ?', ['current_state'], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(row ? JSON.parse(row.value) : null);
    });
});

// 3. Subir un archivo manualmente
app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).send('No se subió ningún archivo.');
    res.json({ 
        message: 'Archivo guardado en disco persistente',
        filename: req.file.filename,
        path: req.file.path
    });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`Servidor Finanzas-Pro corriendo en puerto ${PORT}`);
});
