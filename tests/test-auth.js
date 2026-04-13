const http = require('http');

const BASE = 'http://localhost:10000';
const results = [];

function request(method, path, body, callback) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(body);
        const req = http.request(`${BASE}${path}`, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data)
            }
        }, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(body);
                    resolve({ status: res.statusCode, json });
                } catch (e) {
                    resolve({ status: res.statusCode, json: { raw: body } });
                }
            });
        });
        req.on('error', reject);
        if (body) req.write(data);
        req.end();
    });
}

async function test(name, fn) {
    try {
        const result = await fn();
        results.push({ name, pass: result.pass, msg: result.msg });
        console.log(`${result.pass ? '✅' : '❌'} ${name}`);
        if (result.detail) console.log(`   ${result.detail}`);
    } catch (e) {
        results.push({ name, pass: false, msg: e.message });
        console.log(`❌ ${name}: ${e.message}`);
    }
}

async function runTests() {
    console.log('\n=== TEST DE AUTENTICACIÓN CON BCRYPT Y RATE LIMITING ===\n');

    const username = 'test_user_' + Date.now();
    const password = 'TestPassword123!';

    await test('1. Registro de nuevo usuario', async () => {
        const res = await request('POST', '/api/register', { username, password });
        const pass = res.status === 200 && res.json.success === true;
        return { pass, msg: pass ? 'Registro exitoso' : 'Error en registro', detail: JSON.stringify(res.json) };
    });

    await test('2. Login con credenciales correctas', async () => {
        const res = await request('POST', '/api/login', { username, password });
        const pass = res.status === 200 && res.json.success === true && res.json.token;
        return { pass, msg: pass ? 'Login exitoso' : 'Error en login', detail: res.json.token ? 'Token recibido' : 'Sin token' };
    });

    await test('3. Login con password incorrecto', async () => {
        const res = await request('POST', '/api/login', { username, password: 'wrong_password' });
        const pass = res.status === 401 && res.json.success === false;
        return { pass, msg: pass ? 'Rechazado correctamente' : 'No rechazado', detail: res.json.message };
    });

    await test('4. Login con usuario inexistente', async () => {
        const res = await request('POST', '/api/login', { username: 'no_existe_xyz', password: 'test' });
        const pass = res.status === 401 && res.json.success === false;
        return { pass, msg: pass ? 'Usuario no existe rechazado' : 'Error', detail: res.json.message };
    });

    await test('5. Rate limiting (intentos excesivos)', async () => {
        let lastResult = null;
        for (let i = 0; i < 6; i++) {
            lastResult = await request('POST', '/api/login', { username: 'no_existe', password: 'wrong' });
        }
        const pass = lastResult.status === 429 || lastResult.json.message?.includes('Demasiados');
        return { pass, msg: pass ? 'Rate limit activado' : 'Rate limit no aplicado', detail: lastResult.json.message };
    });

    console.log('\n=== RESUMEN ===');
    const passed = results.filter(r => r.pass).length;
    const total = results.length;
    console.log(`Pasados: ${passed}/${total}`);
    console.log(`\nNota: Los tests 1-4 requieren que el servidor esté corriendo en puerto 10000`);
    console.log(`Para iniciar: node server.js`);
}

runTests();