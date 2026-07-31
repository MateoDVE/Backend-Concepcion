import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from './orders.service';
import {
  ORDER_REPOSITORY_TOKEN,
  CLIENT_REPOSITORY_TOKEN,
  PRODUCT_REPOSITORY_TOKEN,
} from '../../domain/repositories/tokens';
import { IOrderRepository } from '../../domain/repositories/order.repository.interface';
import { IClientRepository } from '../../domain/repositories/client.repository.interface';
import { IProductRepository } from '../../domain/repositories/product.repository.interface';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('OrdersService', () => {
  let service: OrdersService;
  let orderRepo: jest.Mocked<IOrderRepository>;
  let clientRepo: jest.Mocked<IClientRepository>;
  let productRepo: jest.Mocked<IProductRepository>;

  beforeEach(async () => {
    const mockOrderRepo = {
      findAll: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      updateStatus: jest.fn(),
      update: jest.fn(),
      findLatestDeliveredPrice: jest.fn(),
      findClientOrderHistory: jest.fn(),
      delete: jest.fn(),
    };

    const mockClientRepo = {
      findById: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findSpecialPrices: jest.fn(),
      findSpecialPrice: jest.fn(),
      setSpecialPrice: jest.fn(),
      deleteSpecialPrice: jest.fn(),
    };

    const mockProductRepo = {
      findById: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      updateStock: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: ORDER_REPOSITORY_TOKEN, useValue: mockOrderRepo },
        { provide: CLIENT_REPOSITORY_TOKEN, useValue: mockClientRepo },
        { provide: PRODUCT_REPOSITORY_TOKEN, useValue: mockProductRepo },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    orderRepo = module.get(ORDER_REPOSITORY_TOKEN);
    clientRepo = module.get(CLIENT_REPOSITORY_TOKEN);
    productRepo = module.get(PRODUCT_REPOSITORY_TOKEN);
  });

  describe('getSuggestedPrice', () => {
    const clientId = 'client-uuid';
    const productId = 'product-uuid';

    it('should throw NotFoundException if client does not exist', async () => {
      clientRepo.findById.mockResolvedValue(null);
      await expect(service.getSuggestedPrice(clientId, productId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if product does not exist', async () => {
      clientRepo.findById.mockResolvedValue({ id: clientId } as any);
      productRepo.findById.mockResolvedValue(null);
      await expect(service.getSuggestedPrice(clientId, productId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return special price if configured', async () => {
      clientRepo.findById.mockResolvedValue({ id: clientId } as any);
      productRepo.findById.mockResolvedValue({ id: productId, precio_base: 10 } as any);
      clientRepo.findSpecialPrice.mockResolvedValue({ precio_especial: 8.5 } as any);

      const price = await service.getSuggestedPrice(clientId, productId);
      expect(price).toBe(8.5);
    });

    it('should return last delivered price if no special price but history exists', async () => {
      clientRepo.findById.mockResolvedValue({ id: clientId } as any);
      productRepo.findById.mockResolvedValue({ id: productId, precio_base: 10 } as any);
      clientRepo.findSpecialPrice.mockResolvedValue(null);
      orderRepo.findLatestDeliveredPrice.mockResolvedValue(9.0);

      const price = await service.getSuggestedPrice(clientId, productId);
      expect(price).toBe(9.0);
    });

    it('should return product base price if no special price and no history', async () => {
      clientRepo.findById.mockResolvedValue({ id: clientId } as any);
      productRepo.findById.mockResolvedValue({ id: productId, precio_base: 10.0 } as any);
      clientRepo.findSpecialPrice.mockResolvedValue(null);
      orderRepo.findLatestDeliveredPrice.mockResolvedValue(null);

      const price = await service.getSuggestedPrice(clientId, productId);
      expect(price).toBe(10.0);
    });
  });

  describe('create', () => {
    it('should calculate total and call repository create', async () => {
      const clientId = 'client-uuid';
      const productId = 'product-uuid';
      
      clientRepo.findById.mockResolvedValue({ id: clientId } as any);
      productRepo.findById.mockResolvedValue({ id: productId, precio_base: 10 } as any);
      clientRepo.findSpecialPrice.mockResolvedValue(null);
      orderRepo.findLatestDeliveredPrice.mockResolvedValue(null);
      
      const dto = {
        cliente_id: clientId,
        detalles: [{ producto_id: productId, cantidad: 5 }],
      };
      
      orderRepo.create.mockResolvedValue({ id: 'order-uuid', total: 50 } as any);

      const order = await service.create(dto);
      expect(orderRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          cliente_id: clientId,
          total: 50,
          detalles: [{ producto_id: productId, cantidad: 5, precio_aplicado: 10 }],
        }),
      );
      expect(order.total).toBe(50);
    });
  });

  describe('update', () => {
    it('should validate inputs, recalculate total and call repository update', async () => {
      const orderId = 'order-uuid';
      const clientId = 'client-uuid';
      const productId = 'product-uuid';

      orderRepo.findById.mockResolvedValue({ id: orderId, cliente_id: clientId } as any);
      clientRepo.findById.mockResolvedValue({ id: clientId } as any);
      productRepo.findById.mockResolvedValue({ id: productId, precio_base: 10 } as any);
      clientRepo.findSpecialPrice.mockResolvedValue(null);
      orderRepo.findLatestDeliveredPrice.mockResolvedValue(null);

      const dto = {
        cliente_id: clientId,
        vendedor_id: 'vendor-uuid',
        detalles: [{ producto_id: productId, cantidad: 3, precio_aplicado: 12 }],
      };

      orderRepo.update.mockResolvedValue({ id: orderId, total: 36 } as any);

      const result = await service.update(orderId, dto);
      expect(orderRepo.update).toHaveBeenCalledWith(
        orderId,
        expect.objectContaining({
          cliente_id: clientId,
          vendedor_id: 'vendor-uuid',
          total: 36,
          detalles: [{ producto_id: productId, cantidad: 3, precio_aplicado: 12 }],
        })
      );
      expect(result.total).toBe(36);
    });
  });

  describe('delete', () => {
    it('should throw NotFoundException if order does not exist', async () => {
      orderRepo.findById.mockResolvedValue(null);

      await expect(service.delete('order-uuid')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should restore stock if order was delivered, then call repository delete', async () => {
      const orderId = 'order-uuid';
      const orderData = {
        id: orderId,
        estado: 'delivered',
        detalles: [
          { producto_id: 'prod-1', cantidad: 3 },
          { producto_id: 'prod-2', cantidad: 5 },
        ],
      };

      orderRepo.findById.mockResolvedValue(orderData as any);
      orderRepo.delete.mockResolvedValue(true);
      productRepo.updateStock.mockResolvedValue({} as any);

      const result = await service.delete(orderId);

      expect(productRepo.updateStock).toHaveBeenCalledTimes(2);
      expect(productRepo.updateStock).toHaveBeenNthCalledWith(1, 'prod-1', 3);
      expect(productRepo.updateStock).toHaveBeenNthCalledWith(2, 'prod-2', 5);
      expect(orderRepo.delete).toHaveBeenCalledWith(orderId);
      expect(result).toEqual({ success: true });
    });

    it('should not restore stock if order was not delivered, then call repository delete', async () => {
      const orderId = 'order-uuid';
      const orderData = {
        id: orderId,
        estado: 'pending',
        detalles: [
          { producto_id: 'prod-1', cantidad: 3 },
        ],
      };

      orderRepo.findById.mockResolvedValue(orderData as any);
      orderRepo.delete.mockResolvedValue(true);

      const result = await service.delete(orderId);

      expect(productRepo.updateStock).not.toHaveBeenCalled();
      expect(orderRepo.delete).toHaveBeenCalledWith(orderId);
      expect(result).toEqual({ success: true });
    });

    it('should throw BadRequestException if repository delete returns false', async () => {
      const orderId = 'order-uuid';
      const orderData = {
        id: orderId,
        estado: 'pending',
        detalles: [],
      };

      orderRepo.findById.mockResolvedValue(orderData as any);
      orderRepo.delete.mockResolvedValue(false);

      await expect(service.delete(orderId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
