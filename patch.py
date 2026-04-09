import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update CSS
css_to_add = """
        .history-table { width: 100%; border-collapse: collapse; margin-top: 20px; color: white; }
        .history-table th, .history-table td { border: 1px solid #555; padding: 10px; text-align: center; }
        .history-table th { background-color: #0d1a33; color: #ffd700; }
        .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.8); display: none; align-items: center; justify-content: center; z-index: 9999; }
        .modal-premium { background: linear-gradient(135deg, #1c3664, #0d1a33); border: 2px solid #ffd700; border-radius: 10px; padding: 30px; width: 450px; text-align: center; box-shadow: 0 0 20px rgba(255, 215, 0, 0.3); }
        .modal-premium h3 { color: #ff4d4d; margin-top: 0; font-size: 24px;}
        .modal-premium p { font-size: 16px; margin-bottom: 25px;}
        .btn-modal { padding: 10px 20px; border: none; border-radius: 4px; font-weight: bold; cursor: pointer; margin: 0 10px;}
        .btn-accept { background-color: #00ff00; color: #003300; }
        .btn-cancel { background-color: #ff4d4d; color: white; }
    </style>"""
content = content.replace('</style>', css_to_add)

# 2. Update Sidebar
sidebar_old = """<button class="menu-btn" onclick="switchTab('view-dashboard', this)">📊 3. Panel General</button>"""
sidebar_new = """<button class="menu-btn" onclick="switchTab('view-dashboard', this)">📊 3. Panel General</button>
        <button class="menu-btn" onclick="switchTab('view-historial', this)">📆 4. Historial de Cuadres</button>"""
content = content.replace(sidebar_old, sidebar_new)

# 3. Update Egresos Form & Change button action
form_old = """<div class="form-group">
                    <label>Monto Pendiente a Tarjeta (RD$):</label>"""
form_new = """<div class="form-group">
                    <label>Monto Actual en Cuenta de Banco (RD$):</label>
                    <input type="number" id="inCuenta" value="0.00" step="0.01">
                </div>
                <div class="form-group">
                    <label>Monto Pendiente a Tarjeta (RD$):</label>"""
content = content.replace(form_old, form_new)

btn_old = """<button class="action-btn" onclick="processFilesAndShowDashboard()">Calcular y Ver Dashboard 📊</button>"""
btn_new = """<button class="action-btn" onclick="checkDateAndProcess()">Calcular y Ver Dashboard 📊</button>"""
content = content.replace(btn_old, btn_new)

# 4. Update Administracion Block
admin_old = """<div class="section">
                        <div class="section-title title-orange">ADMINISTRACION</div>
                        <div class="list-row">
                            <span class="label">Total en cuenta</span>
                            <span class="separator">|</span>
                            <span class="value val-green" id="admTotalCta">RD$ 0.00</span>
                        </div>
                        <div class="list-row">
                            <span class="label">Retirar de EFFI</span>
                            <span class="separator">|</span>
                            <span class="value bg-pink" id="admRetirarEffi">RD$ 0.00</span>
                        </div>
                        <div class="list-row">
                            <span class="label">Monto pendiente tarjeta</span>
                            <span class="separator">|</span>
                            <span class="value bg-pink" id="admMontoPend">RD$ 0.00</span>
                        </div>
                        <div class="list-row">
                            <span class="label">Total a depositar</span>
                            <span class="separator">|</span>
                            <span class="value bg-pink" id="admTotalDep">RD$ 0.00</span>
                        </div>
                    </div>"""
