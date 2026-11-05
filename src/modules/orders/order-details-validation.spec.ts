import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';

describe('Unique products in order details', () => {
  const detail = { producto_id: '11111111-1111-4111-8111-111111111111', cantidad: 2, precio_aplicado: 10 };
  it.each([CreateOrderDto, UpdateOrderDto])('rejects duplicate products in %p', async Dto => {
    const errors = await validate(plainToInstance(Dto, { detalles: [detail, { ...detail }] }));
    expect(errors.find(e => e.property === 'detalles')?.constraints?.arrayUnique).toContain('Suma sus cantidades');
  });
  it.each([CreateOrderDto, UpdateOrderDto])('accepts different products in %p', async Dto => {
    const errors = await validate(plainToInstance(Dto, { detalles: [detail, { ...detail, producto_id: '22222222-2222-4222-8222-222222222222' }] }));
    expect(errors.find(e => e.property === 'detalles')).toBeUndefined();
  });
});
