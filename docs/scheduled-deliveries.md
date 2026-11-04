# Entregas programadas

## Contrato

`POST /orders` y `PUT /orders/:id` aceptan `fecha_programada` opcional en formato estricto `YYYY-MM-DD`. Se almacena como `date`; no sustituye `fecha_creacion` ni `fecha_entrega` (entrega realizada). Omitirlo en una edición conserva su valor. Un pedido entregado no puede cambiar de día programado.

`GET /orders?fecha_programada=YYYY-MM-DD` filtra por día operativo. Los filtros existentes `fecha`, `fecha_inicio` y `fecha_fin` mantienen su significado de fecha de creación. Un pedido antiguo sin programación pertenece al día de creación en `America/La_Paz`.

La ruta, su orden manual y los reportes operativos utilizan el día programado. Cambiar el día o vendedor invalida la posición anterior de ruta. Mover pendientes al día siguiente cambia la programación y conserva la creación. Los cierres guardados no se reescriben.

## Base de datos

Migración remota `add_pedido_fecha_programada` aplicada en **DB-Concepcion** (`olqhngiyebbjuhgsqrkk`) el 2026-11-03. SQL reproducible en `scheduled-deliveries.sql`. Se verificaron 1.791 pedidos antes y después, y cero valores programados tras la migración: no se alteraron datos históricos.

## Publicación

1. La migración aditiva ya está aplicada.
2. Publicar el backend con Prisma Client regenerado (`prisma generate`).
3. Publicar el frontend después del backend: la versión anterior del API no conoce la fecha programada.
4. Verificar con una cuenta de prueba la creación para mañana, edición, filtros por fecha, orden de ruta y entrega efectiva.

No se realizó despliegue ni se crearon pedidos de prueba en producción en esta tarea.
