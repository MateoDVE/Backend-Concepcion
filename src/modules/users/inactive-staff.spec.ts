import 'reflect-metadata';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { PrismaOrderRepository } from '../../infrastructure/persistence/prisma/prisma-order.repository';

describe('Inactive staff access and assignments', () => {
  it('rejects an inactive profile even with a valid Auth token', async () => {
    const guard = new SupabaseAuthGuard({ validateToken: jest.fn().mockResolvedValue({ id: 'staff' }) } as any,
      { findUserById: jest.fn().mockResolvedValue({ id: 'staff', activo: false }) } as any);
    const req = { headers: { authorization: 'Bearer valid-token' } };
    await expect(guard.canActivate({ switchToHttp: () => ({ getRequest: () => req }) } as any)).rejects.toMatchObject({ status: 401 });
  });
  it.each([{ activo: false }, { activo: true, usuario: { activo: false } }, null])('rejects new assignments to unavailable vendor %j', async vendor => {
    const prisma = { vendedor: { findUnique: jest.fn().mockResolvedValue(vendor) }, pedido: { create: jest.fn() } };
    const repo = new PrismaOrderRepository(prisma as any);
    await expect(repo.create({ vendedor_id: 'vendor', detalles: [] } as any)).rejects.toMatchObject({ status: 400 });
    expect(prisma.pedido.create).not.toHaveBeenCalled();
  });
  it('rejects reassigning a historical order to an inactive vendor', async () => {
    const tx = { vendedor: { findUnique: jest.fn().mockResolvedValue({ activo: false }) }, pedido: { findUniqueOrThrow: jest.fn().mockResolvedValue({ vendedor_id: 'old' }), update: jest.fn() } };
    const repo = new PrismaOrderRepository({ $transaction: (fn: any) => fn(tx) } as any);
    await expect(repo.update('order', { vendedor_id: 'inactive' })).rejects.toMatchObject({ status: 400 });
    expect(tx.pedido.update).not.toHaveBeenCalled();
  });
});
