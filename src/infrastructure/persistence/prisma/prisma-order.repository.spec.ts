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
