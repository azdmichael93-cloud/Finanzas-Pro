const fs = require('fs');
const XLSX = require('xlsx');

const fileBuffer = fs.readFileSync('Reporte de movimientos de dinero Effi 2026-04-06 15_47_45.xls');
let text = fileBuffer.toString('latin1');
text = text.replace(/>([-]?\d+),(\d{2})<\/td>/g, '>$1.$2</td>');

const workbook = XLSX.read(text, {type: 'string'});
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(sheet);

let costoProductos = 0;
let totalDepositos = 0;
let pagosDevoluciones = 0;
let transportes = 0;

data.forEach(row => {
    const rawTipo = String(row['Tipo de movimiento'] || '');
    const tipo = rawTipo.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const valor = parseFloat(row['Valor movimiento']) || 0;
    
    if (tipo.includes('compra de') || rawTipo.includes('mercanc')) costoProductos += valor; 
    else if (tipo.includes('recaudo de venta')) totalDepositos += valor; 
    else if (tipo.includes('flete')) {
        if (tipo.includes('devoluci') || rawTipo.includes('devoluci')) pagosDevoluciones += valor;
        else transportes += valor;
    }
});

console.log({costoProductos, totalDepositos, pagosDevoluciones, transportes});
