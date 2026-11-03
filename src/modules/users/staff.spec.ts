import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import request from 'supertest';
import { createClient } from '@supabase/supabase-js';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { StaffService } from './staff.service';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { PrismaUserRepository } from '../../infrastructure/persistence/prisma/prisma-user.repository';

jest.mock('@supabase/supabase-js', () => ({ createClient: jest.fn() }));
const body = { nombre: 'Ana Pérez', usuario: 'ana', email: 'ana@example.com', password: 'StrongPass123!', rol: 'vendedor' as const };

describe('Staff HTTP permissions and validation', () => {
  let app: INestApplication;
  const service = { create: jest.fn().mockResolvedValue({ id: 'new' }), list: jest.fn().mockResolvedValue([]), setStatus: jest.fn().mockResolvedValue({ activo: false }) };
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: {} }, { provide: StaffService, useValue: service }],
    }).overrideGuard(SupabaseAuthGuard).useValue({ canActivate(context: any) {
      const req = context.switchToHttp().getRequest();
      req.user = { rol: req.headers['x-test-role'] };
      return true;
    } }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
    await app.init();
  });
  afterAll(() => app.close());
  beforeEach(() => jest.clearAllMocks());
  const staffId = '11111111-1111-4111-8111-111111111111';
  it.each([true, false])('admin changes active state to %s', async activo => {
    await request(app.getHttpServer()).patch(`/users/staff/${staffId}/status`).set('x-test-role', 'admin').send({ activo }).expect(200);
    expect(service.setStatus).toHaveBeenCalledWith(staffId, activo);
  });
  it.each(['vendedor', 'almacen', ''])('denies state changes by %s', async rol => {
    await request(app.getHttpServer()).patch(`/users/staff/${staffId}/status`).set('x-test-role', rol).send({ activo: false }).expect(403);
    expect(service.setStatus).not.toHaveBeenCalled();
  });
  it.each([{}, { activo: 'false' }, { activo: null }, { activo: false, rol: 'admin' }])('rejects invalid state %j', async invalid => {
    await request(app.getHttpServer()).patch(`/users/staff/${staffId}/status`).set('x-test-role', 'admin').send(invalid).expect(400);
    expect(service.setStatus).not.toHaveBeenCalled();
  });
  it.each(['vendedor', 'almacen'])('allows admin to create %s', async rol => {
    await request(app.getHttpServer()).post('/users/staff').set('x-test-role', 'admin').send({ ...body, rol }).expect(201);
    expect(service.create).toHaveBeenCalledWith({ ...body, rol });
  });
  it.each(['vendedor', 'almacen', ''])('blocks role %s from creating and listing', async rol => {
    await request(app.getHttpServer()).post('/users/staff').set('x-test-role', rol).send(body).expect(403);
    await request(app.getHttpServer()).get('/users/staff').set('x-test-role', rol).expect(403);
    expect(service.create).not.toHaveBeenCalled();
    expect(service.list).not.toHaveBeenCalled();
  });
  it.each([{ rol: 'admin' }, { nombre: '   ' }, { usuario: 'bad user' }, { email: 'bad' }, { password: 'short' }, { telefono: '1'.repeat(21) }, { activo: false }])('rejects invalid fields %j', async invalid => {
    await request(app.getHttpServer()).post('/users/staff').set('x-test-role', 'admin').send({ ...body, ...invalid }).expect(400);
    expect(service.create).not.toHaveBeenCalled();
  });
});

