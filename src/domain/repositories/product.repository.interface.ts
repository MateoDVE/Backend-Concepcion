import { Product } from '../entities/product.entity';

export interface IProductRepository {
  findById(id: string): Promise<Product | null>;
  findAll(): Promise<Product[]>;
  create(product: Omit<Product, 'id' | 'created_at' | 'updated_at'>): Promise<Product>;
  update(id: string, product: Partial<Omit<Product, 'id' | 'created_at' | 'updated_at'>>): Promise<Product>;
  delete(id: string): Promise<boolean>;
  updateStock(id: string, amount: number): Promise<Product>;
}
