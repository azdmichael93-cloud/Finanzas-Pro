const XLSX = require('xlsx');

function analyzeCol(filePath, colName) {
    try {
        const workbook = XLSX.readFile(filePath);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(sheet);
        const values = data.map(r => r[colName]).filter(Boolean);
        const unique = [...new Set(values)];
        
        console.log(`\n--- Unique values for '${colName}' in ${filePath} ---`);
        const counts = {};
        values.forEach(v => { counts[v] = (counts[v] || 0) + 1; });
        for (const [key, count] of Object.entries(counts)) {
             console.log(`- "${key}": ${count}`);
        }
    } catch (e) {
        console.error("Error:", e.message);
    }
}

analyzeCol('Reporte de Guías de transporte 2026-04-06.xlsx', 'Estado global guía inicial');
analyzeCol('Reporte de movimientos de dinero Effi 2026-04-06 15_47_45.xls', 'Tipo de movimiento');