describe('Staff creation and compensation', () => {
  let service: StaffService;
  const repo = { findUserByUsername: jest.fn(), createStaff: jest.fn() };
  const admin = { createUser: jest.fn(), deleteUser: jest.fn() };
  beforeEach(() => {
    jest.clearAllMocks();
    repo.findUserByUsername.mockResolvedValue(null);
    repo.createStaff.mockResolvedValue({ id: 'new', nombre: body.nombre, rol: body.rol });
    admin.createUser.mockResolvedValue({ data: { user: { id: 'new' } }, error: null });
    admin.deleteUser.mockResolvedValue({ error: null });
    (createClient as jest.Mock).mockReturnValue({ auth: { admin } });
    service = new StaffService(repo as any, { get: () => 'configured' } as unknown as ConfigService);
  });
  it('links the Auth UUID and does not pass the password to the repository', async () => {
    await service.create(body);
    expect(repo.createStaff).toHaveBeenCalledWith({ id: 'new', nombre: body.nombre, usuario: body.usuario, rol: body.rol, telefono: undefined });
    expect(admin.deleteUser).not.toHaveBeenCalled();
  });
  it('rejects duplicate username before creating credentials', async () => {
    repo.findUserByUsername.mockResolvedValue({ id: 'existing' });
    await expect(service.create(body)).rejects.toMatchObject({ status: 409 });
    expect(admin.createUser).not.toHaveBeenCalled();
  });
  it('rejects duplicate email without modifying an existing account', async () => {
    admin.createUser.mockResolvedValue({ data: {}, error: { code: 'email_exists' } });
    await expect(service.create(body)).rejects.toMatchObject({ status: 409 });
    expect(repo.createStaff).not.toHaveBeenCalled();
    expect(admin.deleteUser).not.toHaveBeenCalled();
  });
  it('compensates a database failure', async () => {
    repo.createStaff.mockRejectedValue(new Error('database unavailable'));
    await expect(service.create(body)).rejects.toMatchObject({ status: 503 });
    expect(admin.deleteUser).toHaveBeenCalledWith('new');
  });
  it('handles a username race and compensates', async () => {
    repo.createStaff.mockRejectedValue({ code: 'P2002' });
    await expect(service.create(body)).rejects.toMatchObject({ status: 409 });
    expect(admin.deleteUser).toHaveBeenCalledWith('new');
  });
  it('reports incomplete compensation instead of suggesting retry', async () => {
    repo.createStaff.mockRejectedValue(new Error());
    admin.deleteUser.mockResolvedValue({ error: new Error() });
    await expect(service.create(body)).rejects.toThrow('antes de reintentar');
  });
});

describe('Staff persistence', () => {
  it.each([false, true])('atomically changes profile and vendor to %s without deleting', async activo => {
    const tx = { usuario: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) }, vendedor: { updateMany: jest.fn() } };
    const repository = new PrismaUserRepository({ $transaction: (fn: any) => fn(tx) } as any);
    await repository.setStaffStatus('staff', activo);
    expect(tx.usuario.updateMany).toHaveBeenCalledWith({ where: { id: 'staff', rol: { in: ['vendedor', 'almacen'] } }, data: { activo, updated_at: expect.any(Date) } });
    expect(tx.vendedor.updateMany).toHaveBeenCalledWith({ where: { usuario_id: 'staff' }, data: { activo, updated_at: expect.any(Date) } });
  });
  it('cannot disable an admin or a missing account', async () => {
    const tx = { usuario: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) }, vendedor: { updateMany: jest.fn() } };
    const repository = new PrismaUserRepository({ $transaction: (fn: any) => fn(tx) } as any);
    await expect(repository.setStaffStatus('admin', false)).rejects.toMatchObject({ status: 404 });
    expect(tx.vendedor.updateMany).not.toHaveBeenCalled();
  });
  it('lists existing vendors by their operational names instead of stale seed profile names', async () => {
    const findMany = jest.fn().mockResolvedValue([
      { id: 'v1', usuario: 'vendedor1', nombre: 'Carlos Mendez', rol: 'vendedor', activo: true, vendedor: { nombre: 'Nelson' } },
      { id: 'v2', usuario: 'vendedor2', nombre: 'Juan Perez', rol: 'vendedor', activo: true, vendedor: { nombre: 'Bernardo' } },
      { id: 'a1', usuario: 'almacen', nombre: 'Encargado Almacén', rol: 'almacen', activo: true, vendedor: null },
      { id: 'v3', usuario: 'nuevo', nombre: 'Sin ficha', rol: 'vendedor', activo: true, vendedor: null },
    ]);
    const repository = new PrismaUserRepository({ usuario: { findMany } } as any);
    const users = await repository.findAllStaff();
    expect(users.map(user => user.nombre)).toEqual(['Bernardo', 'Encargado Almacén', 'Nelson', 'Sin ficha']);
    expect(users.find(user => user.nombre === 'Nelson')).toMatchObject({ id: 'v1', usuario: 'vendedor1' });
    expect(users[0]).not.toHaveProperty('vendedor');
    expect(users[0]).not.toHaveProperty('contrasena_hash');
  });

  it.each(['vendedor', 'almacen'] as const)('creates %s with safe response and atomic vendor linkage', async rol => {
    const create = jest.fn().mockResolvedValue({ id: 'new', usuario: 'ana', nombre: body.nombre, rol, activo: true });
    const repository = new PrismaUserRepository({ usuario: { create } } as any);
    const result = await repository.createStaff({ id: 'new', usuario: 'ana', nombre: body.nombre, rol });
    const input = create.mock.calls[0][0];
    expect(input.data.id).toBe('new');
    expect(input.select.contrasena_hash).toBeUndefined();
    expect(result).not.toHaveProperty('contrasena_hash');
    if (rol === 'vendedor') expect(input.data.vendedor.create).toMatchObject({ nombre: body.nombre, avatar: 'AP', activo: true });
    else expect(input.data.vendedor).toBeUndefined();
  });
});