admin_new = """<div class="section" style="display: flex; flex-direction: column;">
                        <div class="section-title title-orange">CUADRE Y COBRO</div>
                        <div class="list-row">
                            <span class="label">Monto en Cuenta (Banco)</span>
                            <span class="separator">|</span>
                            <span class="value val-green" id="admCuenta">RD$ 0.00</span>
                        </div>
                        <div class="list-row">
                            <span class="label">Retirado de EFFI</span>
                            <span class="separator">|</span>
                            <span class="value val-pink" id="admRetirarEffi">RD$ 0.00</span>
                        </div>
                        <div class="list-row" style="border-bottom: 1px dashed #555; padding-bottom: 5px; margin-bottom: 10px;">
                            <span class="label">Balance Real (Queda)</span>
                            <span class="separator">|</span>
                            <span class="value val-green" id="admBalanceReal">RD$ 0.00</span>
                        </div>
                        <div class="list-row">
                            <span class="label" style="color: #ffd700;">Ganancias Disponibles</span>
                            <span class="separator">|</span>
                            <span class="value bg-green" id="admGananciasCobrar">RD$ 0.00</span>
                        </div>
                        <button onclick="cobrarGanancias()" style="margin-top: auto; padding: 12px; font-weight: bold; font-size: 14px; background: linear-gradient(180deg, #ffd700, #b39700); color: black; border: none; border-radius: 4px; cursor: pointer; text-transform: uppercase; box-shadow: 0 4px 6px rgba(0,0,0,0.3);">
                            Cobrar Ganancias 💰
                        </button>
                    </div>"""
content = content.replace(admin_old, admin_new)

# 5. Add view-historial and Modal right before <script>
historial_html = """
        <!-- VISTA 4: HISTORIAL -->
        <div id="view-historial" class="tab-view">
            <div class="form-container" style="max-width: 800px;">
                <h2>📆 Historial de Cuadres y Cobros</h2>
                <p style="color: #ccc; font-size: 14px;">Aquí se guardan las evidencias de las ganancias recogidas.</p>
                <table class="history-table">
                    <thead>
                        <tr>
                            <th>Fecha de Cobro</th>
                            <th>Monto Cobrado</th>
                            <th>Documento Origen</th>
                        </tr>
                    </thead>
                    <tbody id="historialBody">
                        <!-- Llenado por JS -->
                    </tbody>
                </table>
            </div>
        </div>
    </div>

    <!-- MODAL PREMIUM -->
    <div id="modalFecha" class="modal-overlay">
        <div class="modal-premium">
            <h3>⚠️ ADVERTENCIA DE CIERRE ⚠️</h3>
            <p>El documento de Excel que intentas procesar es de un <b>mes pasado</b>.</p>
            <p style="font-size: 14px; color: #ccc;">¿Estás seguro de que quieres realizar los cálculos con este documento antiguo?</p>
            <div style="margin-top: 20px;">
                <button class="btn-modal btn-cancel" onclick="closeModal()">Cancelar</button>
                <button class="btn-modal btn-accept" onclick="acceptOldDate()">Aceptar y Calcular</button>
            </div>
        </div>
    </div>

    <script>"""
content = content.replace('    </div>\n\n    <script>', historial_html)

