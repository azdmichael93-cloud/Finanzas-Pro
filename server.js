const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = process.env.PORT || 10000; // Puerto estándar de Render

const ADMIN_USERNAME = 'azdelmicha@gmail.com';
const ADMIN_PASSWORD = 'SuperAdmin2026!';
let adminUserId = null;

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

// --- SEGURIDAD: LOGIN Y REGISTRO ---

app.post('/api/register', (req, res) => {
    const usernameRaw = req.body.username || '';
    const password = req.body.password || '';
    const username = usernameRaw.trim();
    
    if (!username || !password) {
        return res.status(400).json({ 
            success: false, 
            message: 'Usuario y contraseña son requeridos' 
        });
    }

    // Verificar si el usuario ya existe
    db.get(`SELECT * FROM users WHERE username = ?`, [username], (err, row) => {
        if (err) {
            console.error('❌ Error al verificar usuario:', err);
            return res.status(500).json({ 
                success: false, 
                message: 'Error interno del servidor' 
            });
        }

        if (row) {
            return res.status(400).json({ 
                success: false, 
                message: 'El usuario ya existe' 
            });
        }

        // Insertar nuevo usuario (no admin por defecto)
        db.run(
            `INSERT INTO users (username, password, is_admin) VALUES (?, ?, ?)`,
            [username, password, 0],
            function(err) {
                if (err) {
                    console.error('❌ Error al crear usuario:', err);
                    return res.status(500).json({ 
                        success: false, 
                        message: 'Error al crear el usuario' 
                    });
                }

                console.log(`✅ Nuevo usuario registrado: ${username}`);
                res.json({ 
                    success: true, 
                    message: 'Usuario registrado exitosamente',
                    userId: this.lastID
                });
            }
        );
    });
});

app.post('/api/login', (req, res) => {
    const usernameRaw = req.body.username || '';
    const password = req.body.password || '';
    const username = usernameRaw.trim();
    
    if (!username || !password) {
        return res.status(400).json({ 
            success: false, 
            message: 'Usuario y contraseña son requeridos' 
        });
    }

    // Verificar credenciales en la base de datos
    db.get(
        `SELECT * FROM users WHERE username = ? AND password = ?`,
        [username, password],
        (err, user) => {
            if (err) {
                console.error('❌ Error al verificar login:', err);
                return res.status(500).json({ 
                    success: false, 
                    message: 'Error interno del servidor' 
                });
            }

            if (user) {
                // Login exitoso
                const token = `session_token_pro_2026_${user.id}`;
                console.log(`✅ Login exitoso para: ${username} (admin: ${user.is_admin})`);
                res.json({ 
                    success: true, 
                    token: token,
                    user: {
                        id: user.id,
                        username: user.username,
                        is_admin: !!user.is_admin
                    }
                });
            } else if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
                const token = `session_token_pro_2026_${ADMIN_USERNAME}`;
                console.log('✅ Login exitoso con credenciales admin por defecto');
                // Asegurar que el usuario admin existe en BD tras login
                ensureAdminUser();
                res.json({
                    success: true,
                    token,
                    user: {
                        id: 'admin',
                        username: ADMIN_USERNAME,
                        is_admin: true
                    }
                });
            } else {
                // Credenciales inválidas
                res.status(401).json({ 
                    success: false, 
                    message: 'Credenciales incorrectas' 
                });
            }
        }
    );
});

// --- BASE DE DATOS ---
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) console.error('❌ Error al abrir SQLite:', err);
    else {
        console.log('✅ SQLite conectado correctamente');
        // Tabla para estado de la aplicación
        db.run(`CREATE TABLE IF NOT EXISTS app_state (
            id INTEGER PRIMARY KEY,
            key TEXT UNIQUE,
            value TEXT
        )`);
        // Tabla para usuarios
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            is_admin BOOLEAN DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, (err) => {
            if (err) {
                console.error('❌ Error al crear tabla de usuarios:', err);
            } else {
                ensureAdminUser();
            }
        });
    }
});

