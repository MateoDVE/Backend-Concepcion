import { User } from '../entities/user.entity';
import { Vendor } from '../entities/vendor.entity';

export interface IUserRepository {
  findUserById(id: string): Promise<User | null>;
  findUserByUsername(username: string): Promise<User | null>;
  createUser(user: Omit<User, 'id' | 'created_at' | 'updated_at'>): Promise<User>;
  updateUser(id: string, user: Partial<Omit<User, 'id' | 'created_at' | 'updated_at'>>): Promise<User>;
  
  findVendorById(id: string): Promise<Vendor | null>;
  findVendorByUserId(userId: string): Promise<Vendor | null>;
  findAllVendors(): Promise<Vendor[]>;
  createVendor(vendor: Omit<Vendor, 'id' | 'created_at' | 'updated_at'>): Promise<Vendor>;
  updateVendor(id: string, vendor: Partial<Omit<Vendor, 'id' | 'created_at' | 'updated_at'>>): Promise<Vendor>;
}
