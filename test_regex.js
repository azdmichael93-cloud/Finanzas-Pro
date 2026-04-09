const fs = require('fs');
const XLSX = require('xlsx');

const fileBuffer = fs.readFileSync('Reporte de movimientos de dinero Effi 2026-04-06 15_47_45.xls');
let text = fileBuffer.toString('latin1');
text = text.replace(/>([-]?\d+),(\d{2})<\/td>/g, '>$1.$2</td>');

const workbook = XLSX.read(text, {type: 'string'});
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(sheet);

console.log(data.slice(0, 3));
