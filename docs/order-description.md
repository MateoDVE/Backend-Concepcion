# Descripción del pedido

`POST /orders` y `PUT /orders/:id` aceptan `descripcion` opcional (texto o null, máximo 1000 caracteres). La API elimina espacios de los extremos y almacena textos vacíos como null. Omitir el campo al actualizar conserva su valor; enviar null o texto vacío lo borra.

Disponible en creación/edición del administrador, venta/pedido directo del vendedor, listado y detalle del administrador y ruta del vendedor. Reabrir o reprogramar conserva la descripción.

Migración remota `add_pedido_descripcion` aplicada en DB-Concepcion:

```sql
ALTER TABLE public.pedidos ADD COLUMN descripcion varchar(1000);
```

Los pedidos anteriores quedan con null. Antes de desplegar el backend, regenerar el cliente con `npx prisma generate`; desplegar también el frontend para mostrar el campo.
