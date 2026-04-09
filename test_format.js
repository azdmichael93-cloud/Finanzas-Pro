const XLSX = require('xlsx');
const workbook = XLSX.readFile('Reporte de movimientos de dinero Effi 2026-04-06 15_47_45.xls');
const sheet = workbook.Sheets[workbook.SheetNames[0]];

// Read with raw: true to see what the library actually sees
const dataRaw = XLSX.utils.sheet_to_json(sheet, {raw: false});
console.log("RAW STRING DATA (first 3):", dataRaw.slice(0, 3).map(r => r['Valor movimiento']));

const dataNum = XLSX.utils.sheet_to_json(sheet);
console.log("NUMERIC DATA (first 3):", dataNum.slice(0, 3).map(r => r['Valor movimiento']));

