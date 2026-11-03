# Orden manual de ruta

## Uso
En Administración → Pedidos, selecciona la fecha y el vendedor en el panel «Orden de ruta». Usa ↑ / ↓ para cambiar las paradas pendientes, cargadas o en ruta. Cada movimiento se muestra inmediatamente y se guarda automáticamente en segundo plano. Se puede seguir pulsando ↑ / ↓ mientras se guarda; los movimientos pendientes se agrupan en la última secuencia elegida y se envían en serie. Espera el mensaje «Orden guardado» antes de salir de la pantalla. La búsqueda y el filtro de estado de la lista general no ocultan paradas del panel.

El vendedor ve la misma secuencia, sin controles para reordenar. Su pantalla consulta los pedidos cada 10 segundos mientras permanece abierta; también permite actualizar manualmente. No es una conexión push ni funciona sin conexión.

Los entregados y fallidos se muestran al final y no se reordenan en el panel de paradas pendientes. Los pedidos nuevos sin posición van al final, por fecha de creación e ID. Cambiar de vendedor o trasladar al día siguiente borra la posición anterior. La jornada utiliza America/La_Paz.

## Contrato y seguridad
`PATCH /orders/route-order` requiere el rol `admin`, verificado por el guard existente contra el usuario de la base de datos. Cuerpo:

```json
{
  "vendedor_id": "UUID",
  "fecha": "2026-10-28",
  "order_ids": ["UUID-en-primera-posicion", "UUID-en-segunda-posicion"],
  "previous_order_ids": ["UUID-en-segunda-posicion", "UUID-en-primera-posicion"]
}
```

Se valida la fecha, UUIDs, duplicados, pertenencia al vendedor/día y conjunto completo de paradas activas. Una instantánea desactualizada devuelve 409; el administrador debe volver a intentar después de actualizar la lista. El guard rechaza vendedor y almacén con 403. Los DTO generales no aceptan `orden_ruta`.

El repositorio valida la secuencia completa y escribe solo las posiciones que cambiaron en una transacción Serializable. Una ruta todavía sin posiciones requiere inicializarlas en el primer guardado. El frontend actualiza las posiciones confirmadas sin descargar todo el historial de pedidos después de cada movimiento. En caso de error descarta los movimientos pendientes y solicita una recarga. La base guarda `pedidos.orden_ruta integer NULL` y exige valores positivos cuando existe una posición. La respuesta de lectura expone `orden_ruta`; Angular la convierte en `routeOrder`.

## Base remota y despliegue
Migración `add_pedido_orden_ruta` aplicada a DB-Concepcion (`olqhngiyebbjuhgsqrkk`). SQL de referencia: `route-order.sql`. No ejecutar de nuevo sobre esa base. El repositorio no tiene un historial base de migraciones Prisma; este SQL no introduce un baseline ficticio.

Se verificaron 1.650 pedidos y cero posiciones asignadas tras la migración. Se comprobó escritura y rechazo de cero dentro de una transacción revertida. Los datos operativos no se reordenaron durante la prueba. RLS ya estaba habilitado sin políticas sobre pedidos; el acceso directo del cliente queda bloqueado y la aplicación opera mediante el backend.

Para publicar la funcionalidad faltan los despliegues de backend y frontend. Regenerar Prisma al construir el backend (`npx prisma generate`, ya incluido en `vercel-build`). No se realizaron commits ni despliegues.

## Validación
- Backend: build y 34 pruebas, con autenticación simulada en las pruebas HTTP y el guard de roles real. No equivalen a login real en producción.
- Frontend: 7 pruebas en Chrome Headless: secuencia compartida, respuesta inmediata, agrupación de movimientos rápidos, protección frente a refrescos durante el guardado y recuperación de conflictos. No se midió latencia en producción.
- El build frontend genera los bundles, pero registra un error SSR previo en `decimal-input.directive.ts` (`document is not defined`) y avisos Sass. No se considera prueba de prerenderizado limpio.
- Se corrigió el estrechamiento de tipos en `seed-users.ts` que bloqueaba la compilación; no se ejecutó el sembrado.

Los asesores de Supabase también reportaron avisos existentes sobre `rls_auto_enable()` y protección de contraseñas filtradas. Quedan fuera de este cambio:
- https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable
- https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable
- https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
