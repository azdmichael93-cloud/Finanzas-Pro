const XLSX = require('xlsx');

function dumpFile(filePath) {
    console.log(`\n--- Dumping: ${filePath} ---`);
    try {
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet);
        console.log("Total rows:", data.length);
        console.log("First 3 rows:", JSON.stringify(data.slice(0, 3), null, 2));
    } catch (e) {
        console.error("Error:", e.message);
    }
}

dumpFile('Reporte de Guías de transporte 2026-04-06.xlsx');
dumpFile('Reporte de movimientos de dinero Effi 2026-04-06 15_47_45.xls');
