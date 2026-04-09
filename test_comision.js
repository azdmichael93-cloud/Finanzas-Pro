const XLSX = require('xlsx');
const workbook = XLSX.readFile('Reporte de movimientos de dinero Effi 2026-04-06 15_47_45.xls');
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(sheet);
const row = data.find(r => String(r['Tipo de movimiento']).includes('Comisi'));
console.log("Comision row:", row);