function ensureAdminUser() {
    db.get(`SELECT id FROM users WHERE username = ?`, [ADMIN_USERNAME], (err, row) => {
        if (err) {
            console.error('❌ Error al verificar usuario admin:', err);
            return;
        }

        if (row) {
            adminUserId = row.id;
            return;
        }

        db.run(
            `INSERT INTO users (username, password, is_admin) VALUES (?, ?, 1)`,
            [ADMIN_USERNAME, ADMIN_PASSWORD],
            function(insertErr) {
                if (insertErr) {
                    console.error('❌ Error al crear usuario admin:', insertErr);
                } else {
                    adminUserId = this.lastID;
                    console.log('✅ Usuario admin creado por defecto');
                }
            }
        );
    });
}

function sanitizeUserId(value) {
    if (!value || value === 'undefined' || value === 'null') return 'shared';
    const sanitized = String(value).replace(/[^a-zA-Z0-9_-]/g, '');
    return sanitized || 'shared';
}

function getStateStorageKey(userId) {
    const cleanId = sanitizeUserId(userId);
    if (!cleanId || cleanId === 'shared') return 'current_state';
    return `state_${cleanId}`;
}

function isAdminIdentifier(userId) {
    if (!userId) return false;
    if (String(userId) === 'admin' || String(userId) === ADMIN_USERNAME) return true;
    if (adminUserId && Number(userId) === Number(adminUserId)) return true;
    return false;
}

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
    const userIdRaw = req.query.userId;
    const storageKey = getStateStorageKey(userIdRaw);
    const state = JSON.stringify(req.body || {});
    const mirrorToLegacy = isAdminIdentifier(userIdRaw) && storageKey !== 'current_state';

    db.run('INSERT OR REPLACE INTO app_state (key, value) VALUES (?, ?)', [storageKey, state], (err) => {
        if (err) {
            console.error('❌ Error al guardar estado:', err.message);
            return res.status(500).json({ error: err.message });
        }

        const finalize = () => {
            console.log(`💾 Estado guardado para ${storageKey}`);
            res.json({ success: true });
        };

        if (mirrorToLegacy) {
            db.run('INSERT OR REPLACE INTO app_state (key, value) VALUES (?, ?)', ['current_state', state], (legacyErr) => {
                if (legacyErr) {
                    console.error('⚠️ No se pudo actualizar el estado legado:', legacyErr.message);
                }
                finalize();
            });
        } else {
            finalize();
        }
    });
});

// 2. Obtener el estado guardado
app.get('/api/state', (req, res) => {
    const userIdRaw = req.query.userId;
    const storageKey = getStateStorageKey(userIdRaw);
    const isAdminUser = isAdminIdentifier(userIdRaw);

    const parseAndRespond = (row) => {
        if (!row || !row.value) return res.json(null);
        try {
            return res.json(JSON.parse(row.value));
        } catch (parseErr) {
            console.error('❌ Error al parsear estado guardado:', parseErr.message);
            return res.status(500).json({ error: 'Estado corrupto' });
        }
    };

    db.get('SELECT value FROM app_state WHERE key = ?', [storageKey], (err, row) => {
        if (err) {
            console.error('❌ Error al leer estado:', err.message);
            return res.status(500).json({ error: err.message });
        }

        if (row) {
            return parseAndRespond(row);
        }

        if (isAdminUser && storageKey !== 'current_state') {
            db.get('SELECT value FROM app_state WHERE key = ?', ['current_state'], (legacyErr, legacyRow) => {
                if (legacyErr) {
                    console.error('❌ Error al leer estado legado:', legacyErr.message);
                    return res.status(500).json({ error: legacyErr.message });
                }
                return parseAndRespond(legacyRow);
            });
        } else {
            return res.json(null);
        }
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
