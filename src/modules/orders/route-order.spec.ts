import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';

const a = '11111111-1111-4111-8111-111111111111';
const b = '22222222-2222-4222-8222-222222222222';
const body = { vendedor_id: a, fecha: '2026-10-28', order_ids: [b, a], previous_order_ids: [a, b] };

describe('Route order HTTP authorization and validation', () => {
  let app: INestApplication;
  const service = { reorderRoute: jest.fn().mockResolvedValue({ success: true }), update: jest.fn() };
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [{ provide: OrdersService, useValue: service }],
    }).overrideGuard(SupabaseAuthGuard).useValue({
      canActivate(context: any) {
        const req = context.switchToHttp().getRequest();
        req.user = { rol: req.headers['x-test-role'] };
        return true;
      },
    }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
    await app.init();
  });
  afterAll(() => app.close());
  beforeEach(() => jest.clearAllMocks());

  it('allows only administrators to persist the route', async () => {
    await request(app.getHttpServer()).patch('/orders/route-order').set('x-test-role', 'admin').send(body).expect(200);
    expect(service.reorderRoute).toHaveBeenCalledWith(body);
  });
  it.each(['vendedor', 'almacen'])('denies %s even when calling the API directly', async role => {
    await request(app.getHttpServer()).patch('/orders/route-order').set('x-test-role', role).send(body).expect(403);
    expect(service.reorderRoute).not.toHaveBeenCalled();
  });
  it.each([
    { order_ids: [a, a] }, { order_ids: [] }, { order_ids: ['invalid'] },
    { fecha: '2026-02-30' }, { fecha: '2026-10-28T12:00:00Z' }, { vendedor_id: 'invalid' },
  ])('rejects invalid route input %j', async invalid => {
    await request(app.getHttpServer()).patch('/orders/route-order').set('x-test-role', 'admin').send({ ...body, ...invalid }).expect(400);
    expect(service.reorderRoute).not.toHaveBeenCalled();
  });
  it('prevents editing route position through the general update endpoint', async () => {
    await request(app.getHttpServer()).put(`/orders/${a}`).set('x-test-role', 'vendedor').send({ orden_ruta: 1 }).expect(400);
    expect(service.update).not.toHaveBeenCalled();
  });
});
