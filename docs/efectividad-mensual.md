# Efectividad mensual sobre pedidos existentes

El resumen mensual utiliza pedidos actuales, agrupados por fecha_creacion en America/La_Paz. Un pedido eliminado físicamente de pedidos deja de participar automáticamente. Un pedido reprogramado participa únicamente en su mes actual. Se cuentan todos los vendedores y también los pedidos sin asignar.

GET /closings/report/history mantiene sus registros diarios e importes históricos y agrega pedidos_actuales_mes, entregados_actuales_mes y fallidos_actuales_mes. Estos totales mensuales se repiten en cada fila del mes y no deben sumarse. Para ser compatible con servidores que aún no incluyen esos campos, el frontend consulta además GET /orders y calcula el resumen usando esa lista recién obtenida. Espera ambas respuestas antes de mostrar el resultado; un fallo muestra un error, no ceros ficticios. Los conteos e importes originales del cierre no se modifican.

La efectividad es entregados actuales / pedidos actuales × 100, con dos decimales. La pantalla muestra el numerador y denominador para hacer verificable el indicador. Los resúmenes Excel reciben los mismos totales; el detalle diario sigue siendo el registro histórico del cierre.

Verificación de la consulta exacta del repositorio en DB-Concepcion el 2026-11-02 (solo lectura):
- Agosto: 227 / 227 = 100%.
- Septiembre: 683 / 685 = 99,71%.
- Octubre: 822 / 822 = 100%.
- Noviembre: 19 / 22 = 86,36%.

La corrección del frontend funciona también con la versión anterior del backend, mediante GET /orders. No requiere migración ni cambios sobre los cierres guardados. Los meses visibles siguen siendo los del historial existente. Esta consulta no convierte los importes históricos en ventas actuales ni reconstruye cierres.
