# Creación de usuarios operativos

El administrador accede a **Usuarios** (`/admin/usuarios`) desde el menú lateral, también disponible en el menú desplegable móvil.

- `GET /users/staff`: lista perfiles de vendedor y almacén, sin hashes ni contraseñas.
- Para vendedores vinculados, muestra el nombre actual de su ficha operativa; algunos perfiles históricos conservan nombres de la carga inicial. Sin ficha vinculada, usa el nombre del perfil. Ordena por el nombre mostrado.
- `POST /users/staff`: recibe `nombre`, `usuario`, `email`, `password`, `rol` (`vendedor` o `almacen`) y `telefono` opcional para vendedores. Ambos endpoints requieren autenticación y rol `admin`.
- `PATCH /users/staff/:id/status`, exclusivo de admin, recibe `{ "activo": false }` para desactivar y `true` para reactivar. Solo permite cuentas de vendedor y almacén. Actualiza atómicamente la cuenta y la ficha vinculada, sin borrar datos ni identidad de Auth.
- El listado conserva activos e inactivos. La interfaz pide confirmar el cambio. El guard de autenticación rechaza usuarios inactivos en cada solicitud, incluidas sesiones previamente abiertas. La cuenta de Auth se conserva para reactivarla.
- Los vendedores inactivos no se ofrecen para crear pedidos; la API rechaza nuevas asignaciones a vendedores inactivos. Los pedidos históricos conservan su vendedor y pueden consultarse. Los pedidos pendientes deben reasignarse a un vendedor activo cuando corresponda.
- `usuario` es el identificador interno, de 3 a 50 caracteres, normalizado a minúsculas. Se inicia sesión con **correo y contraseña**.
- El backend crea la identidad mediante Supabase Auth Admin, con correo confirmado. El administrador entrega las credenciales de forma privada; no se envía un correo automático.
- El perfil conserva el UUID de Auth. Para vendedores, la ficha vinculada se guarda atómicamente con el perfil. Almacén no genera ficha de vendedor.
- La contraseña solo se entrega a Auth. La columna heredada `contrasena_hash` contiene el marcador no autenticable `SUPABASE_AUTH`; no se usa para iniciar sesión.
- Ante un fallo de persistencia se elimina exclusivamente la identidad creada en esa solicitud. Si esa compensación falla, el registro requiere conciliación por su UUID, registrado en el log sin credenciales.

Requiere `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` y la conexión Prisma configurados en el backend. La clave privilegiada nunca debe añadirse al frontend. No requiere migración de tablas.

Verificación local: `npm test -- --runInBand staff.spec.ts` y `npm run build`. Las pruebas usan dobles de Auth y persistencia; no prueban el despliegue ni crean cuentas en producción.
