const XLSX = require('xlsx');
const workbook = XLSX.readFile('Reporte de movimientos de dinero Effi 2026-04-06 15_47_45.xls');
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(sheet);
const recaudos = data.filter(r => r['Tipo de movimiento'] === 'Recaudo de venta').map(r => r['Valor movimiento']);
console.log("Recaudos:", recaudos);
