import pandas as pd
import sys

try:
    df1 = pd.read_excel('Reporte de Guías de transporte 2026-04-06.xlsx')
    print("Transporte cols:", df1.columns.tolist()[:10])
except Exception as e:
    print("Err1:", e)

try:
    df2 = pd.read_excel('Reporte de movimientos de dinero Effi 2026-04-06 15_47_45.xls')
    print("Effi cols:", df2.columns.tolist()[:10])
except Exception as e:
    print("Err2:", e)
