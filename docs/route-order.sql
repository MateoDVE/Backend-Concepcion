-- Applied remotely via Supabase migration add_pedido_orden_ruta.
ALTER TABLE public.pedidos ADD COLUMN orden_ruta integer;
ALTER TABLE public.pedidos ADD CONSTRAINT pedidos_orden_ruta_positive
  CHECK (orden_ruta IS NULL OR orden_ruta > 0);
