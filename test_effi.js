const XLSX = require('xlsx');
const workbook = XLSX.readFile('Reporte de movimientos de dinero Effi 2026-04-06 15_47_45.xls');
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(sheet);

let costo = 0;
let transportes = 0;
let depositos = 0;
let devoluciones = 0;

data.forEach(r => {
    let t = r['Tipo de movimiento'] || '';
    let v = parseFloat(r['Valor movimiento']) || 0;
    if (t.includes('Compra de mercanc')) costo += v;
    if (t.includes('Recaudo de venta')) depositos += v;
    if (t.includes('Flete') && !t.includes('devoluci')) transportes += v;
    if (t.includes('Flete') && t.includes('devoluci')) devoluciones += v;
});

console.log("Costo:", costo);
console.log("Transportes:", transportes);
console.log("Depositos:", depositos);
console.log("Devoluciones:", devoluciones);