# 6. JS Logic Replacement
js_old = """        function processFilesAndShowDashboard() {"""
js_new = """        window.gananciaActualNum = 0;

        document.addEventListener('DOMContentLoaded', renderHistorial);

        function renderHistorial() {
            const historial = JSON.parse(localStorage.getItem('historialCuadres') || '[]');
            const tbody = document.getElementById('historialBody');
            if(!tbody) return;
            tbody.innerHTML = '';
            if(historial.length === 0) {
                tbody.innerHTML = '<tr><td colspan="3">No hay cobros registrados aún.</td></tr>';
                return;
            }
            // Reverse para ver el más reciente primero
            [...historial].reverse().forEach(h => {
                tbody.innerHTML += `<tr>
                    <td>${h.fecha}</td>
                    <td><span class="bg-green" style="padding: 2px 8px; border-radius: 4px; color: #003300; font-weight: bold;">${h.monto}</span></td>
                    <td>${h.archivo}</td>
                </tr>`;
            });
        }

        function checkDateAndProcess() {
            const fileTransporte = document.getElementById('fileTransporte').files[0];
            const fileEffi = document.getElementById('fileEffi').files[0];

            if (!fileTransporte || !fileEffi) {
                alert('⚠️ Por favor seleccione ambos archivos Excel en la pestaña "1. Cargar Archivos".');
                return;
            }

            const dateMatch = fileEffi.name.match(/\d{4}-\d{2}-\d{2}/);
            if(dateMatch) {
                const fileDate = new Date(dateMatch[0]);
                const today = new Date();
                // Validacion: Si es de un mes/año anterior
                if(fileDate.getFullYear() < today.getFullYear() || 
                  (fileDate.getFullYear() === today.getFullYear() && fileDate.getMonth() < today.getMonth())) {
                    document.getElementById('modalFecha').style.display = 'flex';
                    return;
                }
            }
            executeProcessing();
        }

        function closeModal() { document.getElementById('modalFecha').style.display = 'none'; }
        function acceptOldDate() { closeModal(); executeProcessing(); }

        function cobrarGanancias() {
            if(window.gananciaActualNum <= 0) {
                alert('No hay ganancias positivas para cobrar en este reporte.');
                return;
            }
            if(confirm('¿Estás seguro de registrar el cobro de estas ganancias por ' + formatCurrency(window.gananciaActualNum) + '?')) {
                const cuadre = {
                    fecha: new Date().toLocaleDateString('es-DO'),
                    monto: formatCurrency(window.gananciaActualNum),
                    archivo: document.getElementById('fileEffi').files[0].name
                };
                let historial = JSON.parse(localStorage.getItem('historialCuadres') || '[]');
                historial.push(cuadre);
                localStorage.setItem('historialCuadres', JSON.stringify(historial));
                
                renderHistorial();
                alert('¡Cobro registrado exitosamente en el historial!');
                
                // Limpiar todo para iniciar limpio
                document.getElementById('fileTransporte').value = '';
                document.getElementById('fileEffi').value = '';
                document.getElementById('inCuenta').value = '0.00';
                
                switchTab('view-historial', document.querySelectorAll('.menu-btn')[3]);
            }
        }

        function executeProcessing() {"""
content = content.replace(js_old, js_new)

# 7. Add admCuenta logic in executeProcessing
js_inputs_old = """                    // Inputs manuales
                    const montoPendiente = parseFloat(document.getElementById('inPendiente').value) || 0;
                    const tarjGol = parseFloat(document.getElementById('inGol').value) || 0;
                    const tarjVisa = parseFloat(document.getElementById('inVisa').value) || 0;"""
js_inputs_new = """                    // Inputs manuales
                    const montoCuenta = parseFloat(document.getElementById('inCuenta').value) || 0;
                    const montoPendiente = parseFloat(document.getElementById('inPendiente').value) || 0;
                    const tarjGol = parseFloat(document.getElementById('inGol').value) || 0;
                    const tarjVisa = parseFloat(document.getElementById('inVisa').value) || 0;"""
content = content.replace(js_inputs_old, js_inputs_new)

# 8. Update Admin calculations 
js_admin_old = """                    // Admin section
                    document.getElementById('admTotalCta').innerText = formatCurrencySigned(gananciasDepositada);
                    document.getElementById('admRetirarEffi').innerText = formatCurrencySigned(retiros);
                    document.getElementById('admMontoPend').innerText = formatCurrencySigned(montoPendiente);
                    
                    const totalDepositar = gananciasDepositada + montoPendiente;
                    document.getElementById('admTotalDep').innerText = formatCurrencySigned(totalDepositar);"""
    
js_admin_new = """                    // Admin section (CUADRE Y COBRO)
                    window.gananciaActualNum = gananciasDepositada; // Guardar global para el cobro
                    
                    document.getElementById('admCuenta').innerText = formatCurrency(Math.abs(montoCuenta));
                    document.getElementById('admRetirarEffi').innerText = formatCurrencySigned(retiros); // retiros ya viene negativo
                    
                    const balanceReal = montoCuenta + retiros; // Sumamos porque retiros ya viene con signo negativo
                    document.getElementById('admBalanceReal').innerText = formatCurrencySigned(balanceReal);
                    
                    document.getElementById('admGananciasCobrar').innerText = formatCurrencySigned(gananciasDepositada);"""
    
content = content.replace(js_admin_old, js_admin_new)

# Rename function internally to match execution wrapper
content = content.replace('switchTab(\'view-dashboard\', document.querySelectorAll(\'.menu-btn\')[2]);', 'switchTab(\'view-dashboard\', document.querySelectorAll(\'.menu-btn\')[2]);\n            document.getElementById(\'modalFecha\').style.display = \'none\';')


with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)
