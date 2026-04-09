const fs = require('fs');
const XLSX = require('xlsx');

const fileBuffer = fs.readFileSync('Reporte de movimientos de dinero Effi 2026-04-06 15_47_45.xls');
let text = fileBuffer.toString('latin1');
text = text.replace(/>([-]?\d+),(\d{2})<\/td>/g, '>$1.$2</td>');

const workbook = XLSX.read(text, {type: 'string'});
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(sheet);

console.log("ALL COMPRA DE MERCANCIA:");
data.forEach((r, index) => {
    const rawTipo = String(r['Tipo de movimiento'] || '');
    const tipo = rawTipo.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (tipo.includes('compra de') || rawTipo.includes('mercanc')) {
        console.log(`Fila ${index + 2}: ${r['Valor movimiento']} -> ${r['Contenido']}`);
    }
});
