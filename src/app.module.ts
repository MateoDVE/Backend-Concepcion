import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PersistenceModule } from './infrastructure/persistence/persistence.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ClientsModule } from './modules/clients/clients.module';
import { ProductsModule } from './modules/products/products.module';
import { OrdersModule } from './modules/orders/orders.module';
import { ClosingsModule } from './modules/closings/closings.module';

@Module({
  imports: [
    // Variables de entorno globales
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    
    // Capa de persistencia (Base de Datos / Prisma)
    PersistenceModule,
    
    // Módulo global de Autenticación Supabase
    AuthModule,
    
    // Módulos verticales de negocio (CRUDs)
    UsersModule,
    ClientsModule,
    ProductsModule,
    OrdersModule,
    ClosingsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
