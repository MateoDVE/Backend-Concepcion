import { BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaOrderRepository } from './prisma-order.repository';

describe('Route persistence', () => {
  let repository: PrismaOrderRepository;
  let tx: any;
  let prisma: any;
  beforeEach(() => {
    tx = { pedido: { findMany: jest.fn().mockResolvedValue([{ id: 'a' }, { id: 'b' }]), update: jest.fn() } };
    prisma = { $transaction: jest.fn(fn => fn(tx)) };
    repository = new PrismaOrderRepository(prisma);
  });
  it('saves consecutive positions atomically and scopes the route to vendor, Bolivia day and active states', async () => {
    await repository.reorderRoute('vendor', '2026-10-28', ['b', 'a'], ['a', 'b']);
    expect(tx.pedido.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: {
      vendedor_id: 'vendor', estado: { in: ['pending', 'loaded', 'route'] },
      OR: [
        { fecha_programada: new Date('2026-10-28') },
        { fecha_programada: null, fecha_creacion: { gte: new Date('2026-10-28T04:00:00Z'), lt: new Date('2026-10-29T04:00:00Z') } },
      ],
    } }));
    expect(tx.pedido.update.mock.calls).toEqual([
      [{ where: { id: 'b' }, data: { orden_ruta: 1 } }],
      [{ where: { id: 'a' }, data: { orden_ruta: 2 } }],
    ]);
    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: 'Serializable' });
  });
  it.each([['b', 'a'], ['a'], ['a', 'b', 'new']])('rejects a stale snapshot %j before any writes', async (...previous) => {
    await expect(repository.reorderRoute('vendor', '2026-10-28', ['b', 'a'], previous)).rejects.toThrow(ConflictException);
    expect(tx.pedido.update).not.toHaveBeenCalled();
  });
  it.each([['a', 'foreign'], ['a', 'a'], ['a']])('rejects foreign, duplicate or omitted orders %j', async (...ids) => {
    await expect(repository.reorderRoute('vendor', '2026-10-28', ids, ['a', 'b'])).rejects.toThrow(BadRequestException);
    expect(tx.pedido.update).not.toHaveBeenCalled();
  });
  it('writes only the two changed positions when moving one stop', async () => {
    tx.pedido.findMany.mockResolvedValue([
      { id: 'a', orden_ruta: 1 }, { id: 'b', orden_ruta: 2 }, { id: 'c', orden_ruta: 3 }
    ]);
    await repository.reorderRoute('vendor', '2026-10-28', ['b', 'a', 'c'], ['a', 'b', 'c']);
    expect(tx.pedido.update).toHaveBeenCalledTimes(2);
    expect(tx.pedido.update).not.toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'c' } }));
  });
  it('accepts the original status/date/code order before any manual positions exist', async () => {
    tx.pedido.findMany.mockResolvedValue([
      { id: 'pending', estado: 'pending', orden_ruta: null },
      { id: 'loaded', estado: 'loaded', orden_ruta: null },
      { id: 'route', estado: 'route', orden_ruta: null },
    ]);
    await repository.reorderRoute('vendor', '2026-10-28', ['pending', 'route', 'loaded'], ['route', 'loaded', 'pending']);
    expect(tx.pedido.update).toHaveBeenCalledTimes(3);
  });
  it('returns a conflict when another transaction changes the route', async () => {
    prisma.$transaction.mockRejectedValue({ code: 'P2034' });
    await expect(repository.reorderRoute('vendor', '2026-10-28', ['b', 'a'], ['a', 'b'])).rejects.toThrow(ConflictException);
  });
  it('clears position when rescheduling orders to another day', async () => {
    prisma.pedido = { updateMany: jest.fn().mockResolvedValue({ count: 1 }) };
    await repository.moveToNextDay(['a'], new Date('2026-10-29T12:00:00Z'));
    expect(prisma.pedido.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ orden_ruta: null }) }));
  });
});


