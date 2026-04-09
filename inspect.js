const XLSX = require('xlsx');
const fs = require('fs');

function inspectFile(filePath) {
    console.log(`\n--- Inspecting: ${filePath} ---`);
    try {
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        console.log("Sheet Name:", sheetName);
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        
        if (data.length > 0) {
            console.log("Headers:");
            console.log(data[0]);
            
            if (data.length > 1) {
                console.log("Row 1:");
                console.log(data[1]);
            }
        }
    } catch (e) {
        console.error("Error reading file:", e.message);
    }
}

inspectFile('Reporte de Guías de transporte 2026-04-06.xlsx');
inspectFile('Reporte de movimientos de dinero Effi 2026-04-06 15_47_45.xls');
