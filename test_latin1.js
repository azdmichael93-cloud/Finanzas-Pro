const fs = require('fs');
const XLSX = require('xlsx');

const fileBuffer = fs.readFileSync('Reporte de movimientos de dinero Effi 2026-04-06 15_47_45.xls');
const text = fileBuffer.toString('latin1'); // latin1 is iso-8859-1
const workbook = XLSX.read(text, {type: 'string'});
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(sheet);

console.log(data.filter(r => r['Tipo de movimiento'] && r['Tipo de movimiento'].includes('devoluci')).slice(0, 2));
