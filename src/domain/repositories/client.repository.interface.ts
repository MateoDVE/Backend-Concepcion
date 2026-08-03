import { Client } from '../entities/client.entity';
import { PriceClient } from '../entities/price-client.entity';

export interface IClientRepository {
  findById(id: string): Promise<Client | null>;
  findAll(search?: string): Promise<Client[]>;
  create(client: Omit<Client, 'id' | 'created_at' | 'updated_at'> & { precios_especiales?: { producto_id: string; precio_especial: number }[] }): Promise<Client>;
  update(id: string, client: Partial<Omit<Client, 'id' | 'created_at' | 'updated_at'>>): Promise<Client>;
  delete(id: string): Promise<boolean>;
  
  // Precios especiales por cliente
  findSpecialPrices(clientId: string): Promise<PriceClient[]>;
  findSpecialPrice(clientId: string, productId: string): Promise<PriceClient | null>;
  setSpecialPrice(clientId: string, productId: string, precioEspecial: number): Promise<PriceClient>;
  deleteSpecialPrice(clientId: string, productId: string): Promise<boolean>;
}
