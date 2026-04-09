const XLSX = require('xlsx');
const workbook = XLSX.readFile('Reporte de movimientos de dinero Effi 2026-04-06 15_47_45.xls');
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(sheet);
const devols = data.filter(r => String(r['Tipo de movimiento']).includes('devoluci'));
console.log(devols.map(r => ({t: r['Tipo de movimiento'], v: r['Valor movimiento']})));
