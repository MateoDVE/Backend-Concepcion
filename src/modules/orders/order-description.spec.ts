import 'reflect-metadata';
import { validate } from 'class-validator';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { OrdersService } from './orders.service';
import { PrismaOrderRepository } from '../../infrastructure/persistence/prisma/prisma-order.repository';

describe('Order description', () => {
  const current = { id: 'order', cliente_id: 'client', estado: 'pending', total: 0, descripcion: 'Recepción', detalles: [] };
  let repo: any;
  let service: OrdersService;

  beforeEach(() => {
    repo = { findById: jest.fn().mockResolvedValue(current), create: jest.fn(), update: jest.fn() };
    service = new OrdersService(repo, { findById: jest.fn().mockResolvedValue({ id: 'client' }) } as any, {} as any);
  });

  it.each([CreateOrderDto, UpdateOrderDto])('validates description type and length in %p', async (Dto) => {
    for (const descripcion of [123, 'x'.repeat(1001)]) {
      const errors = await validate(Object.assign(new Dto(), { descripcion }));
      expect(errors.some(e => e.property === 'descripcion')).toBe(true);
    }
    for (const descripcion of [undefined, null, '', 'x'.repeat(1000), 'Llamar\nal llegar']) {
      const errors = await validate(Object.assign(new Dto(), { descripcion }));
      expect(errors.some(e => e.property === 'descripcion')).toBe(false);
    }
  });

  it('trims descriptions on creation', async () => {
    await service.create({ cliente_id: 'client', detalles: [], descripcion: '  Recepción  ' });
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ descripcion: 'Recepción' }));
  });

  it('preserves an omitted description on update', async () => {
    await service.update('order', {});
    expect(repo.update).toHaveBeenCalledWith('order', {});
  });

  it.each(['', '   ', null])('clears the description with %p', async (descripcion) => {
    await service.update('order', { descripcion });
    expect(repo.update).toHaveBeenCalledWith('order', { descripcion: null });
  });

  it('preserves the description when rescheduling', async () => {
    await service.rescheduleToNextDay(current as any);
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ descripcion: 'Recepción' }));
  });

  it('persists and reads descriptions through the repository', async () => {
    let stored: any = { ...current };
    const pedido = {
      create: jest.fn(async ({ data }) => (stored = { ...stored, ...data, detalles: [] })),
      update: jest.fn(async ({ data }) => (stored = { ...stored, ...data })),
      findUnique: jest.fn(async () => stored),
    };
    const prisma: any = { pedido, $transaction: (fn: any) => fn({ pedido }) };
    const persistence = new PrismaOrderRepository(prisma);
    expect((await persistence.create({ ...current, codigo: 'TEST', vendedor_id: null } as any)).descripcion).toBe('Recepción');
    expect((await persistence.update('order', { descripcion: 'Llamar' })).descripcion).toBe('Llamar');
    expect((await persistence.update('order', {})).descripcion).toBe('Llamar');
    expect((await persistence.update('order', { descripcion: null })).descripcion).toBeNull();
  });
});
