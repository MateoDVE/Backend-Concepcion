import { OrdersService } from './orders.service';
import { BadRequestException } from '@nestjs/common';

describe('Scheduled delivery days', () => {
  const order = { id: 'order', estado: 'pending', cliente_id: 'client', fecha_creacion: new Date('2026-11-03T01:00:00Z'), fecha_programada: null };
  let repo: any, service: OrdersService;
  beforeEach(() => {
    repo = { create: jest.fn().mockResolvedValue(order), update: jest.fn().mockResolvedValue(order),
      findById: jest.fn().mockResolvedValue(order), findAll: jest.fn().mockResolvedValue([]), moveToNextDay: jest.fn() };
    service = new OrdersService(repo, { findById: jest.fn().mockResolvedValue({ id: 'client' }) } as any,
      { findById: jest.fn().mockResolvedValue({ precio_base: 10 }) } as any);
  });

  it('stores the scheduled day without rewriting creation or actual delivery', async () => {
    await service.create({ cliente_id: 'client', fecha_programada: '2026-11-09', detalles: [{ producto_id: 'water', cantidad: 2, precio_aplicado: 10 }] });
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ fecha_programada: new Date('2026-11-09'), fecha_entrega: null }));
    expect(repo.create.mock.calls[0][0].fecha_creacion).toBeUndefined();
  });

  it('rejects impossible dates before writing', async () => {
    await expect(service.update('order', { fecha_programada: '2026-02-30' })).rejects.toThrow(BadRequestException);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('does not change the schedule when updating an unrelated field', async () => {
    await service.update('order', { descripcion: 'Nota' });
    expect(repo.update.mock.calls[0][1].fecha_programada).toBeUndefined();
  });

  it('prevents rescheduling delivered orders', async () => {
    repo.findById.mockResolvedValue({ ...order, estado: 'delivered' });
    await expect(service.update('order', { fecha_programada: '2026-11-09' })).rejects.toThrow(BadRequestException);
  });

  it('selects the operational schedule when moving unfinished orders', async () => {
    await service.moveUnfulfilledOrdersToNextDay('2026-11-09');
    expect(repo.findAll).toHaveBeenCalledWith({ fecha_programada: '2026-11-09' });
  });
});
