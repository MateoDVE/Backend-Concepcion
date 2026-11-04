-- Applied through Supabase migration add_pedido_fecha_programada.
-- Additive: no historical order is rewritten.
ALTER TABLE public.pedidos ADD COLUMN fecha_programada date NULL;
CREATE INDEX pedidos_fecha_programada_vendedor_id_idx
  ON public.pedidos (fecha_programada, vendedor_id);
COMMENT ON COLUMN public.pedidos.fecha_programada IS
  'Dia programado de entrega en America/La_Paz. NULL conserva el dia de fecha_creacion para pedidos anteriores.';