describe('Atomic delivery confirmation', () => {
  let tx: any;
  let prisma: any;
  let repository: PrismaOrderRepository;
  beforeEach(() => {
    tx = {
      pedido: {
        findUniqueOrThrow: jest.fn().mockResolvedValue({ estado: 'loaded', detalles: [{ producto_id: 'p', cantidad: 2 }] }),
        update: jest.fn().mockResolvedValue({ id: 'o', estado: 'delivered', detalles: [] }),
      },
      producto: { update: jest.fn().mockResolvedValue({}), updateMany: jest.fn().mockResolvedValue({ count: 1 }), findUnique: jest.fn().mockResolvedValue({ nombre: 'Botellon de 20L', stock: 0 }) },
    };
    prisma = { $transaction: jest.fn(fn => fn(tx)) };
    repository = new PrismaOrderRepository(prisma);
  });
  it('updates stock and delivery inside the same serializable transaction', async () => {
    await repository.updateStatus('o', 'delivered');
    expect(tx.producto.updateMany).toHaveBeenCalledWith({ where: { id: 'p', stock: { gte: 2 } }, data: { stock: { decrement: 2 } } });
    expect(tx.pedido.update).toHaveBeenCalledTimes(1);
    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: 'Serializable' });
  });
  it('does not deduct stock or replace delivery time on repeated confirmation', async () => {
    const date = new Date('2026-11-05T12:00:00Z');
    tx.pedido.findUniqueOrThrow.mockResolvedValue({ estado: 'delivered', fecha_entrega: date, detalles: [{ producto_id: 'p', cantidad: 2 }] });
    await repository.updateStatus('o', 'delivered', { fecha_entrega: new Date() });
    expect(tx.producto.update).not.toHaveBeenCalled();
    expect(tx.producto.updateMany).not.toHaveBeenCalled();
    expect(tx.pedido.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ fecha_entrega: date }) }));
  });
  it('retries a concurrent confirmation using the newly committed state', async () => {
    prisma.$transaction.mockRejectedValueOnce({ code: 'P2034' });
    tx.pedido.findUniqueOrThrow.mockResolvedValue({ estado: 'delivered', detalles: [] });
    await repository.updateStatus('o', 'delivered');
    expect(prisma.$transaction).toHaveBeenCalledTimes(2);
    expect(tx.producto.update).not.toHaveBeenCalled();
    expect(tx.producto.updateMany).not.toHaveBeenCalled();
  });
  it('returns stock when reopening a delivered order', async () => {
    tx.pedido.findUniqueOrThrow.mockResolvedValue({ estado: 'delivered', detalles: [{ producto_id: 'p', cantidad: 2 }] });
    await repository.updateStatus('o', 'loaded');
    expect(tx.producto.update).toHaveBeenCalledWith({ where: { id: 'p' }, data: { stock: { increment: 2 } } });
  });
  it('propagates failures so the transaction rolls back', async () => {
    tx.pedido.update.mockRejectedValue(new Error('write failed'));
    await expect(repository.updateStatus('o', 'delivered')).rejects.toThrow('write failed');
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });
  it('returns a useful 400 error without marking delivery when stock is insufficient', async () => {
    tx.producto.updateMany.mockResolvedValue({ count: 0 });
    let failure: BadRequestException | undefined;
    try { await repository.updateStatus('o', 'delivered'); }
    catch (error) { failure = error as BadRequestException; }
    expect(failure).toBeInstanceOf(BadRequestException);
    expect(failure?.getStatus()).toBe(400);
    expect(failure?.message).toContain('Stock insuficiente de Botellon de 20L. Disponible: 0; requerido: 2');
    expect(tx.pedido.update).not.toHaveBeenCalled();
    expect(tx.producto.update).not.toHaveBeenCalled();
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });
  it('aborts a multi-product delivery if a later product lacks stock', async () => {
    tx.pedido.findUniqueOrThrow.mockResolvedValue({ estado: 'loaded', detalles: [
      { producto_id: 'a', cantidad: 1 }, { producto_id: 'b', cantidad: 2 },
    ] });
    tx.producto.updateMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 });
    await expect(repository.updateStatus('o', 'delivered')).rejects.toThrow(BadRequestException);
    expect(tx.pedido.update).not.toHaveBeenCalled();
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });
});
