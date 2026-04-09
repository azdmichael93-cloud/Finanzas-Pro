const XLSX = require('xlsx');
const workbook = XLSX.readFile('Reporte de movimientos de dinero Effi 2026-04-06 15_47_45.xls');
const sheet = workbook.Sheets[workbook.SheetNames[0]];

const dataRaw = XLSX.utils.sheet_to_json(sheet, {raw: true});
console.log("RAW TRUE DATA:", dataRaw.slice(0, 2));

const dataRawTexts = XLSX.utils.sheet_to_json(sheet, {raw: false, defval: ""});
console.log("RAW FALSE DATA:", dataRawTexts.slice(0, 2));
